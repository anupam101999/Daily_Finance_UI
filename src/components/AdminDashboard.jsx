import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarClock, CheckCircle2, CircleAlert, CircleX, Database, Edit3, FileWarning, Info, Play, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import BatchOperations from "./BatchOperations";
import {
  deleteAdminDatabaseRow,
  getAdminDatabaseTable,
  getAdminDatabaseTables,
  getAdminLogs,
  getAdminQuoteAssets,
  getAdminSettings,
  insertAdminDatabaseRow,
  runAdminDatabaseQuery,
  updateAdminDatabaseRow,
  updateAdminQuoteAsset,
  updateAdminSettings,
} from "../services/financeStore";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  return <section className="admin-workspace">
    <div className="admin-tabs">{[["overview","Overview"],["settings","Settings"],["quote-sync","Quote sync"],["database","Database"],["logs","Logs"],["batches","Batch runs"]].map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === "overview" ? <AdminOverview onOpen={setTab} /> : tab === "settings" ? <AdminSettings /> : tab === "quote-sync" ? <AdminQuoteSync /> : tab === "database" ? <AdminDatabase /> : tab === "logs" ? <AdminLogs /> : <BatchOperations />}
  </section>;
}

function AdminOverview({ onOpen }) {
  return <div className="admin-overview-grid">
    <button onClick={() => onOpen("logs")}><Activity /><span><small>Application observability</small><b>API logs</b><em>Inspect requests, warnings, failures, latency, and request IDs.</em></span></button>
    <button onClick={() => onOpen("logs")}><FileWarning /><span><small>Failure evidence</small><b>Sync and job errors</b><em>See failed symbols and provider messages retained with each run.</em></span></button>
    <button onClick={() => onOpen("settings")}><SlidersHorizontal /><span><small>Market data</small><b>Quote provider</b><em>Choose whether prices come from NSE or Screener for syncs and snapshots.</em></span></button>
    <button onClick={() => onOpen("quote-sync")}><RefreshCw /><span><small>Per-stock control</small><b>Quote exclusions</b><em>Skip any held stock during manual syncs and scheduled snapshot batches.</em></span></button>
    <button onClick={() => onOpen("database")}><Database /><span><small>Database admin</small><b>Tables and SQL</b><em>Browse records, insert, update, delete, and run SQL queries.</em></span></button>
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

function AdminQuoteSync() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  async function load() {
    setLoading(true);
    try {
      const data = await getAdminQuoteAssets();
      setAssets(data.assets || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function toggle(asset) {
    setBusy(asset.id);
    setMessage("");
    try {
      const data = await updateAdminQuoteAsset(asset.id, !asset.skipQuoteSync);
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...data.asset } : item));
      setMessage(`${asset.name || asset.symbol} will ${!asset.skipQuoteSync ? "be skipped by" : "join"} quote sync and snapshot batches.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }
  async function saveAsset(asset) {
    setBusy(asset.id);
    setMessage("");
    try {
      const data = await updateAdminQuoteAsset(asset.id, asset);
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...data.asset } : item));
      setEditing(null);
      setMessage(`${data.asset.name || data.asset.symbol} mapping updated.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }
  useEffect(() => { void load(); }, []);
  const filtered = assets.filter((asset) => [asset.name, asset.symbol, asset.exchange, asset.userName].join(" ").toLowerCase().includes(search.toLowerCase()));
  const skipped = assets.filter((asset) => asset.skipQuoteSync).length;
  return <section className="admin-quote-workspace">
    <div className="admin-section-head"><div><span><RefreshCw size={17} /> Quote sync</span><h2>Stock sync exclusions</h2><p>Turn off quote refresh for a particular holding. Manual syncs and scheduled portfolio snapshots will leave that stock price unchanged.</p></div><button className="ghost" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    {message ? <div className="notice admin-batch-message">{message}</div> : null}
    <div className="admin-db-toolbar">
      <label><span>Search stock</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, symbol, owner..." /></label>
      <span className="admin-db-count">{skipped} skipped / {assets.length} held stocks</span>
    </div>
    <div className="admin-data-table admin-quote-table">
      <div className="admin-data-head"><span>Stock</span><span>Owner</span><span>Quantity</span><span>Last price</span><span>Status</span><span>Action</span></div>
      {loading ? <div className="empty">Loading stocks...</div> : filtered.length ? filtered.map((asset) => <div className="admin-data-row" key={asset.id}>
        <span><strong>{asset.name}</strong><small>{[asset.symbol, asset.exchange].filter(Boolean).join(" / ")}</small></span>
        <span>{asset.userName || asset.userId}</span>
        <span>{formatCell(asset.quantity)}</span>
        <span>{asset.lastPrice == null ? "Not synced" : `Rs ${Number(asset.lastPrice).toLocaleString("en-IN")}`}<small>{dateTime(asset.lastPriceAt)}</small></span>
        <span><i className={`admin-pill ${asset.skipQuoteSync ? "warn" : "success"}`}>{asset.skipQuoteSync ? "Skipped" : "Included"}</i></span>
        <span className="admin-quote-actions">
          <button className="ghost icon-button" type="button" aria-label={`Edit ${asset.name}`} onClick={() => setEditing(asset)}><Edit3 size={15} /></button>
          <button className={asset.skipQuoteSync ? "ghost" : ""} disabled={busy === asset.id} onClick={() => toggle(asset)}>{busy === asset.id ? "Saving..." : asset.skipQuoteSync ? "Include" : "Skip"}</button>
        </span>
      </div>) : <div className="empty">No stocks match this search.</div>}
    </div>
    {editing ? <QuoteAssetEditor asset={editing} busy={busy === editing.id} onClose={() => setEditing(null)} onSave={saveAsset} /> : null}
  </section>;
}

function QuoteAssetEditor({ asset, busy, onClose, onSave }) {
  const [form, setForm] = useState({ ...asset, lastPrice: asset.lastPrice ?? "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function submit(event) {
    event.preventDefault();
    onSave({
      id: asset.id,
      name: form.name,
      symbol: form.symbol,
      exchange: form.exchange,
      sector: form.sector,
      lastPrice: form.lastPrice,
      skipQuoteSync: form.skipQuoteSync,
    });
  }
  return (
    <div className="snapshot-edit-overlay" role="dialog" aria-modal="true">
      <form className="snapshot-edit-modal admin-quote-edit-modal" onSubmit={submit}>
        <header>
          <div><span>Stock mapping</span><h2>Edit quote source details</h2></div>
          <button className="ghost icon-button" type="button" onClick={onClose} aria-label="Close editor"><X size={18} /></button>
        </header>
        <div className="snapshot-edit-grid">
          <label><span>Name</span><input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
          <label><span>Symbol</span><input value={form.symbol || ""} onChange={(event) => update("symbol", event.target.value.toUpperCase())} required /></label>
          <label><span>Exchange</span><input value={form.exchange || ""} onChange={(event) => update("exchange", event.target.value.toUpperCase())} required /></label>
          <label><span>Sector</span><input value={form.sector || ""} onChange={(event) => update("sector", event.target.value)} /></label>
          <label><span>Last price</span><input type="number" min="0" step="any" value={form.lastPrice} onChange={(event) => update("lastPrice", event.target.value)} /></label>
          <label><span>Status</span><select value={form.skipQuoteSync ? "skip" : "include"} onChange={(event) => update("skipQuoteSync", event.target.value === "skip")}><option value="include">Included</option><option value="skip">Skipped</option></select></label>
        </div>
        <footer>
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
          <button disabled={busy}>{busy ? "Saving..." : "Save mapping"}</button>
        </footer>
      </form>
    </div>
  );
}

function AdminDatabase() {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState("");
  const [tableData, setTableData] = useState({ schema: { columns: [], primaryKey: [] }, rows: [], pagination: { page: 1, totalPages: 1, total: 0 } });
  const [filters, setFilters] = useState({ page: 1, pageSize: 25, search: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState(null);
  const [sql, setSql] = useState("select * from fin_asset limit 20");
  const [sqlCursor, setSqlCursor] = useState(sql.length);
  const [queryResult, setQueryResult] = useState(null);
  const sqlInputRef = useRef(null);
  async function loadTables() {
    try {
      const data = await getAdminDatabaseTables();
      setTables(data.tables || []);
      setSelected((current) => current || data.tables?.[0]?.name || "");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function loadTable(table = selected, nextFilters = filters) {
    if (!table) return;
    setLoading(true);
    try {
      const data = await getAdminDatabaseTable(table, nextFilters);
      setTableData(data);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadTables(); }, []);
  useEffect(() => { if (selected) void loadTable(selected, filters); }, [selected, filters]);
  const columns = tableData.schema.columns || [];
  const visibleColumns = columns.map((column) => column.name);
  const displayColumns = visibleColumns.slice(0, 12);
  const queryRows = queryResult?.rows || [];
  const queryColumns = queryResult ? (queryResult.fields?.length ? queryResult.fields : Object.keys(queryRows[0] || {})) : [];
  const queryPageCount = Math.max(1, Math.ceil(queryRows.length / filters.pageSize));
  const queryPage = Math.min(filters.page, queryPageCount);
  const visibleQueryRows = queryRows.slice((queryPage - 1) * filters.pageSize, queryPage * filters.pageSize);
  const activeRows = queryResult ? visibleQueryRows : tableData.rows;
  const activeColumns = queryResult ? queryColumns.slice(0, 12) : displayColumns;
  const queryRowsEditable = queryResult && tableData.schema.primaryKey?.length && tableData.schema.primaryKey.every((column) => queryColumns.includes(column));
  const sqlToken = currentSqlToken(sql, sqlCursor);
  const sqlSuggestions = buildSqlSuggestions(tables, columns, selected, sqlToken.text);
  const changePage = (page) => setFilters((current) => ({ ...current, page }));
  function insertSqlSuggestion(value) {
    const nextSql = `${sql.slice(0, sqlToken.start)}${value}${sql.slice(sqlToken.end)}`;
    const nextCursor = sqlToken.start + value.length;
    setSql(nextSql);
    setSqlCursor(nextCursor);
    window.setTimeout(() => {
      sqlInputRef.current?.focus();
      sqlInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }
  async function runQuery(event) {
    event.preventDefault();
    setLoading(true);
    try {
      setQueryResult(await runAdminDatabaseQuery(sql));
      setFilters((current) => ({ ...current, page: 1 }));
      await loadTables();
      if (selected) await loadTable(selected, filters);
      setMessage("Query completed.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function saveEditor() {
    try {
      const row = JSON.parse(editor.text);
      if (editor.mode === "insert") await insertAdminDatabaseRow(selected, row);
      else await updateAdminDatabaseRow(selected, editor.key, row);
      setEditor(null);
      await loadTable();
      await loadTables();
      setMessage(editor.mode === "insert" ? "Record inserted." : "Record updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  async function deleteRow(row) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteAdminDatabaseRow(selected, row.__rowKey);
      await loadTable();
      await loadTables();
      setMessage("Record deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  }
  return <section className="admin-db-workspace">
    <div className="admin-section-head"><div><span><Database size={17} /> Database</span><h2>Database replica</h2><p>Browse public tables, inspect data, edit rows with JSON, and run SQL queries.</p></div><button className="ghost" onClick={() => { void loadTables(); void loadTable(); }} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    {message ? <div className="notice admin-batch-message">{message}</div> : null}
    <div className="admin-db-layout">
      <aside className="admin-table-list">{tables.map((table) => <button key={table.name} className={selected === table.name ? "active" : ""} onClick={() => { setQueryResult(null); setSelected(table.name); setFilters((current) => ({ ...current, page: 1 })); }}><span>{table.name}</span><small>{table.total} rows</small></button>)}</aside>
      <div className="admin-table-panel">
        <form className="admin-query-console" onSubmit={runQuery}>
          <label>
            <span>SQL query</span>
            <textarea
              ref={sqlInputRef}
              value={sql}
              spellCheck="false"
              onClick={(event) => setSqlCursor(event.currentTarget.selectionStart)}
              onKeyUp={(event) => setSqlCursor(event.currentTarget.selectionStart)}
              onSelect={(event) => setSqlCursor(event.currentTarget.selectionStart)}
              onChange={(event) => { setSql(event.target.value); setSqlCursor(event.target.selectionStart); }}
            />
            <SqlSuggestions suggestions={sqlSuggestions} onInsert={insertSqlSuggestion} />
          </label>
          <button disabled={loading}><Play size={15} /> Run query</button>
        </form>
        {queryResult ? <div className="admin-query-status"><strong>{queryResult.rowCount ?? queryRows.length} query rows</strong><span>{queryRowsEditable ? "Showing editable SQL result in the table below." : "Showing SQL result in the table below."}</span><button className="ghost" type="button" onClick={() => setQueryResult(null)}>Back to table</button></div> : null}
        <div className="admin-db-toolbar">
          <label><span>Search table data</span><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Search JSON row text..." /></label>
          <label><span>Page size</span><select value={filters.pageSize} onChange={(event) => setFilters((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}>{[10,25,50,100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <button onClick={() => setEditor({ mode: "insert", key: null, text: "{\n\n}" })}><Plus size={15} /> Insert</button>
        </div>
        <div className="admin-db-scroll">
          <div className="admin-db-grid" style={{ gridTemplateColumns: `repeat(${Math.max(activeColumns.length, 1)}, minmax(108px, 1fr))${queryRowsEditable || !queryResult ? " 82px" : ""}` }}>
            {activeColumns.map((column) => <b className="admin-db-cell head" key={column}>{column}</b>)}{queryRowsEditable || !queryResult ? <b className="admin-db-cell head">Actions</b> : null}
            {loading ? <div className="admin-db-empty">Loading records...</div> : activeRows.length ? activeRows.map((row, rowIndex) => <React.Fragment key={queryResult ? `query-${rowIndex}` : JSON.stringify(row.__rowKey)}>
              {activeColumns.map((column) => <span className="admin-db-cell" key={`${queryResult ? rowIndex : JSON.stringify(row.__rowKey)}-${column}`} title={formatCell(row[column])}>{formatCell(row[column])}</span>)}
              {queryRowsEditable || !queryResult ? <span className="admin-db-actions"><button className="ghost icon-button" title="Edit row" onClick={() => setEditor({ mode: "update", key: queryResult ? buildKeyFromRow(row, tableData.schema.primaryKey) : row.__rowKey, text: JSON.stringify(cleanRow(row), null, 2) })}><Edit3 size={14} /></button><button className="ghost icon-button danger" title="Delete row" onClick={() => deleteRow(queryResult ? { ...row, __rowKey: buildKeyFromRow(row, tableData.schema.primaryKey) } : row)}><Trash2 size={14} /></button></span> : null}
            </React.Fragment>) : <div className="admin-db-empty">No records found.</div>}
          </div>
        </div>
        <div className="admin-log-pager"><button className="ghost" disabled={filters.page <= 1} onClick={() => changePage(filters.page - 1)}>Previous</button><span>{queryResult ? `Page ${queryPage} of ${queryPageCount} (${queryRows.length} query rows)` : `Page ${tableData.pagination.page || 1} of ${tableData.pagination.totalPages || 1} (${tableData.pagination.total || 0} rows)`}</span><button className="ghost" disabled={queryResult ? queryPage >= queryPageCount : filters.page >= (tableData.pagination.totalPages || 1)} onClick={() => changePage(filters.page + 1)}>Next</button></div>
      </div>
    </div>
    {editor ? <div className="snapshot-edit-overlay"><div className="snapshot-edit-modal admin-json-modal">
      <header><div><small>{selected}</small><h2>{editor.mode === "insert" ? "Insert record" : "Update record"}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setEditor(null)}><X size={18} /></button></header>
      <label><span>Record JSON</span><textarea value={editor.text} onChange={(event) => setEditor((current) => ({ ...current, text: event.target.value }))} /></label>
      <footer><button className="ghost" onClick={() => setEditor(null)}>Cancel</button><button onClick={saveEditor}>{editor.mode === "insert" ? "Insert" : "Update"}</button></footer>
    </div></div> : null}
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
function SqlSuggestions({ suggestions, onInsert }) {
  if (!suggestions.length) return null;
  return <div className="sql-suggestion-strip" aria-label="SQL suggestions">{suggestions.map((item) => <button type="button" key={`${item.type}-${item.value}`} onClick={() => onInsert(item.value)} title={item.detail}><small>{item.type}</small><span>{item.value}</span></button>)}</div>;
}
function currentSqlToken(sql, cursor) {
  const safeCursor = Math.max(0, Math.min(Number(cursor || 0), sql.length));
  let start = safeCursor;
  while (start > 0 && /[A-Za-z0-9_]/.test(sql[start - 1])) start -= 1;
  let end = safeCursor;
  while (end < sql.length && /[A-Za-z0-9_]/.test(sql[end])) end += 1;
  return { start, end, text: sql.slice(start, end).toLowerCase() };
}
function buildSqlSuggestions(tables, columns, selectedTable, token) {
  const matches = (value) => !token || String(value || "").toLowerCase().includes(token);
  const tableItems = (tables || []).filter((table) => matches(table.name)).slice(0, 8).map((table) => ({ type: "table", value: table.name, detail: `${table.total || 0} rows` }));
  const columnItems = (columns || []).filter((column) => matches(column.name)).slice(0, 10).map((column) => ({ type: "column", value: column.name, detail: `${selectedTable}.${column.name} ${column.dataType || ""}`.trim() }));
  return [...tableItems, ...columnItems].slice(0, 14);
}
function cleanRow(row) { const { __ctid, __rowKey, ...rest } = row || {}; return rest; }
function buildKeyFromRow(row, primaryKey = []) { return Object.fromEntries(primaryKey.map((column) => [column, row?.[column]])); }
function formatCell(value) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toLocaleString("en-IN", { maximumFractionDigits: 4 });
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
