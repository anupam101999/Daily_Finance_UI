import React, { useMemo, useState } from "react";
import { Calculator, Target, TrendingUp } from "lucide-react";

const modes = [
  { id: "sip", label: "Monthly SIP" },
  { id: "stepup", label: "Step-up SIP" },
  { id: "lumpsum", label: "Lump sum" },
];

export default function SipCalculator() {
  const [mode, setMode] = useState("sip");
  const [monthly, setMonthly] = useState("10000");
  const [lumpSum, setLumpSum] = useState("500000");
  const [stepUp, setStepUp] = useState("10");
  const [returnRate, setReturnRate] = useState("12");
  const [years, setYears] = useState("10");
  const [inflation, setInflation] = useState("6");
  const [goal, setGoal] = useState("2500000");
  const result = useMemo(() => calculateProjection({ mode, monthly, lumpSum, stepUp, returnRate, years, inflation }), [mode, monthly, lumpSum, stepUp, returnRate, years, inflation]);
  const target = positive(goal);
  const goalProgress = target ? Math.min(100, (result.futureValue / target) * 100) : 0;
  const requiredSip = target ? solveRequiredSip(target, positive(returnRate), wholeYears(years), mode === "stepup" ? positive(stepUp) : 0) : 0;

  return (
    <section className="sip-calculator panel">
      <header className="sip-head">
        <div><span><Calculator size={17} /> Investment calculator</span><h2>Plan a SIP or lump sum</h2><p>Estimate wealth, step-ups, inflation impact, and progress toward a goal.</p></div>
        <div className="sip-mode-tabs">{modes.map((item) => <button type="button" key={item.id} className={mode === item.id ? "active" : ""} onClick={() => setMode(item.id)}>{item.label}</button>)}</div>
      </header>

      <div className="sip-layout">
        <div className="sip-inputs">
          {mode === "lumpsum" ? <NumberField label="Initial investment" prefix="INR" value={lumpSum} onChange={setLumpSum} min="1000" step="1000" /> : <NumberField label="Monthly investment" prefix="INR" value={monthly} onChange={setMonthly} min="500" step="500" />}
          {mode === "stepup" ? <NumberField label="Annual SIP increase" suffix="%" value={stepUp} onChange={setStepUp} min="0" max="100" step="1" /> : null}
          <NumberField label="Expected annual return" suffix="%" value={returnRate} onChange={setReturnRate} min="0" max="50" step="0.5" />
          <NumberField label="Investment period" suffix="years" value={years} onChange={setYears} min="1" max="50" step="1" />
          <NumberField label="Expected inflation" suffix="%" value={inflation} onChange={setInflation} min="0" max="20" step="0.5" />
          <NumberField label="Target amount" prefix="INR" value={goal} onChange={setGoal} min="0" step="10000" />
        </div>

        <div className="sip-results">
          <div className="sip-result-grid">
            <Result label="Future value" value={money(result.futureValue)} tone="gain" />
            <Result label="Amount invested" value={money(result.invested)} />
            <Result label="Estimated gains" value={money(result.gains)} tone="gain" />
            <Result label="Today's purchasing power" value={money(result.realValue)} />
          </div>
          <div className="sip-allocation" aria-label="Invested amount and estimated gains">
            <span style={{ width: `${result.futureValue ? (result.invested / result.futureValue) * 100 : 0}%` }} />
          </div>
          <div className="sip-goal">
            <div><Target size={17} /><span><strong>{target ? `${format(goalProgress)}% of goal` : "Set a goal"}</strong><small>{target ? `${money(Math.max(0, target - result.futureValue))} remaining` : "Enter a target amount to compare the plan."}</small></span></div>
            <div className="sip-goal-track"><i style={{ width: `${goalProgress}%` }} /></div>
            {target && mode !== "lumpsum" ? <p>Required starting SIP for this goal: <strong>{money(requiredSip)}/month</strong>{mode === "stepup" ? ` with ${format(positive(stepUp))}% annual step-up` : ""}</p> : null}
          </div>
        </div>
      </div>

      <details className="sip-projection">
        <summary><TrendingUp size={16} /> Year-by-year projection</summary>
        <div className="sip-table"><div className="sip-table-head"><span>Year</span><span>Invested</span><span>Gains</span><span>Value</span></div>{result.rows.map((row) => <div key={row.year}><span>{row.year}</span><span>{money(row.invested)}</span><span className="gain">{money(row.value - row.invested)}</span><strong>{money(row.value)}</strong></div>)}</div>
      </details>
      <p className="sip-note">Illustrative calculation using monthly compounding. Returns are assumed and are not guaranteed; taxes, fees, and market volatility are not included.</p>
    </section>
  );
}

function NumberField({ label, prefix, suffix, value, onChange, ...inputProps }) {
  return <label className="sip-field"><span>{label}</span><div>{prefix ? <em>{prefix}</em> : null}<input type="number" value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} />{suffix ? <em>{suffix}</em> : null}</div></label>;
}

function Result({ label, value, tone = "" }) {
  return <article><span>{label}</span><strong className={tone}>{value}</strong></article>;
}

function calculateProjection(input) {
  const years = wholeYears(input.years);
  const months = years * 12;
  const monthlyRate = positive(input.returnRate) / 1200;
  const inflationRate = positive(input.inflation) / 100;
  let contribution = positive(input.monthly);
  let invested = input.mode === "lumpsum" ? positive(input.lumpSum) : 0;
  let value = invested;
  const rows = [];
  for (let month = 1; month <= months; month += 1) {
    value *= 1 + monthlyRate;
    if (input.mode !== "lumpsum") {
      value += contribution;
      invested += contribution;
    }
    if (month % 12 === 0) {
      rows.push({ year: month / 12, invested, value });
      if (input.mode === "stepup") contribution *= 1 + positive(input.stepUp) / 100;
    }
  }
  return { invested, futureValue: value, gains: value - invested, realValue: value / ((1 + inflationRate) ** years), rows };
}

function solveRequiredSip(target, returnRate, years, stepUp) {
  let low = 0;
  let high = target;
  for (let iteration = 0; iteration < 50; iteration += 1) {
    const middle = (low + high) / 2;
    const value = calculateProjection({ mode: stepUp ? "stepup" : "sip", monthly: middle, stepUp, returnRate, years, inflation: 0 }).futureValue;
    if (value < target) low = middle; else high = middle;
  }
  return high;
}

function positive(value) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }
function wholeYears(value) { return Math.max(1, Math.min(50, Math.round(positive(value) || 1))); }
function format(value) { return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0)); }

export const sipCalculatorUtils = { calculateProjection, solveRequiredSip };
