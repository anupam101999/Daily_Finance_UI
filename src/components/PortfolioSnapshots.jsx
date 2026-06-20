import React, { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Layers3, TrendingDown, TrendingUp, X } from "lucide-react";

const filters = [
  ["all", "All"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["fiscal_year", "FY"],
];

export default function PortfolioSnapshots({ data, type, busy, onType, onPage, onEdit }) {
  const snapshots = data?.snapshots || [];
  const [editing, setEditing] = useState(null);
  return (
    <section className="snapshot-workspace">
      <div className="snapshot-latest-grid">
        {(data?.latest || []).map((snapshot) => <LatestSnapshot key={snapshot.snapshotType} snapshot={snapshot} />)}
      </div>

      <div className="snapshot-toolbar">
        <div className="snapshot-tabs" role="tablist" aria-label="Snapshot cadence">
          {filters.map(([value, label]) => (
            <button key={value} className={type === value ? "active" : ""} type="button" onClick={() => onType(value)}>{label}</button>
          ))}
        </div>
        <span>{data?.total || 0} saved snapshot{data?.total === 1 ? "" : "s"}</span>
      </div>

      {busy ? <div className="empty snapshot-empty">Loading portfolio snapshots...</div> : snapshots.length ? (
        <div className="snapshot-grid">
          {snapshots.map((snapshot) => <SnapshotCard key={snapshot.id} snapshot={snapshot} onEdit={() => setEditing(snapshot)} />)}
        </div>
      ) : <div className="empty snapshot-empty">No {type === "all" ? "" : `${labelFor(type).toLowerCase()} `}snapshots yet. The 6:00 AM batch will create the first one.</div>}

      <SnapshotPager page={data?.page || 1} pageCount={data?.pageCount || 1} onPage={onPage} />
      {editing ? <SnapshotEditor snapshot={editing} onClose={() => setEditing(null)} onSave={async (value) => { await onEdit(value); setEditing(null); }} /> : null}
    </section>
  );
}

function LatestSnapshot({ snapshot }) {
  const gain = snapshot.totalProfit >= 0;
  return (
    <article className="snapshot-latest-card">
      <span>{labelFor(snapshot.snapshotType)}</span>
      <strong className={gain ? "gain" : "loss"}>{percent(snapshot.profitPercent)}</strong>
      <small>{date(snapshot.snapshotDate)} · {money(snapshot.currentValue)}</small>
    </article>
  );
}

function SnapshotCard({ snapshot, onEdit }) {
  const gain = snapshot.totalProfit >= 0;
  const Icon = gain ? TrendingUp : TrendingDown;
  return (
    <article className={`snapshot-card ${gain ? "positive" : "negative"}`}>
      <header>
        <div><span>{labelFor(snapshot.snapshotType)}</span><strong>{date(snapshot.snapshotDate)}</strong></div>
        <div className="snapshot-card-actions"><button className="ghost" onClick={onEdit} aria-label="Edit snapshot"><Edit3 size={15} /></button><i><Icon size={18} /></i></div>
      </header>
      <div className="snapshot-value">
        <small>Portfolio value</small>
        <b>{money(snapshot.currentValue)}</b>
        <em className={gain ? "gain" : "loss"}>{signedMoney(snapshot.totalProfit)} · {percent(snapshot.profitPercent)}</em>
      </div>
      <div className="snapshot-metrics">
        <span><small>Invested</small><b>{money(snapshot.investedValue)}</b></span>
        <span><small>Realized</small><b>{money(snapshot.realizedProfit)}</b></span>
        <span><small>Unrealized</small><b>{money(snapshot.unrealizedProfit)}</b></span>
        <span><small>Charges</small><b>{money(snapshot.totalCharges)}</b></span>
        <span><small>Period return</small><b>{optionalPercent(snapshot.periodReturnPercent)}</b></span>
        <span><small>Nifty return</small><b>{optionalPercent(snapshot.niftyReturnPercent)}</b></span>
        <span><small>Nifty level</small><b>{snapshot.niftyEndValue == null ? "N/A" : number(snapshot.niftyEndValue)}</b></span>
        <span><small>Alpha</small><b className={Number(snapshot.alphaPercent) >= 0 ? "gain" : "loss"}>{optionalPercent(snapshot.alphaPercent)}</b></span>
      </div>
      <div className="snapshot-meta">
        <span><Layers3 size={14} /> {snapshot.holdingCount} holdings</span>
        <span><CalendarDays size={14} /> {date(snapshot.periodStart)} - {date(snapshot.periodEnd)}</span>
        <span><Clock3 size={14} /> {time(snapshot.capturedAt)}</span>
      </div>
      <details className="snapshot-details">
        <summary>View portfolio detail</summary>
        <div className="snapshot-detail-body">
          <div className="snapshot-holdings">
            {(snapshot.holdings || []).length ? snapshot.holdings.map((holding) => (
              <div key={`${snapshot.id}-${holding.id || holding.symbol}`}>
                <span><b>{holding.symbol}</b><small>{holding.stockName}</small></span>
                <span><b>{number(holding.quantity)}</b><small>Units</small></span>
                <span><b>{money(holding.currentValue)}</b><small>Value</small></span>
                <span><b className={Number(holding.profitLoss) >= 0 ? "gain" : "loss"}>{signedMoney(holding.profitLoss)}</b><small>P/L</small></span>
              </div>
            )) : <p>No open holdings in this snapshot.</p>}
          </div>
          <div className="snapshot-breakdown">
            <span><small>Largest allocation</small><b>{snapshot.allocation?.[0]?.symbol || "N/A"} {snapshot.allocation?.[0]?.weight != null ? percent(snapshot.allocation[0].weight) : ""}</b></span>
            <span><small>Sectors</small><b>{snapshot.sectors?.length || 0}</b></span>
            <span><small>Closed trades</small><b>{snapshot.soldCount}</b></span>
          </div>
        </div>
      </details>
    </article>
  );
}

function SnapshotEditor({ snapshot, onClose, onSave }) {
  const [form, setForm] = useState({ ...snapshot, holdings: JSON.stringify(snapshot.holdings || [], null, 2), allocation: JSON.stringify(snapshot.allocation || [], null, 2), sectors: JSON.stringify(snapshot.sectors || [], null, 2) });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const fields = [["snapshotDate","Snapshot date","date"],["periodStart","Period start","date"],["periodEnd","Period end","date"],["currentValue","Current value","number"],["investedValue","Invested value","number"],["totalProfit","Total profit","number"],["profitPercent","Total return %","number"],["realizedProfit","Realized profit","number"],["unrealizedProfit","Unrealized profit","number"],["totalCharges","Charges","number"],["periodProfit","Period profit","number"],["periodReturnPercent","Period return %","number"],["niftyStartValue","Nifty start","number"],["niftyEndValue","Nifty end","number"],["niftyReturnPercent","Nifty return %","number"],["alphaPercent","Alpha %","number"],["holdingCount","Holding count","number"],["soldCount","Sold count","number"]];
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); try { await onSave({ ...form, holdings: JSON.parse(form.holdings), allocation: JSON.parse(form.allocation), sectors: JSON.parse(form.sectors) }); } catch (err) { setError(err.message || "Could not update snapshot."); } finally { setBusy(false); } }
  return <div className="snapshot-edit-overlay" role="dialog" aria-modal="true"><form className="snapshot-edit-modal" onSubmit={submit}><header><div><span>Portfolio snapshot</span><h2>Edit every captured field</h2></div><button className="ghost" type="button" onClick={onClose}><X size={18} /></button></header>{error ? <div className="notice loss">{error}</div> : null}<label><span>Cadence</span><select value={form.snapshotType} onChange={(e) => setForm({ ...form, snapshotType: e.target.value })}>{filters.slice(1).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><div className="snapshot-edit-grid">{fields.map(([key,label,type]) => <label key={key}><span>{label}</span><input type={type} step={type === "number" ? "any" : undefined} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div>{["holdings","allocation","sectors"].map((key) => <label key={key}><span>{labelForJson(key)} JSON</span><textarea rows="6" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<footer><button className="ghost" type="button" onClick={onClose}>Cancel</button><button disabled={busy}>{busy ? "Saving..." : "Save snapshot"}</button></footer></form></div>;
}

function SnapshotPager({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="snapshot-pager" aria-label="Snapshot pages">
      <button className="ghost" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /> Previous</button>
      <span>Page {page} of {pageCount}</span>
      <button className="ghost" type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next <ChevronRight size={16} /></button>
    </nav>
  );
}

function labelFor(type) {
  return ({ daily: "Daily", weekly: "Weekly", monthly: "Monthly", fiscal_year: "Fiscal year" })[type] || "Snapshot";
}
function money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0)); }
function signedMoney(value) { const amount = Number(value || 0); return `${amount >= 0 ? "+" : "-"}${money(Math.abs(amount))}`; }
function percent(value) { return `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`; }
function optionalPercent(value) { return value == null ? "N/A" : percent(value); }
function labelForJson(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function number(value) { return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function date(value) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : "N/A"; }
function time(value) { return value ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "N/A"; }
