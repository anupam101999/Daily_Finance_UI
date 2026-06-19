import React, { useEffect, useState } from "react";
import { Play, RefreshCw, ServerCog } from "lucide-react";
import { getAdminBatches, runAdminBatch } from "../services/financeStore";

export default function BatchOperations() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminBatches();
      setBatches(data.batches || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

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
    </div>
  );
}

function dateTime(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
