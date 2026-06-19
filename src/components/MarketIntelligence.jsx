import React, { useState } from "react";
import { CalendarDays, Newspaper, RefreshCw, UsersRound } from "lucide-react";

export default function MarketIntelligence({ data, busy, error, country, onCountry, onRefresh, onOpenNews, onOpenInsiders }) {
  const [scope, setScope] = useState("portfolio");
  if (busy && !data) return <div className="empty">Loading market intelligence...</div>;
  if (!data) return <div className="empty">{error || "Market intelligence is unavailable."}<div className="button-row empty-actions"><button type="button" onClick={onRefresh}>Retry</button></div></div>;

  const warnings = Object.entries(data.sources || {}).filter(([, status]) => !status.available);
  return (
    <div className="market-intelligence">
      <div className="market-toolbar">
        <label className="sort-control market-country"><span>News country</span><select value={country} onChange={(event) => onCountry(event.target.value)}>{(data.countries || []).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        <div className="status-tabs compact-tabs">
          <button className={scope === "portfolio" ? "active" : ""} type="button" onClick={() => setScope("portfolio")}>My stocks</button>
          <button className={scope === "market" ? "active" : ""} type="button" onClick={() => setScope("market")}>Overall market</button>
        </div>
        <div className="market-refresh">
          <span>Updated {formatTime(data.refreshedAt)} · refreshes hourly</span>
          <button className="ghost" type="button" disabled={busy} onClick={onRefresh}><RefreshCw size={15} className={busy ? "spin" : ""} /> Refresh</button>
        </div>
      </div>

      {error ? <div className="source-warning">{error}</div> : null}
      {warnings.length ? <div className="source-warning">Some feeds are temporarily unavailable: {warnings.map(([name]) => sourceLabel(name)).join(", ")}.</div> : null}
      {scope === "portfolio" && !(data.trackedSymbols || []).length ? <div className="empty compact-empty">Add NSE investments to receive stock-specific updates.</div> : null}

      <section className="market-flow-grid">
        {(data.institutionalFlows || []).map((row) => <FlowCard key={`${row.category}-${row.date}`} row={row} />)}
        {!(data.institutionalFlows || []).length ? <div className="empty compact-empty">Institutional flow data unavailable.</div> : null}
      </section>

      <div className="market-grid">
        <MarketPanel icon={Newspaper} title={scope === "portfolio" ? "News for my stocks" : "Market news"} count={data.news?.[scope]?.length} onOpen={onOpenNews}>
          <NewsList rows={data.news?.[scope] || []} />
        </MarketPanel>
        <MarketPanel icon={CalendarDays} title="Upcoming events" count={data.events?.[scope]?.length}>
          <EventList rows={data.events?.[scope] || []} empty="No upcoming events found." />
        </MarketPanel>
        <MarketPanel icon={CalendarDays} title="Earnings" count={data.earnings?.[scope]?.length}>
          <EventList rows={data.earnings?.[scope] || []} empty="No earnings events found." />
        </MarketPanel>
        <MarketPanel icon={CalendarDays} title="Dividends" count={data.dividends?.[scope]?.length}>
          <ActionList rows={data.dividends?.[scope] || []} />
        </MarketPanel>
        <MarketPanel icon={UsersRound} title="Insider buying / selling" count={data.insiderTrades?.[scope]?.length} onOpen={onOpenInsiders}>
          <InsiderList rows={data.insiderTrades?.[scope] || []} />
        </MarketPanel>
        {scope === "portfolio" ? (
          <MarketPanel icon={UsersRound} title="Promoter holdings" count={data.promoterHoldings?.length}>
            <PromoterList rows={data.promoterHoldings || []} />
          </MarketPanel>
        ) : null}
      </div>
      <p className="market-disclaimer">Exchange disclosures and third-party news may be delayed. This information is for tracking, not investment advice.</p>
    </div>
  );
}

function MarketPanel({ icon: Icon, title, count = 0, children, onOpen }) {
  return <section className="market-panel"><header><Icon size={17} /><h3>{title}</h3><span>{count || 0}</span>{onOpen ? <button className="text-button" type="button" onClick={onOpen}>View all</button> : null}</header><div className="market-list">{children}</div></section>;
}

function FlowCard({ row }) {
  const tone = row.netValue >= 0 ? "gain" : "loss";
  return <article className="flow-card"><span>{row.category}</span><strong className={tone}>{moneyCrore(row.netValue)}</strong><small>Buy {moneyCrore(row.buyValue)} · Sell {moneyCrore(row.sellValue)}</small><em>{row.date}</em></article>;
}

function NewsList({ rows }) {
  if (!rows.length) return <Empty text="No relevant news found." />;
  return rows.slice(0, 12).map((row) => <a className="news-row" key={row.id} href={row.url} target="_blank" rel="noreferrer"><div><strong>{row.title}</strong><span>{row.trackedSymbol ? `${row.trackedSymbol} · ` : ""}{row.publisher}</span></div><time>{formatDateTime(row.publishedAt)}</time></a>);
}

function EventList({ rows, empty }) {
  if (!rows.length) return <Empty text={empty} />;
  return rows.slice(0, 12).map((row) => <article className="market-row" key={row.id}><div><strong>{row.symbol || row.company}</strong><span>{row.purpose}</span></div><time>{row.date}</time></article>);
}

function ActionList({ rows }) {
  if (!rows.length) return <Empty text="No dividend actions found." />;
  return rows.slice(0, 12).map((row) => <article className="market-row" key={row.id}><div><strong>{row.symbol || row.company}</strong><span>{row.subject}</span></div><time>{row.exDate || row.recordDate}</time></article>);
}

function InsiderList({ rows }) {
  if (!rows.length) return <Empty text="No recent insider disclosures found." />;
  return rows.slice(0, 12).map((row) => <article className="market-row" key={row.id}><div><strong>{row.symbol} · {row.person || "Insider"}</strong><span>{row.transactionType || row.category} · Qty {formatNumber(row.quantity)}{row.marketCapImpactPercent == null ? "" : ` · ${formatImpact(row.marketCapImpactPercent)} impact`}</span></div><time>{row.date}</time></article>);
}

function PromoterList({ rows }) {
  if (!rows.length) return <Empty text="No promoter disclosures found for current holdings." />;
  return rows.slice(0, 12).map((row) => <article className="market-row" key={row.symbol}><div><strong>{row.symbol} · {formatNumber(row.promoterPercent)}%</strong><span>Promoter holding{row.changePercent == null ? "" : ` · Change ${signed(row.changePercent)}%`}</span></div><time>{row.period}</time></article>);
}

function Empty({ text }) {
  return <div className="empty compact-empty">{text}</div>;
}

function sourceLabel(value) {
  return String(value).replace(/([A-Z])/g, " $1").toLowerCase();
}

function formatTime(value) {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function moneyCrore(value) {
  return `₹${formatNumber(value)} Cr`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function signed(value) {
  return `${Number(value) >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatImpact(value) {
  const percent = Number(value || 0);
  return `${percent > 0 && percent < 0.01 ? "<0.01" : formatNumber(percent)}%`;
}
