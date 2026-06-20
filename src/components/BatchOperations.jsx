import React, { useEffect, useState } from "react";
import { Play, RefreshCw, Save, ServerCog } from "lucide-react";
import { getAdminBatches, runAdminBatch, updateAdminBatchSchedule } from "../services/financeStore";

export default function BatchOperations() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function load() { setLoading(true); try { setBatches((await getAdminBatches()).batches || []); } catch (error) { setMessage(error.message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function run(batch) {
    setBusy(batch.id); setMessage("");
    try {
      const data = await runAdminBatch(batch.id); setBatches(data.batches || []);
      const failures = data.result?.failures || [];
      setMessage(failures.length ? `${batch.name} completed with ${failures.length} failure(s): ${failures.map((row) => `${row.symbol}: ${row.error}`).join("; ")}` : `${batch.name} completed successfully.`);
    } catch (error) { setMessage(error.message); await load(); } finally { setBusy(""); }
  }
  async function save(batch, cronExpression, enabled) {
    setBusy(`save-${batch.id}`); setMessage("");
    try { setBatches((await updateAdminBatchSchedule(batch.id, cronExpression, enabled)).batches || []); setMessage(`${batch.name} schedule updated.`); }
    catch (error) { setMessage(error.message); } finally { setBusy(""); }
  }
  return <section className="admin-batches">
    <div className="admin-section-head"><div><span><ServerCog size={17} /> Automation</span><h2>Batch control center</h2><p>Run, pause, and reschedule every operational job. Cron schedules use Asia/Kolkata.</p></div><button className="ghost" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    {message ? <div className="notice admin-batch-message">{message}</div> : null}
    <div className="admin-batch-grid">{batches.map((batch) => <BatchCard key={batch.id} batch={batch} busy={busy} onRun={run} onSave={save} />)}</div>
  </section>;
}

function BatchCard({ batch, busy, onRun, onSave }) {
  const [cron, setCron] = useState(batch.cronExpression);
  const [enabled, setEnabled] = useState(batch.schedulerEnabled);
  useEffect(() => { setCron(batch.cronExpression); setEnabled(batch.schedulerEnabled); }, [batch.cronExpression, batch.schedulerEnabled]);
  const running = busy === batch.id || batch.running;
  return <article className="admin-batch-card">
    <header><span className={`admin-status ${enabled ? "success" : "muted"}`}>{enabled ? "Automatic" : "Paused"}</span><small>{scheduleLabel(batch.cronExpression)}</small></header>
    <h3>{batch.name}</h3><p>{batch.description}</p>
    <div className="admin-batch-meta"><span>Last run <b>{dateTime(batch.lastCompletedAt)}</b></span>{batch.lastError ? <span className="loss">Error <b>{batch.lastError}</b></span> : null}</div>
    <label className="admin-cron-field"><span>Cron expression</span><input value={cron} onChange={(event) => setCron(event.target.value)} /></label>
    <label className="admin-switch"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span>Enable scheduled runs</span></label>
    <footer><button className="ghost" disabled={busy} onClick={() => onSave(batch, cron.trim(), enabled)}><Save size={15} /> {busy === `save-${batch.id}` ? "Saving..." : "Save"}</button><button disabled={busy} onClick={() => onRun(batch)}>{running ? <RefreshCw className="spin" size={15} /> : <Play size={15} />} {running ? "Running..." : "Run now"}</button></footer>
  </article>;
}

function dateTime(value) { return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never"; }
function scheduleLabel(expression) {
  const [minute, hour, day, month, weekday] = String(expression || "").split(/\s+/);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, Number(hour) || 0, Number(minute) || 0));
  if (day === "1" && month === "4") return `Every 1 April at ${time}`;
  if (day === "1") return `First day monthly at ${time}`;
  if (weekday === "1") return `Every Monday at ${time}`;
  return `Daily at ${time}`;
}
