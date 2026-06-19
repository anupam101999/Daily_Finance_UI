import React from "react";
import { Banknote, Plus } from "lucide-react";

export function AssetForm({ form, setForm, onSubmit, busy, editing, onCancel, exchangeOptions }) {
  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <input value={form.stockName} onChange={(event) => setForm({ ...form, stockName: event.target.value })} placeholder="Investment name" required />
      <input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} required />
      <input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value.toUpperCase() })} placeholder="Symbol" required />
      <select value={form.exchange} onChange={(event) => setForm({ ...form, exchange: event.target.value })} required>
        {exchangeOptions.map((exchange) => <option key={exchange} value={exchange}>{exchange}</option>)}
      </select>
      <input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Units bought" type="number" min="0" step="0.000001" required />
      <input value={form.averagePrice} onChange={(event) => setForm({ ...form, averagePrice: event.target.value })} placeholder="Buy price per unit" type="number" min="0" step="0.01" required />
      <input value={form.charges} onChange={(event) => setForm({ ...form, charges: event.target.value })} placeholder="Brokerage / charges" type="number" min="0" step="0.01" />
      <input value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} placeholder="Sector (optional)" />
      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
      <div className="button-row">
        <button disabled={busy}><Plus size={16} /> {editing ? "Save" : "Add"}</button>
        {editing ? <button type="button" className="ghost" onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}

export function SaleForm({ form, setForm, onSubmit, onCancel, busy, maxQuantity }) {
  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <input type="date" value={form.sellDate} onChange={(event) => setForm({ ...form, sellDate: event.target.value })} required />
      <input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Units sold" type="number" min="0" max={maxQuantity} step="0.000001" required />
      <input value={form.sellPrice} onChange={(event) => setForm({ ...form, sellPrice: event.target.value })} placeholder="Sell price per unit" type="number" min="0" step="0.01" required />
      <input value={form.charges} onChange={(event) => setForm({ ...form, charges: event.target.value })} placeholder="Brokerage / charges" type="number" min="0" step="0.01" />
      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
      <div className="button-row">
        <button disabled={busy}>Record sale</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function DividendForm({ form, setForm, assets, onSubmit, onCancel, busy }) {
  if (!assets.length) {
    return <div className="empty">No open holdings available for dividend entry.<div className="button-row empty-actions"><button type="button" className="ghost" onClick={onCancel}>Close</button></div></div>;
  }
  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <select value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value })} required>
        <option value="" disabled>Select held stock</option>
        {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} ({asset.symbol}:{asset.exchange}) - Qty {formatNumber(asset.quantity)}</option>)}
      </select>
      <input type="date" value={form.dividendDate} onChange={(event) => setForm({ ...form, dividendDate: event.target.value })} required />
      <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Dividend amount received" type="number" min="0" step="0.01" required />
      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
      <div className="button-row"><button disabled={busy}><Banknote size={16} /> Add dividend</button><button type="button" className="ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export function TransactionForm({ form, setForm, assets, onSubmit, onCancel, busy }) {
  return (
    <form className="asset-form transaction-form" onSubmit={onSubmit}>
      <Field label="Investment"><select value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value })} required><option value="" disabled>Select asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol}:{asset.exchange}</option>)}</select></Field>
      <Field label="Transaction type"><select value={form.transactionType} onChange={(event) => setForm({ ...form, transactionType: event.target.value })} required><option value="buy">Buy</option><option value="sell">Sell</option><option value="dividend">Dividend</option><option value="fee">Fee</option></select></Field>
      <Field label="Transaction date"><input type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} required /></Field>
      <Field label="Units"><input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} type="number" min="0" step="0.000001" required /></Field>
      <Field label="Price or amount"><input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} type="number" min="0" step="0.01" required /></Field>
      <Field label="Brokerage / charges"><input value={form.charges} onChange={(event) => setForm({ ...form, charges: event.target.value })} type="number" min="0" step="0.01" /></Field>
      <Field label="Sector (optional)" full><input value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} placeholder="Enter sector manually" /></Field>
      <Field label="Notes" full><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional notes" /></Field>
      <div className="button-row"><button disabled={busy}>Save</button><button type="button" className="ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function Field({ label, full = false, children }) {
  return <label className={full ? "form-field full-field" : "form-field"}><span>{label}</span>{children}</label>;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
