import React, { useEffect, useState } from "react";
import { Play, RefreshCw, ServerCog, Square } from "lucide-react";
import { getAdminBatches, getInsiderBackfillStatus, runAdminBatch, startInsiderBackfill, terminateInsiderBackfill } from "../services/financeStore";

export default function BatchOperations() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState("");
  const [message, setMessage] = useState("");
  const [backfill, setBackfill] = useState(null);
  const [fromYear, setFromYear] = useState("2015");
  const [toYear, setToYear] = useState(String(new Date().getFullYear()));
  const [backfillBusy, setBackfillBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [data, backfillData] = await Promise.all([getAdminBatches(), getInsiderBackfillStatus()]);
      setBatches(data.batches || []);
      setBackfill(backfillData);
      if (!backfill) {
        if (backfillData.fromYear) setFromYear(String(backfillData.fromYear));
        if (backfillData.toYear) setToYear(String(backfillData.toYear));
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

  async function startBackfill() {
    setBackfillBusy(true);
    setMessage("");
    try {
      await startInsiderBackfill(Number(fromYear), Number(toYear));
      setBackfill(await getInsiderBackfillStatus());
      setMessage(`Insider backfill ${fromYear}-${toYear} was queued.`);
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
          return <article key={batch.id}><div><strong>{batch.name}</strong><p>{batch.description}</p><small>{batch.schedule} · Scheduler {batch.schedulerEnabled ? "enabled" : "disabled"}</small>{batch.lastCompletedAt ? <small>Last completed {dateTime(batch.lastCompletedAt)}</small> : null}{batch.lastWarning ? <small className="batch-warning">Partial source warning: {batch.lastWarning}</small> : null}{batch.lastError ? <small className="loss">Last error: {batch.lastError}</small> : null}</div><button type="button" disabled={isRunning || Boolean(running)} onClick={() => run(batch)}>{isRunning ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}{isRunning ? "Running..." : "Run now"}</button></article>;
        })}
      </div>
      <BackfillControl status={backfill} fromYear={fromYear} toYear={toYear} setFromYear={setFromYear} setToYear={setToYear} busy={backfillBusy} onStart={startBackfill} onTerminate={terminateBackfill} />
    </div>
  );
}

function BackfillControl({ status, fromYear, toYear, setFromYear, setToYear, busy, onStart, onTerminate }) {
  const active = isBackfillActive(status);
  const progress = Number(status?.progressPercent || 0);
  return (
    <section className="finance-backfill">
      <div className="finance-batch-head"><span>Historical insider backfill</span><small className={`backfill-status status-${status?.status || "idle"}`}>{String(status?.status || "not started").replaceAll("_", " ")}</small></div>
      <p>Import NSE and BSE insider disclosures for a historical year range.</p>
      <div className="backfill-fields"><label><span>From year</span><input type="number" min="2015" max={new Date().getFullYear()} value={fromYear} disabled={active || busy} onChange={(event) => setFromYear(event.target.value)} /></label><label><span>To year</span><input type="number" min="2015" max={new Date().getFullYear()} value={toYear} disabled={active || busy} onChange={(event) => setToYear(event.target.value)} /></label></div>
      {status && status.status !== "not_started" ? <><div className="backfill-progress"><i style={{ width: `${progress}%` }} /></div><small>{status.currentLabel || status.status} · {status.completedMonths || 0} of {status.totalMonths || 0} months · {progress}%</small><small>{Number(status.inserted || 0).toLocaleString("en-IN")} inserted · {Number(status.duplicates || 0).toLocaleString("en-IN")} duplicates · {status.failedMonths || 0} failed</small>{status.lastError && status.status !== "cancelled" ? <small className="loss">{status.lastError}</small> : null}</> : null}
      <div className="button-row"><button type="button" disabled={active || busy || !fromYear || !toYear} onClick={onStart}><Play size={16} /> {status?.status === "cancelled" ? "Re-run backfill" : "Run backfill"}</button>{active ? <button className="solid-danger" type="button" disabled={busy || status?.status === "cancelling"} onClick={onTerminate}><Square size={15} /> {status?.status === "cancelling" ? "Stopping..." : "Terminate"}</button> : null}</div>
    </section>
  );
}

function isBackfillActive(status) {
  return ["queued", "running", "cancelling"].includes(status?.status);
}

function dateTime(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
