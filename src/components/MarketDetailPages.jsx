import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, RefreshCw, Search } from "lucide-react";
import { getInsiderTradesFeature } from "../services/financeStore";

export function InsiderTradesPage({ onBack }) {
  const [scope, setScope] = useState("market");
  const [search, setSearch] = useState("");
  const [exactDate, setExactDate] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [result, setResult] = useState({ rows: [], total: 0, availableYears: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => load(), 300);
    return () => window.clearTimeout(timer);
  }, [scope, search, exactDate, year, page, pageSize]);
  async function load() {
    setBusy(true);
    try {
      const next = await getInsiderTradesFeature({ year, scope, search, date: exactDate, page, pageSize });
      setResult(next);
      if (next.page && next.page !== page) setPage(next.page);
      setError("");
    }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  const years = result.availableYears?.length ? result.availableYears : Array.from({ length: new Date().getFullYear() - 2017 }, (_, index) => new Date().getFullYear() - index);
  const pageCount = Math.max(1, Math.ceil(Number(result.total || 0) / Number(result.pageSize || 50)));
  const visiblePages = paginationPages(page, pageCount);
  return (
    <DetailShell title="Insider Trades" detail="Official NSE and BSE disclosures with promoter equity impact" busy={busy} error={error} onRefresh={load} onBack={onBack}>
      <div className="insider-filter-grid"><label className="detail-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search company, insider, promoter, or transaction" /></label><label className="form-field"><span>Exact activity date</span><input type="date" value={exactDate} onChange={(event) => { const value = event.target.value; setExactDate(value); setYear(value ? Number(value.slice(0, 4)) : year); setPage(1); }} /></label><div className="status-tabs compact-tabs"><button className={scope === "market" ? "active" : ""} onClick={() => { setScope("market"); setPage(1); }}>Overall market</button><button className={scope === "portfolio" ? "active" : ""} onClick={() => { setScope("portfolio"); setPage(1); }}>My stocks</button></div></div>
      <div className="year-tabs">{years.map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => { setYear(item); setExactDate(""); setPage(1); }}>{item}</button>)}</div>
      <div className="insider-table">
        <div className="insider-header"><span>Company</span><span>Name</span><span>Date</span><span>Type / quantity</span><span>Value / impact</span></div>
        {(result.rows || []).map((row) => (
          <article key={row.id}>
            <span>
              <strong><a className="screener-company-link" href={screenerUrl(row.symbol, row.company)} target="_blank" rel="noreferrer" title={`Open ${row.company || row.symbol} on Screener`}>{row.symbol || row.company}<ExternalLink size={12} /></a></strong>
              <small>{row.company}</small>
            </span>
            <span><strong>{row.person || "Insider"}</strong><small>{row.category}{row.source ? ` · ${row.source}` : ""}</small></span>
            <time>{row.date}</time>
            <span><strong>{row.transactionType || "Disclosure"}</strong><small>{number(row.quantity)} shares · {row.acquisitionMode}</small>{row.disclosureUrl ? <small><a href={row.disclosureUrl} target="_blank" rel="noreferrer">Exchange filing <ExternalLink size={10} /></a></small> : null}</span>
            <span className="insider-value"><b className={/buy|acquisition/i.test(row.transactionType) ? "gain" : "loss"}>{compactMoney(row.value)}</b><small title="Transaction shares divided by disclosed outstanding shares">{row.marketCapImpactPercent == null ? "Impact unavailable" : `${impactPercent(row.marketCapImpactPercent)} market-cap impact`}</small>{row.holdingBeforePercent != null && row.holdingAfterPercent != null ? <small>Holding {impactPercent(row.holdingBeforePercent)} → {impactPercent(row.holdingAfterPercent)}</small> : null}</span>
          </article>
        ))}
        {!busy && !(result.rows || []).length ? <div className="empty">No matching insider disclosures were found for {year}.</div> : null}
      </div>
      <div className="detail-pager">
        <div className="detail-pager-summary"><strong>{number(result.total)}</strong> disclosures <span>Page {page} of {pageCount}</span></div>
        <div className="detail-pager-pages">
          <button className="ghost" disabled={page <= 1 || busy} onClick={() => setPage(1)}>First</button>
          <button className="ghost" disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>Previous</button>
          {visiblePages.map((item) => <button key={item} className={item === page ? "active" : "ghost"} disabled={busy} onClick={() => setPage(item)}>{item}</button>)}
          <button className="ghost" disabled={page >= pageCount || busy} onClick={() => setPage(page + 1)}>Next</button>
          <button className="ghost" disabled={page >= pageCount || busy} onClick={() => setPage(pageCount)}>Last</button>
        </div>
        <label className="detail-page-size">Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
      </div>
    </DetailShell>
  );
}

function DetailShell({ title, detail, busy, error, onRefresh, onBack, children }) {
  return <main className="app-shell redesigned detail-page-shell"><header className="detail-page-head"><button className="ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button><div><h1>{title}</h1><p>{detail}</p></div><button className="ghost" disabled={busy} onClick={onRefresh}><RefreshCw size={15} className={busy ? "spin" : ""} /> Refresh</button></header>{error ? <div className="source-warning">{error}</div> : null}{busy ? <div className="market-loading-line" /> : null}{children}</main>;
}

function paginationPages(page, pageCount) { const start = Math.max(1, Math.min(page - 2, pageCount - 4)); return Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index); }
function number(value) { return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function compactMoney(value) { const amount = Number(value || 0); const absolute = Math.abs(amount); if (absolute >= 10_000_000) return `₹${trim(amount / 10_000_000)} Cr`; if (absolute >= 100_000) return `₹${trim(amount / 100_000)} Lakh`; if (absolute >= 1_000) return `₹${trim(amount / 1_000)}K`; return `₹${number(amount)}`; }
function trim(value) { return Number(value.toFixed(2)).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function impactPercent(value) { const percent = Number(value || 0); return `${percent < 0.01 && percent > 0 ? "<0.01" : percent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`; }
function screenerUrl(symbol, company) { const ticker = String(symbol || "").trim().replace(/^BSE:/i, ""); return ticker ? `https://www.screener.in/company/${encodeURIComponent(ticker)}/` : `https://www.screener.in/company/?q=${encodeURIComponent(company || "")}`; }
