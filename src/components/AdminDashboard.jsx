import React, { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, CheckCircle2, CircleAlert, CircleX, FileWarning, Info, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import BatchOperations from "./BatchOperations";
import { getAdminLogs, getAdminSettings, updateAdminSettings } from "../services/financeStore";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  return <section className="admin-workspace">
    <div className="admin-tabs">{[["overview","Overview"],["settings","Settings"],["logs","Logs"],["batches","Batch runs"]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === "overview" ? <AdminOverview onOpen={setTab} /> : tab === "settings" ? <AdminSettings /> : tab === "logs" ? <AdminLogs /> : <BatchOperations />}
  </section>;
}

function AdminOverview({ onOpen }) {
  return <div className="admin-overview-grid">
    <button onClick={() => onOpen("logs")}><Activity /><span><small>Application observability</small><b>API logs</b><em>Inspect requests, warnings, failures, latency, and request IDs.</em></span></button>
    <button onClick={() => onOpen("logs")}><FileWarning /><span><small>Failure evidence</small><b>Sync and job errors</b><em>See failed symbols and provider messages retained with each run.</em></span></button>
    <button onClick={() => onOpen("settings")}><SlidersHorizontal /><span><small>Market data</small><b>Quote provider</b><em>Choose whether prices come from NSE or Screener for syncs and snapshots.</em></span></button>
    <button onClick={() => onOpen("batches")}><CalendarClock /><span><small>Automation</small><b>Schedules</b><em>Edit cron schedules, pause automation, or run any job now.</em></span></button>
  </div>;
}

function AdminSettings() {
  const [settings, setSettings] = useState({ financeQuoteProvider: "nse", quoteProviders: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setLoading(true);
    try { setSettings(await getAdminSettings()); setMessage(""); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }
  async function saveProvider(provider) {
    setBusy(provider); setMessage("");
    try { setSettings(await updateAdminSettings({ financeQuoteProvider: provider })); setMessage(`Quote provider changed to ${provider.toUpperCase()}. Run Finance quote refresh to update stored prices now.`); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(""); }
  }
  useEffect(() => { void load(); }, []);
  const providers = settings.quoteProviders?.length ? settings.quoteProviders : [{ id: "nse", label: "NSE" }, { id: "screener", label: "Screener" }];
  return <section className="admin-settings-workspace">
    <div className="admin-section-head"><div><span><SlidersHorizontal size={17} /> Market data</span><h2>Quote provider</h2><p>The selected source is used for manual syncs, scheduled quote refreshes, and snapshot captures.</p></div><button className="ghost" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    {message ? <div className="notice admin-batch-message">{message}</div> : null}
    <article className="admin-setting-card">
      <div><small>Active source</small><strong>{settings.financeQuoteProvider === "screener" ? "Screener" : "NSE"}</strong><p>NSE is tried first in NSE mode; if NSE blocks the request, the sync falls back to Screener so portfolio views and snapshots still get a price.</p></div>
      <div className="quote-provider-toggle" role="group" aria-label="Quote provider">
        {providers.map((provider) => (
          <button key={provider.id} type="button" className={settings.financeQuoteProvider === provider.id ? "active" : ""} disabled={Boolean(busy) || loading} onClick={() => saveProvider(provider.id)}>
            {busy === provider.id ? "Saving..." : provider.label}
          </button>
        ))}
      </div>
    </article>
  </section>;
}

function AdminLogs() {
  const [filters, setFilters] = useState({ source: "app", date: today(), level: "all", status: "all", search: "", page: 1 });
  const [input, setInput] = useState("");
  const [data, setData] = useState({ logs: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const query = useMemo(() => filters, [filters]);
  async function load() { setLoading(true); setError(""); try { setData(await getAdminLogs(query)); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [query]);
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  const pageCounts = data.logs.reduce((counts, log) => {
    const value = filters.source === "batch" ? log.run_status : log.level;
    if (value === "error" || value === "failed") counts.errors += 1;
    else if (value === "warn" || value === "running") counts.warnings += 1;
    else counts.healthy += 1;
    return counts;
  }, { healthy: 0, warnings: 0, errors: 0 });
  const resetFilters = () => { setInput(""); setFilters({ source: filters.source, date: today(), level: "all", status: "all", search: "", page: 1 }); };
  return <section className="admin-log-workspace">
    <div className="admin-log-intro">
      <div><span><Activity size={17} /> System activity</span><h2>{filters.source === "app" ? "Application logs" : "Batch run history"}</h2><p>{filters.source === "app" ? "Understand requests, warnings, and failures without digging through raw JSON." : "Review scheduled and manual jobs, their outcome, duration, and failure details."}</p></div>
      <button className="ghost" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> {loading ? "Refreshing" : "Refresh"}</button>
    </div>
    <div className="admin-log-toolbar">
      <div className="admin-source-tabs">{[["app","Application"],["batch","Batch runs"]].map(([id,label]) => <button type="button" className={filters.source === id ? "active" : ""} onClick={() => change("source", id)} key={id}>{label}</button>)}</div>
      <label><span>Date</span><input type="date" value={filters.date} onChange={(event) => change("date", event.target.value)} /></label>
      <label><span>{filters.source === "app" ? "Severity" : "Status"}</span><select value={filters.source === "app" ? filters.level : filters.status} onChange={(event) => change(filters.source === "app" ? "level" : "status", event.target.value)}>
        {(filters.source === "app" ? ["all","info","warn","error"] : ["all","running","success","failed","skipped"]).map((value) => <option value={value} key={value}>{labelStatus(value)}</option>)}
      </select></label>
      <form onSubmit={(event) => { event.preventDefault(); change("search", input.trim()); }}><label><span>Search</span><input type="search" placeholder="Event, URL, request ID..." value={input} onChange={(event) => setInput(event.target.value)} /></label><button><Search size={15} /> Search</button><button className="ghost" type="button" onClick={resetFilters}>Clear</button></form>
    </div>
    <div className="admin-log-summary">
      <span><b>{data.pagination.total || 0}</b><small>Matching records</small></span>
      <span className="healthy"><CheckCircle2 /><b>{pageCounts.healthy}</b><small>Healthy on page</small></span>
      <span className="warning"><CircleAlert /><b>{pageCounts.warnings}</b><small>Need attention</small></span>
      <span className="danger"><CircleX /><b>{pageCounts.errors}</b><small>Failed on page</small></span>
    </div>
    {error ? <div className="notice loss">{error}</div> : null}
    <div className="admin-log-list">{loading ? <div className="empty">Loading operational logs...</div> : data.logs.length ? data.logs.map((log) => <LogCard key={log.id} log={log} batch={filters.source === "batch"} />) : <div className="empty">No records match these filters.</div>}</div>
    <div className="admin-log-pager"><button className="ghost" disabled={filters.page <= 1} onClick={() => change("page", filters.page - 1)}>Previous</button><span>Page {data.pagination.page || 1} of {data.pagination.totalPages || 1}</span><button className="ghost" disabled={filters.page >= (data.pagination.totalPages || 1)} onClick={() => change("page", filters.page + 1)}>Next</button></div>
  </section>;
}

function LogCard({ log, batch }) {
  const status = batch ? log.run_status : log.level;
  const meta = batch ? log.result : log.meta;
  const tone = status === "error" || status === "failed" ? "error" : status === "warn" || status === "running" ? "warn" : "success";
  const Icon = tone === "error" ? CircleX : tone === "warn" ? CircleAlert : status === "info" ? Info : CheckCircle2;
  const facts = batch ? [
    ["Started", dateTime(log.started_at)], ["Duration", duration(log.duration_ms)], ["Started by", friendlyText(log.run_source)], ["Finished", dateTime(log.finished_at)],
  ] : [
    ["Request", [log.method, log.path].filter(Boolean).join(" ")], ["HTTP status", log.status_code], ["Duration", duration(log.duration_ms)], ["Request ID", log.request_id],
  ];
  return <article className={`admin-log-card ${tone}`}>
    <div className="admin-log-icon"><Icon size={20} /></div>
    <div className="admin-log-content">
      <header><div><span className={`admin-status ${tone}`}>{labelStatus(status)}</span><b>{batch ? humanEvent(log.batch_id) : humanEvent(log.event)}</b></div><time>{dateTime(batch ? log.started_at : log.created_at)}</time></header>
      <p>{batch ? log.error_message || batchMessage(log) : log.message || "No additional message was recorded."}</p>
      <dl>{facts.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {meta && Object.keys(meta).length ? <details><summary>Technical details</summary><pre>{JSON.stringify(meta, null, 2)}</pre></details> : null}
    </div>
  </article>;
}
function dateTime(value) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : ""; }
function duration(value) { const ms = Number(value); if (!Number.isFinite(ms) || ms < 0) return ""; return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} sec` : `${ms} ms`; }
function friendlyText(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function humanEvent(value) { const known = { "api.request": "API request", "api.exception": "Request failed", "finance.quote_sync_partial": "Some market quotes failed", "batch.partial_failure": "Batch completed with warnings", "batch.failed": "Batch run failed", "finance-quotes": "Finance quote refresh", "portfolio-snapshot-daily": "Daily portfolio snapshot", "portfolio-snapshot-weekly": "Weekly portfolio snapshot", "portfolio-snapshot-monthly": "Monthly portfolio snapshot", "portfolio-snapshot-fiscal-year": "Fiscal-year portfolio snapshot" }; return known[value] || friendlyText(value).replaceAll(".", " "); }
function labelStatus(value) { return value === "all" ? "All" : ({ info: "Information", warn: "Warning", error: "Error", success: "Successful", failed: "Failed", running: "Running", skipped: "Skipped" })[value] || friendlyText(value); }
function batchMessage(log) { const source = friendlyText(log.run_source) || "Batch"; return `${source} run ${log.run_status === "success" ? "completed successfully" : labelStatus(log.run_status).toLowerCase()}${log.duration_ms ? ` in ${duration(log.duration_ms)}` : ""}.`; }
