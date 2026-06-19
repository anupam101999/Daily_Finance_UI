import React, { useEffect, useState } from "react";
import { Copy, Play, RefreshCw, ServerCog, Square } from "lucide-react";
import { getAdminBatches, getInsiderBackfillStatus, runAdminBatch, startInsiderBackfill, terminateInsiderBackfill, updateAdminBatchSchedule } from "../services/financeStore";

export default function BatchOperations() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState("");
  const [message, setMessage] = useState("");
  const [backfill, setBackfill] = useState(null);
  const [fromYear, setFromYear] = useState("2015");
  const [fromMonth, setFromMonth] = useState("1");
  const [toYear, setToYear] = useState(String(new Date().getFullYear()));
  const [toMonth, setToMonth] = useState(String(new Date().getMonth() + 1));
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [data, backfillData] = await Promise.all([getAdminBatches(), getInsiderBackfillStatus()]);
      setBatches(data.batches || []);
      setBackfill(backfillData);
      if (!backfill) {
        if (backfillData.fromYear) setFromYear(String(backfillData.fromYear));
        if (backfillData.fromMonth) setFromMonth(String(backfillData.fromMonth));
        if (backfillData.toYear) setToYear(String(backfillData.toYear));
        if (backfillData.toMonth) setToMonth(String(backfillData.toMonth));
      }
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!isBackfillActive(backfill)) return undefined;
    const timer = window.setInterval(() => getInsiderBackfillStatus().then(setBackfill).catch(() => {}), 3000);
    return () => window.clearInterval(timer);
  }, [backfill?.status]);

  async function run(batch) {
    setRunning(batch.id);
    setMessage("");
    try {
      const data = await runAdminBatch(batch.id);
      setBatches(data.batches || []);
      setMessage(`${batch.name} completed successfully.`);
    } catch (error) {
      setMessage(error.message);
      const data = await getAdminBatches().catch(() => null);
      if (data) setBatches(data.batches || []);
    } finally {
      setRunning("");
    }
  }

  async function saveSchedule(batch, cronExpression, enabled) {
    setScheduleBusy(batch.id);
    setMessage("");
    try {
      const data = await updateAdminBatchSchedule(batch.id, cronExpression, enabled);
      setBatches(data.batches || []);
      setMessage(`${batch.name} schedule updated.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setScheduleBusy("");
    }
  }

  async function startBackfill() {
    setBackfillBusy(true);
    setMessage("");
    try {
      await startInsiderBackfill(Number(fromYear), Number(fromMonth), Number(toYear), Number(toMonth));
      setBackfill(await getInsiderBackfillStatus());
      setMessage(`Insider backfill ${monthName(fromMonth)} ${fromYear} to ${monthName(toMonth)} ${toYear} was queued.`);
    } catch (error) {
      setMessage(error.message);
      setBackfill(await getInsiderBackfillStatus().catch(() => backfill));
    } finally {
      setBackfillBusy(false);
    }
  }

  async function terminateBackfill() {
    setBackfillBusy(true);
    setMessage("");
    try {
      const data = await terminateInsiderBackfill();
      setBackfill(data.status);
      setMessage(data.status?.status === "cancelled" ? "Insider backfill terminated." : "Termination requested. The active month will finish first.");
    } catch (error) {
      setMessage(error.message);
      setBackfill(await getInsiderBackfillStatus().catch(() => backfill));
    } finally {
      setBackfillBusy(false);
    }
  }

  if (loading && !batches.length) return <div className="empty">Loading batch operations...</div>;
  return (
    <div className="finance-batches">
      {message ? <div className="notice">{message}</div> : null}
      <div className="finance-batch-head"><span><ServerCog size={16} /> Scheduled jobs</span><button className="ghost" type="button" onClick={load} disabled={loading || Boolean(running)}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
      <div className="finance-batch-list">
        {batches.map((batch) => {
          const isRunning = running === batch.id || batch.running;
          return <BatchRow key={batch.id} batch={batch} isRunning={isRunning} runDisabled={Boolean(running)} scheduleBusy={scheduleBusy === batch.id} onRun={() => run(batch)} onSave={saveSchedule} />;
        })}
      </div>
      <BackfillControl status={backfill} fromYear={fromYear} fromMonth={fromMonth} toYear={toYear} toMonth={toMonth} setFromYear={setFromYear} setFromMonth={setFromMonth} setToYear={setToYear} setToMonth={setToMonth} busy={backfillBusy} onStart={startBackfill} onTerminate={terminateBackfill} />
    </div>
  );
}

function BatchRow({ batch, isRunning, runDisabled, scheduleBusy, onRun, onSave }) {
  const daily = batch.id !== "insider-trades";
  const parsed = parseSchedule(batch.cronExpression, daily);
  const [time, setTime] = useState(parsed.time);
  const [interval, setInterval] = useState(parsed.interval);
  const [minute, setMinute] = useState(parsed.minute);
  const [enabled, setEnabled] = useState(batch.schedulerEnabled);

  useEffect(() => {
    const next = parseSchedule(batch.cronExpression, daily);
    setTime(next.time); setInterval(next.interval); setMinute(next.minute); setEnabled(batch.schedulerEnabled);
  }, [batch.cronExpression, batch.schedulerEnabled, daily]);

  const cronExpression = daily ? dailyCron(time) : `${minute} */${interval} * * *`;
  return (
    <article>
      <div><strong>{batch.name}</strong><p>{batch.description}</p><small>{scheduleLabel(batch.cronExpression)} · Asia/Kolkata</small>{batch.lastCompletedAt ? <small>Last completed {dateTime(batch.lastCompletedAt)}</small> : null}{batch.lastWarning ? <small className="batch-warning">Partial source warning: {batch.lastWarning}</small> : null}{batch.lastError ? <small className="loss">Last error: {batch.lastError}</small> : null}</div>
      <div className="batch-schedule-editor">
        {daily ? <label><span>Run time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label> : <><label><span>Every</span><select value={interval} onChange={(event) => setInterval(event.target.value)}>{[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => <option key={hours} value={hours}>{hours} hour{hours === 1 ? "" : "s"}</option>)}</select></label><label><span>At minute</span><input type="number" min="0" max="59" value={minute} onChange={(event) => setMinute(Math.max(0, Math.min(59, Number(event.target.value) || 0)))} /></label></>}
        <label className="batch-enabled"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span>Automatic</span></label>
        <button className="ghost" type="button" disabled={scheduleBusy} onClick={() => onSave(batch, cronExpression, enabled)}>{scheduleBusy ? "Saving..." : "Save schedule"}</button>
      </div>
      <button type="button" disabled={isRunning || runDisabled} onClick={onRun}>{isRunning ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}{isRunning ? "Running..." : "Run now"}</button>
    </article>
  );
}

function BackfillControl({ status, fromYear, fromMonth, toYear, toMonth, setFromYear, setFromMonth, setToYear, setToMonth, busy, onStart, onTerminate }) {
  const active = isBackfillActive(status);
  const progress = Number(status?.progressPercent || 0);
  const invalidRange = Number(toYear) * 12 + Number(toMonth) < Number(fromYear) * 12 + Number(fromMonth);
  return (
    <section className="finance-backfill">
      <div className="finance-batch-head"><span>Historical insider backfill</span><small className={`backfill-status status-${status?.status || "idle"}`}>{String(status?.status || "not started").replaceAll("_", " ")}</small></div>
      <p>Import NSE and BSE insider disclosures for a historical year range.</p>
      <div className="backfill-fields"><label><span>From month</span><select value={fromMonth} disabled={active || busy} onChange={(event) => setFromMonth(event.target.value)}>{monthOptions()}</select></label><label><span>From year</span><input type="number" min="2015" max={new Date().getFullYear()} value={fromYear} disabled={active || busy} onChange={(event) => setFromYear(event.target.value)} /></label><label><span>To month</span><select value={toMonth} disabled={active || busy} onChange={(event) => setToMonth(event.target.value)}>{monthOptions()}</select></label><label><span>To year</span><input type="number" min="2015" max={new Date().getFullYear()} value={toYear} disabled={active || busy} onChange={(event) => setToYear(event.target.value)} /></label></div>
      {status && status.status !== "not_started" ? <><div className="backfill-progress"><i style={{ width: `${progress}%` }} /></div><small>{status.currentLabel || status.status} · {status.completedMonths || 0} of {status.totalMonths || 0} months · {progress}%</small><small>{Number(status.inserted || 0).toLocaleString("en-IN")} inserted · {Number(status.duplicates || 0).toLocaleString("en-IN")} duplicates · {status.failedMonths || 0} failed</small>{status.lastError && status.status !== "cancelled" ? <small className="loss">{status.lastError}</small> : null}</> : null}
      {invalidRange ? <small className="loss">End month must be after the start month.</small> : null}<div className="button-row"><button type="button" disabled={active || busy || invalidRange || !fromYear || !toYear} onClick={onStart}><Play size={16} /> {status?.status === "cancelled" ? "Re-run backfill" : "Run backfill"}</button>{active ? <button className="solid-danger" type="button" disabled={busy} onClick={onTerminate}><Square size={15} /> {status?.status === "cancelling" ? "Force terminate" : "Terminate now"}</button> : null}</div>
      <EmergencyStopSql />
    </section>
  );
}

function EmergencyStopSql() {
  const [copied, setCopied] = useState(false);
  async function copySql() {
    try {
      await navigator.clipboard.writeText(emergencyStopSql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <details className="emergency-sql">
      <summary>Emergency DB stop query</summary>
      <p>Use only when normal termination remains stuck. Run this in the PostgreSQL console.</p>
      <div className="emergency-sql-head"><strong>Terminate worker and mark backfill cancelled</strong><button className="ghost" type="button" onClick={copySql}><Copy size={14} /> {copied ? "Copied" : "Copy SQL"}</button></div>
      <pre><code>{emergencyStopSql}</code></pre>
    </details>
  );
}

function isBackfillActive(status) {
  return ["queued", "running", "cancelling"].includes(status?.status);
}

function dateTime(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{monthName(index + 1)}</option>);
}

function monthName(value) {
  return new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(2000, Number(value) - 1, 1));
}

function parseSchedule(expression, daily) {
  const parts = String(expression || "").split(/\s+/);
  const minute = String(Number(parts[0]) || 0);
  if (daily) return { time: `${String(Number(parts[1]) || 0).padStart(2, "0")}:${minute.padStart(2, "0")}`, interval: "6", minute };
  return { time: "00:00", interval: String(Number(String(parts[1] || "*/6").replace("*/", "")) || 6), minute };
}

function dailyCron(time) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return `${minute || 0} ${hour || 0} * * *`;
}

function scheduleLabel(expression) {
  const parts = String(expression || "").split(/\s+/);
  if (String(parts[1]).startsWith("*/")) return `Every ${String(parts[1]).slice(2)} hours at minute ${parts[0]}`;
  const date = new Date(2000, 0, 1, Number(parts[1]) || 0, Number(parts[0]) || 0);
  return `Daily at ${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

const emergencyStopSql = `BEGIN;

SELECT pg_terminate_backend(l.pid)
FROM pg_locks l
WHERE l.locktype = 'advisory'
  AND l.classid = 0
  AND l.objid = 724061923
  AND l.granted
  AND l.pid <> pg_backend_pid();

UPDATE fin_insider_sync_state
SET status = 'cancelled',
    current_label = 'Terminated manually',
    last_error = '',
    completed_at = now(),
    updated_at = now()
WHERE id = 'backfill';

COMMIT;`;
