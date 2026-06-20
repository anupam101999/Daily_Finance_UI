import React, { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, FileWarning, RefreshCw, ServerCog } from "lucide-react";
import BatchOperations from "./BatchOperations";
import { getAdminLogs } from "../services/financeStore";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  return <section className="admin-workspace">
    <div className="admin-tabs">{[["overview","Overview"],["logs","Logs"],["batches","Batch runs"]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === "overview" ? <AdminOverview onOpen={setTab} /> : tab === "logs" ? <AdminLogs /> : <BatchOperations />}
  </section>;
}

function AdminOverview({ onOpen }) {
  return <div className="admin-overview-grid">
    <button onClick={() => onOpen("logs")}><Activity /><span><small>Application observability</small><b>API logs</b><em>Inspect requests, warnings, failures, latency, and request IDs.</em></span></button>
    <button onClick={() => onOpen("logs")}><FileWarning /><span><small>Failure evidence</small><b>Sync and job errors</b><em>See failed symbols and provider messages retained with each run.</em></span></button>
    <button onClick={() => onOpen("batches")}><CalendarClock /><span><small>Automation</small><b>Schedules</b><em>Edit cron schedules, pause automation, or run any job now.</em></span></button>
    <button onClick={() => onOpen("batches")}><ServerCog /><span><small>Data lifecycle</small><b>3-day retention</b><em>Application logs and completed run history clear automatically.</em></span></button>
  </div>;
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
  return <section className="admin-log-workspace">
    <div className="admin-log-toolbar">
      <div className="admin-source-tabs">{[["app","Application logs"],["batch","Batch runs"]].map(([id,label]) => <button className={filters.source === id ? "active" : ""} onClick={() => change("source", id)} key={id}>{label}</button>)}</div>
      <input type="date" value={filters.date} onChange={(event) => change("date", event.target.value)} />
      <select value={filters.source === "app" ? filters.level : filters.status} onChange={(event) => change(filters.source === "app" ? "level" : "status", event.target.value)}>
        {(filters.source === "app" ? ["all","info","warn","error"] : ["all","running","success","failed","skipped"]).map((value) => <option key={value}>{value}</option>)}
      </select>
      <form onSubmit={(event) => { event.preventDefault(); change("search", input.trim()); }}><input type="search" placeholder="Search events or metadata" value={input} onChange={(event) => setInput(event.target.value)} /><button><RefreshCw size={15} /> Search</button></form>
    </div>
    <div className="admin-log-count"><span>{data.pagination.total || 0} records</span><button className="ghost" onClick={load}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    {error ? <div className="notice loss">{error}</div> : null}
    <div className="admin-log-list">{loading ? <div className="empty">Loading operational logs...</div> : data.logs.length ? data.logs.map((log) => <LogCard key={log.id} log={log} batch={filters.source === "batch"} />) : <div className="empty">No records match these filters.</div>}</div>
    <div className="admin-log-pager"><button className="ghost" disabled={filters.page <= 1} onClick={() => change("page", filters.page - 1)}>Previous</button><span>Page {data.pagination.page || 1} of {data.pagination.totalPages || 1}</span><button className="ghost" disabled={filters.page >= (data.pagination.totalPages || 1)} onClick={() => change("page", filters.page + 1)}>Next</button></div>
  </section>;
}

function LogCard({ log, batch }) {
  const status = batch ? log.run_status : log.level;
  const meta = batch ? log.result : log.meta;
  return <article className="admin-log-card"><header><span className={`admin-status ${status === "error" || status === "failed" ? "error" : status === "warn" || status === "running" ? "warn" : "success"}`}>{status}</span><b>{batch ? log.batch_id : log.event}</b><time>{dateTime(batch ? log.started_at : log.created_at)}</time></header><p>{batch ? log.error_message || `${log.run_source} run${log.duration_ms ? ` completed in ${log.duration_ms}ms` : ""}` : log.message}</p>{meta && Object.keys(meta).length ? <details><summary>Metadata</summary><pre>{JSON.stringify(meta, null, 2)}</pre></details> : null}</article>;
}
function dateTime(value) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : ""; }
