import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Camera,
  ChevronLeft,
  ChevronRight,
  Coins,
  Edit3,
  LineChart,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { clearAuthSession, loginUser, registerUser, restoreAuthSession } from "./services/apiClient";
import { AssetForm, DividendForm, SaleForm, TransactionForm } from "./components/FinanceForms";
import SipCalculator from "./components/SipCalculator";
import { InsiderTradesPage } from "./components/MarketDetailPages";
import { ConfirmModal, FormModal, FullViewModal } from "./components/Modals";
import PortfolioSnapshots from "./components/PortfolioSnapshots";
import AdminDashboard from "./components/AdminDashboard";
import {
  addDividend,
  addHolding,
  backfillPortfolioSnapshots,
  deleteTransaction,
  getAnalyticsFeature,
  getFinanceOverview,
  getHeldStockOptions,
  getHoldingsFeature,
  getLedgerFeature,
  getProfitFeature,
  getPortfolioSnapshots,
  sellHolding,
  syncFinanceQuotes,
  updateTransaction,
  updatePortfolioSnapshot,
} from "./services/financeStore";

const today = new Date().toISOString().slice(0, 10);
const emptyAsset = {
  stockName: "",
  symbol: "",
  exchange: "NSE",
  purchaseDate: today,
  quantity: "",
  averagePrice: "",
  charges: "",
  sector: "",
  notes: "",
};
const emptySale = { sellDate: today, quantity: "", sellPrice: "", charges: "", notes: "" };
const emptyDividend = { assetId: "", dividendDate: today, amount: "", notes: "" };
const emptyTransaction = { assetId: "", sector: "", transactionDate: today, transactionType: "buy", quantity: "", price: "", charges: "", notes: "" };
const emptyAnalyticsRange = { startDate: "", endDate: "" };
const exchangeOptions = ["NSE", "BSE", "BOM", "MUTF_IN"];
const analyticsPath = "/anlytics";
const insiderTradesPath = "/insider-trades";
const sipCalculatorPath = "/sip-calculator";
const snapshotsPath = "/snapshots";
const adminPath = "/admin";
const allocationSortOptions = [
  { value: "valueDesc", label: "Value high to low" },
  { value: "valueAsc", label: "Value low to high" },
  { value: "returnDesc", label: "Return high to low" },
  { value: "returnAsc", label: "Return low to high" },
  { value: "nameAsc", label: "Name A to Z" },
];
const sectorSortOptions = [
  { value: "weightDesc", label: "Weight high to low" },
  { value: "weightAsc", label: "Weight low to high" },
  { value: "countDesc", label: "Most holdings first" },
  { value: "nameAsc", label: "Sector A to Z" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [overview, setOverview] = useState(emptyOverview());
  const [analyticsData, setAnalyticsData] = useState(null);
  const [holdingsData, setHoldingsData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [ledgerData, setLedgerData] = useState({ rows: [], assets: [], page: 1, pageSize: 12, total: 0 });
  const [snapshotData, setSnapshotData] = useState(null);
  const [modal, setModal] = useState(routeModal);
  const [message, setMessage] = useState("Restoring session...");
  const [busy, setBusy] = useState(false);
  const [featureBusy, setFeatureBusy] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [dividendForm, setDividendForm] = useState(emptyDividend);
  const [heldAssets, setHeldAssets] = useState([]);
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [selling, setSelling] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(null);
  const [showHealthBreakdown, setShowHealthBreakdown] = useState(false);
  const [holdingSearch, setHoldingSearch] = useState("");
  const [appliedHoldingSearch, setAppliedHoldingSearch] = useState("");
  const [holdingStatus, setHoldingStatus] = useState("open");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [appliedLedgerSearch, setAppliedLedgerSearch] = useState("");
  const [holdingPage, setHoldingPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [snapshotType, setSnapshotType] = useState("all");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("1y");
  const [analyticsRange, setAnalyticsRange] = useState(emptyAnalyticsRange);
  const [addDividendMode, setAddDividendMode] = useState(false);
  const [holdingSort, setHoldingSort] = useState("valueDesc");
  const [ledgerSort, setLedgerSort] = useState("dateDesc");

  useEffect(() => {
    restoreAuthSession()
      .then((restored) => {
        setUser(restored);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    function handlePopState() {
      setModal(routeModal());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (user) loadOverview();
  }, [user]);

  useEffect(() => {
    if (!message || message === "Restoring session...") return undefined;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (user && modal === "analytics" && !analyticsData && !featureBusy) loadAnalytics(analyticsPeriod, analyticsRange);
  }, [user, modal, analyticsData, featureBusy, analyticsPeriod, analyticsRange]);

  useEffect(() => {
    if (modal === "ledger") loadLedger(ledgerPage, appliedLedgerSearch, ledgerSort);
  }, [modal, ledgerPage, appliedLedgerSearch, ledgerSort]);

  useEffect(() => {
    if (modal === "investments") loadHoldings(holdingPage, appliedHoldingSearch, holdingStatus, holdingSort);
  }, [modal, holdingPage, appliedHoldingSearch, holdingStatus, holdingSort]);

  useEffect(() => {
    if (user && modal === "snapshots") loadSnapshots(snapshotPage, snapshotType);
  }, [user, modal, snapshotPage, snapshotType]);

  const holdings = holdingsData?.holdings || [];
  const sortedHoldings = sortHoldings(holdings, holdingSort);
  const sortedLedgerData = { ...ledgerData, rows: sortLedgerRows(ledgerData.rows || [], ledgerSort) };

  async function loadOverview() {
    setBusy(true);
    try {
      setOverview(await getFinanceOverview());
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncMarketData() {
    setBusy(true);
    try {
      const result = await syncFinanceQuotes();
      await loadOverview();
      if (modal === "investments") await loadHoldings(holdingPage, appliedHoldingSearch, holdingStatus);
      if (modal === "analytics") await loadAnalytics(analyticsPeriod, analyticsRange);
      if (modal === "profit") setProfitData(await getProfitFeature());
      const failures = result.failures || [];
      setMessage(`Synced ${result.updated || 0} of ${result.checked || 0} market prices${result.skipped ? `, skipped ${result.skipped} options` : ""}.${failures.length ? ` Failed: ${failures.map((row) => `${row.symbol} (${row.error})`).join("; ")}` : ""}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadHoldings(page = 1, search = appliedHoldingSearch, status = holdingStatus, sort = holdingSort) {
    setFeatureBusy(true);
    try {
      setHoldingsData(await getHoldingsFeature({ page, pageSize: 6, search, status, sort }));
      setHoldingPage(page);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  async function openFeature(nextModal) {
    if (nextModal === "analytics") setRoutePath(analyticsPath);
    setModal(nextModal);
    setFeatureBusy(true);
    try {
      if (nextModal === "investments") setHoldingPage(1);
      if (nextModal === "analytics") setAnalyticsData(await getAnalyticsFeature({ period: analyticsPeriod, ...analyticsRange }));
      if (nextModal === "profit") setProfitData(await getProfitFeature());
      if (nextModal === "ledger") await loadLedger(1, appliedLedgerSearch);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  function closeAnalyticsPage() {
    setRoutePath("/");
    setModal("");
  }

  function openMarketPage(path, nextModal) {
    setRoutePath(path);
    setModal(nextModal);
  }

  function closeMarketPage() {
    setRoutePath("/");
    setModal("");
  }

  function openSipCalculator() {
    setRoutePath(sipCalculatorPath);
    setModal("sip-calculator");
  }

  async function loadLedger(page = 1, search = ledgerSearch, sort = ledgerSort) {
    setFeatureBusy(true);
    try {
      setLedgerData(await getLedgerFeature({ page, pageSize: 12, search, sort }));
      setLedgerPage(page);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  async function loadAnalytics(period = analyticsPeriod, range = analyticsRange) {
    setFeatureBusy(true);
    try {
      setAnalyticsData(await getAnalyticsFeature({ period, ...range }));
      setAnalyticsPeriod(period);
      setAnalyticsRange(range);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  async function loadSnapshots(page = snapshotPage, type = snapshotType) {
    setFeatureBusy(true);
    try {
      setSnapshotData(await getPortfolioSnapshots({ page, pageSize: 9, type }));
      setSnapshotPage(page);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  async function saveSnapshot(snapshot) {
    setFeatureBusy(true);
    try { await updatePortfolioSnapshot(snapshot.id, snapshot); await loadSnapshots(snapshotPage, snapshotType); setMessage("Portfolio snapshot updated."); }
    catch (error) { setMessage(error.message); throw error; }
    finally { setFeatureBusy(false); }
  }

  async function backfillSnapshots() {
    setFeatureBusy(true);
    try {
      const result = await backfillPortfolioSnapshots();
      await loadSnapshots(1, snapshotType);
      const failureText = result.failed?.length ? ` ${result.failed.length} period(s) could not be valued; check the response/log for unavailable symbols.` : "";
      setMessage(`Created ${result.created || 0} historical snapshots; ${result.skipped || 0} existing snapshots kept.${failureText}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  function openSnapshots() {
    setRoutePath(snapshotsPath);
    setModal("snapshots");
  }

  function changeSnapshotType(type) {
    setSnapshotType(type);
    setSnapshotPage(1);
  }

  async function openAddInvestmentModal() {
    setModal("add");
    setAddDividendMode(false);
    setFeatureBusy(true);
    try {
      const payload = await getHeldStockOptions();
      setHeldAssets(payload.assets || []);
      setDividendForm((current) => ({
        ...current,
        assetId: current.assetId || payload.assets?.[0]?.id || "",
      }));
      setMessage("");
    } catch (error) {
      setHeldAssets([]);
      setMessage(error.message);
    } finally {
      setFeatureBusy(false);
    }
  }

  function submitLedgerSearch() {
    const nextSearch = ledgerSearch.trim();
    setLedgerPage(1);
    setAppliedLedgerSearch(nextSearch);
    if (ledgerPage === 1 && appliedLedgerSearch === nextSearch) loadLedger(1, nextSearch);
  }

  function submitHoldingSearch() {
    const nextSearch = holdingSearch.trim();
    setHoldingPage(1);
    setAppliedHoldingSearch(nextSearch);
    if (holdingPage === 1 && appliedHoldingSearch === nextSearch) loadHoldings(1, nextSearch, holdingStatus);
  }

  function clearHoldingSearch() {
    setHoldingSearch("");
    setHoldingPage(1);
    setAppliedHoldingSearch("");
  }

  async function clearLedgerSearch() {
    setLedgerSearch("");
    setLedgerPage(1);
    setAppliedLedgerSearch("");
  }

  function changeHoldingSort(nextSort) {
    setHoldingSort(nextSort);
    setHoldingPage(1);
  }

  function changeLedgerSort(nextSort) {
    setLedgerSort(nextSort);
    setLedgerPage(1);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const next = authMode === "login"
        ? await loginUser(credentials.username, credentials.password)
        : await registerUser(credentials.username, credentials.password);
      setUser(next);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function afterMutation() {
    await loadOverview();
    if (modal === "investments") await loadHoldings(holdingPage, appliedHoldingSearch, holdingStatus);
    if (modal === "analytics") await loadAnalytics(analyticsPeriod, analyticsRange);
    if (modal === "profit") setProfitData(await getProfitFeature());
    if (modal === "ledger") await loadLedger(ledgerPage, appliedLedgerSearch);
  }

  async function saveAsset(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...assetForm,
        quantity: Number(assetForm.quantity),
        averagePrice: Number(assetForm.averagePrice),
        charges: Number(assetForm.charges || 0),
      };
      await addHolding(payload);
      setAssetForm(emptyAsset);
      setModal("");
      await afterMutation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSale(event) {
    event.preventDefault();
    if (!selling) return;
    setBusy(true);
    try {
      await sellHolding(selling.id, {
        ...saleForm,
        quantity: Number(saleForm.quantity),
        sellPrice: Number(saleForm.sellPrice),
        charges: Number(saleForm.charges || 0),
      });
      setSelling(null);
      setSaleForm(emptySale);
      await afterMutation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDividend(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await addDividend({
        ...dividendForm,
        amount: Number(dividendForm.amount),
      });
      setDividendForm(emptyDividend);
      setAddDividendMode(false);
      setModal("");
      await afterMutation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveTransaction(event) {
    event.preventDefault();
    if (!editingTransaction) return;
    setBusy(true);
    try {
      await updateTransaction(editingTransaction.id, {
        ...transactionForm,
        quantity: Number(transactionForm.quantity || 0),
        price: Number(transactionForm.price || 0),
        charges: Number(transactionForm.charges || 0),
      });
      setEditingTransaction(null);
      setTransactionForm(emptyTransaction);
      await afterMutation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteTransaction() {
    if (!deletingTransaction) return;
    setBusy(true);
    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
      await afterMutation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function startSale(holding) {
    setSelling(holding);
    setSaleForm({
      sellDate: today,
      quantity: String(holding.quantity || ""),
      sellPrice: String(holding.currentPrice || holding.averagePrice || ""),
      charges: "",
      notes: "",
    });
  }

  function startEditTransaction(row) {
    setEditingTransaction(row);
    setTransactionForm({
      assetId: row.assetId,
      sector: row.sector || "",
      transactionDate: row.transactionDate || today,
      transactionType: row.transactionType || "buy",
      quantity: String(row.quantity ?? ""),
      price: String(row.price ?? ""),
      charges: row.charges ? String(row.charges) : "",
      notes: row.notes || "",
    });
  }

  function logout() {
    clearAuthSession();
    setUser(null);
    setOverview(emptyOverview());
    setHoldingsData(null);
  }

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-art">
          <div className="brand logo-brand"><img src="/daily-finance-logo.png" alt="" /> Finance OS</div>
          <h1>Simple tracking for investments, profit, and cash activity.</h1>
          <div className="preview-card">
            <span>Total portfolio</span>
            <strong>{money(1047747)}</strong>
            <i><b style={{ width: "72%" }} /></i>
            <small>Track what you own, what you sold, income received, and every transaction.</small>
          </div>
        </section>
        <section className="login-panel">
          <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
          <form onSubmit={handleAuth}>
            <input value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} placeholder="Username" required />
            <input value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} placeholder="Password" type="password" required />
            <button disabled={busy}>{authMode === "login" ? "Login" : "Register"}</button>
          </form>
          <button className="text-button" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? "Create a new account" : "Use existing account"}
          </button>
          {message ? <p className="notice">{message}</p> : null}
        </section>
      </main>
    );
  }

  if (modal === "analytics") {
    return (
      <main className="app-shell redesigned analytics-page-shell">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/daily-finance-logo.png" alt="" />
            <span>
              <strong>Finance OS</strong>
              <em>Performance and portfolio breakdown</em>
            </span>
          </div>
          <nav>
            <button className="ghost" onClick={syncMarketData} disabled={busy}><RefreshCw size={16} /> Sync</button>
            <button className="danger" onClick={logout}><LogOut size={16} /> Logout</button>
          </nav>
        </header>
        {message ? <div className="notice">{message}</div> : null}
        <section className="page-titlebar">
          <button className="ghost" type="button" onClick={closeAnalyticsPage}><ChevronLeft size={16} /> Back</button>
          <div>
            <h1>Analytics</h1>
            <p>Compare returns, review allocation, and inspect sector exposure.</p>
          </div>
          <div className="page-title-metrics">
            <span><small>Still invested</small><b>{money(overview.investedValue)}</b></span>
            <span><small>Open holdings</small><b>{overview.holdingCount}</b></span>
          </div>
        </section>
        <AnalyticsView data={analyticsData} period={analyticsPeriod} range={analyticsRange} setRange={setAnalyticsRange} busy={featureBusy} onPeriod={loadAnalytics} />
      </main>
    );
  }

  if (modal === "insiders") {
    return <InsiderTradesPage onBack={closeMarketPage} />;
  }

  if (modal === "sip-calculator") {
    return (
      <main className="app-shell redesigned sip-page-shell">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/daily-finance-logo.png" alt="" />
            <span><strong>Finance OS</strong><em>Investment growth projection</em></span>
          </div>
          <nav><button className="danger" onClick={logout}><LogOut size={16} /> Logout</button></nav>
        </header>
        <section className="page-titlebar">
          <button className="ghost" type="button" onClick={closeMarketPage}><ChevronLeft size={16} /> Back</button>
          <div><h1>SIP Calculator</h1><p>Combine an initial investment with a monthly SIP and project its growth.</p></div>
        </section>
        <SipCalculator />
      </main>
    );
  }

  if (modal === "snapshots") {
    return (
      <main className="app-shell redesigned snapshot-page-shell">
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/daily-finance-logo.png" alt="" />
            <span><strong>Finance OS</strong><em>Portfolio history and scheduled checkpoints</em></span>
          </div>
          <nav><button className="danger" onClick={logout}><LogOut size={16} /> Logout</button></nav>
        </header>
        {message ? <div className="notice">{message}</div> : null}
        <section className="page-titlebar snapshot-titlebar">
          <button className="ghost" type="button" onClick={closeMarketPage}><ChevronLeft size={16} /> Back</button>
          <div><h1>Portfolio snapshots</h1><p>Daily, weekly, monthly, and fiscal-year records captured automatically at 6:00 AM.</p></div>
          <div className="page-title-metrics">
            <span><small>Saved records</small><b>{snapshotData?.total || 0}</b></span>
            <span><small>Schedule</small><b>6:00 AM IST</b></span>
          </div>
        </section>
        <PortfolioSnapshots data={snapshotData} type={snapshotType} busy={featureBusy} onType={changeSnapshotType} onPage={setSnapshotPage} onEdit={saveSnapshot} onBackfill={backfillSnapshots} />
      </main>
    );
  }

  if (modal === "admin" && user.isAdmin) {
    return <main className="app-shell redesigned admin-page-shell"><header className="topbar"><div className="topbar-brand"><img src="/daily-finance-logo.png" alt="" /><span><strong>Finance OS Admin</strong><em>Operations, observability, and automation</em></span></div><nav><button className="danger" onClick={logout}><LogOut size={16} /> Logout</button></nav></header><section className="page-titlebar admin-titlebar"><button className="ghost" onClick={closeMarketPage}><ChevronLeft size={16} /> Back</button><div><h1>Administration</h1><p>A dedicated control room for API logs, failures, schedules, and batch runs.</p></div></section><AdminDashboard /></main>;
  }

  return (
    <main className="app-shell redesigned">
      <header className="topbar">
        <div className="topbar-brand">
          <img src="/daily-finance-logo.png" alt="" />
          <span>
            <strong>Finance OS</strong>
            <em>Investments, profit, income, and history</em>
          </span>
        </div>
        <nav>
          <button className="ghost" onClick={syncMarketData} disabled={busy}><RefreshCw size={16} /> Sync</button>
          <button className="danger" onClick={logout}><LogOut size={16} /> Logout</button>
        </nav>
      </header>

      {message ? <div className="notice">{message}</div> : null}

      <section className="hero-band">
        <div>
          <span>Portfolio</span>
          <h1>{money(overview.currentValue)}</h1>
          <p>{overview.holdingCount} open positions, {overview.soldCount} closed trades, total return {num(overview.profitPercent)}%</p>
        </div>
        <div className="hero-actions">
          {user.isAdmin ? <button className="ghost" onClick={() => openMarketPage(adminPath, "admin")}><ServerCog size={17} /> Admin</button> : null}
          {/* {user.isAdmin ? <button className="ghost" onClick={() => setModal("batches")}><ServerCog size={17} /> Batch Operations</button> : null} */}
          <button className="ghost" onClick={openSipCalculator}><Calculator size={17} /> SIP Calculator</button>
          <button className="ghost" onClick={() => openFeature("analytics")}><LineChart size={17} /> Analytics</button>
          <button className="ghost" onClick={openSnapshots}><Camera size={17} /> Snapshots</button>
          {/* <button className="ghost" onClick={() => openMarketPage(insiderTradesPath, "insiders")}>Insider trades</button> */}
          <button className="ghost" onClick={() => openFeature("ledger")}>Transactions</button>
          <button onClick={openAddInvestmentModal}><Plus size={17} /> Add investment</button>
        </div>
      </section>

      <section className="kpi-grid">
        <Kpi icon={WalletCards} label="Current value" value={money(overview.currentValue)} detail={`${overview.holdingCount} open holdings`} onOpen={() => setModal("portfolio")} />
        <Kpi icon={Coins} label="Still invested" value={money(overview.investedValue)} detail="Cost left in open holdings" onOpen={() => openFeature("investments")} />
        <Kpi icon={overview.totalProfit >= 0 ? TrendingUp : TrendingDown} label="Total profit/loss" value={money(overview.totalProfit)} detail="Actual profit after charges" tone={overview.totalProfit >= 0 ? "good" : "bad"} onOpen={() => openFeature("profit")} />
        <FiscalYearKpi overview={overview} />
      </section>

      <DashboardOverview overview={overview} onHealthDetails={() => setShowHealthBreakdown(true)} />

      {modal === "add" ? (
        <FormModal title="Add investment" detail={addDividendMode ? "Record dividend income for an open holding." : "Record a buy. If the symbol already exists, it adds another buy lot."} onClose={() => { setModal(""); setAddDividendMode(false); }}>
          <div className="mode-toggle">
            <label>
              <input type="checkbox" checked={addDividendMode} onChange={(event) => setAddDividendMode(event.target.checked)} />
              <i aria-hidden="true" />
              <span>Dividend entry</span>
            </label>
          </div>
          {addDividendMode ? (
            featureBusy ? <div className="empty">Loading held stocks...</div> : (
              <DividendForm
                form={dividendForm}
                setForm={setDividendForm}
                assets={heldAssets}
                onSubmit={saveDividend}
                onCancel={() => { setModal(""); setDividendForm(emptyDividend); setAddDividendMode(false); }}
                busy={busy}
              />
            )
          ) : (
            <AssetForm form={assetForm} setForm={setAssetForm} onSubmit={saveAsset} busy={busy} exchangeOptions={exchangeOptions} />
          )}
        </FormModal>
      ) : null}

      {modal === "investments" ? (
        <FullViewModal title="Investments" detail="Current positions and completed sell trades in your portfolio." onClose={() => setModal("")}>
          <div className="status-tabs" role="tablist" aria-label="Investment status">
            {["open", "sold", "all"].map((status) => (
              <button
                key={status}
                className={holdingStatus === status ? "active" : ""}
                type="button"
                onClick={() => { setHoldingStatus(status); setHoldingPage(1); }}
              >
                {status === "open" ? "Open Positions" : status === "sold" ? "Closed Trades" : "All"}
              </button>
            ))}
          </div>
          <SearchToolbar
            label="Search investments"
            value={holdingSearch}
            onChange={setHoldingSearch}
            onSubmit={submitHoldingSearch}
            onClear={clearHoldingSearch}
            placeholder="Search by name, symbol, sector, or status"
            resultText={`${holdingsData?.total || 0} ${holdingStatus === "sold" ? "closed trades" : holdingStatus === "open" ? "open positions" : "investments"}${appliedHoldingSearch ? ` for "${appliedHoldingSearch}"` : ""}`}
            submitLabel="Search"
          />
          {featureBusy ? <div className="empty">Loading holdings...</div> : (
            <>
              <Holdings
                holdings={sortedHoldings}
                title={holdingStatus === "open" ? "Open positions" : holdingStatus === "sold" ? "Closed trades" : "All investments"}
                sort={holdingSort}
                onSort={changeHoldingSort}
                page={holdingPage}
                pageSize={holdingsData?.pageSize || 6}
                total={holdingsData?.total || 0}
                onPage={setHoldingPage}
                onSell={startSale}
                allowSell={holdingStatus !== "sold"}
              />
            </>
          )}
        </FullViewModal>
      ) : null}

      {modal === "portfolio" ? (
        <FullViewModal title="Portfolio summary" detail="How your current value, invested amount, profit, and return are calculated." onClose={() => setModal("")}>
          <PortfolioSummary overview={overview} />
        </FullViewModal>
      ) : null}

      {modal === "profit" ? (
        <FullViewModal title="Profit details" detail="Open position gains, closed trade gains, and dividends." onClose={() => setModal("")}>
          {featureBusy || !profitData ? <div className="empty">Loading profit...</div> : <ProfitView data={profitData} />}
        </FullViewModal>
      ) : null}

      {modal === "ledger" ? (
        <FullViewModal title="Transaction history" detail="Every buy, sell, dividend, and fee entry." onClose={() => setModal("")}>
          <SearchToolbar
            label="Search ledger"
            value={ledgerSearch}
            onChange={setLedgerSearch}
            onSubmit={submitLedgerSearch}
            onClear={clearLedgerSearch}
            placeholder="Search asset, symbol, type, date, or amount"
            resultText={`${ledgerData.total || 0} transactions${appliedLedgerSearch ? ` for "${appliedLedgerSearch}"` : ""}`}
            submitLabel="Search"
          />
          {featureBusy ? <div className="empty">Loading ledger...</div> : (
            <Ledger data={sortedLedgerData} sort={ledgerSort} onSort={changeLedgerSort} page={ledgerPage} onPage={setLedgerPage} onEdit={startEditTransaction} onDelete={setDeletingTransaction} />
          )}
        </FullViewModal>
      ) : null}

      {selling ? (
        <FormModal title={`Sell ${selling.symbol}`} detail="Record shares or units you sold." onClose={() => setSelling(null)}>
          <SaleForm form={saleForm} setForm={setSaleForm} onSubmit={saveSale} onCancel={() => setSelling(null)} busy={busy} maxQuantity={selling.quantity} />
        </FormModal>
      ) : null}

      {editingTransaction ? (
        <FormModal title="Edit transaction" detail="Update this buy, sell, dividend, or fee entry." onClose={() => { setEditingTransaction(null); setTransactionForm(emptyTransaction); }}>
          <TransactionForm
            form={transactionForm}
            setForm={setTransactionForm}
            assets={currentTransactionAsset(editingTransaction)}
            onSubmit={saveTransaction}
            onCancel={() => { setEditingTransaction(null); setTransactionForm(emptyTransaction); }}
            busy={busy}
          />
        </FormModal>
      ) : null}

      {deletingTransaction ? (
        <ConfirmModal title="Delete transaction" detail={`${deletingTransaction.transactionDate} - ${deletingTransaction.transactionType}`} busy={busy} confirmLabel="Delete" onConfirm={confirmDeleteTransaction} onClose={() => setDeletingTransaction(null)} />
      ) : null}

      {showHealthBreakdown ? (
        <FormModal title="Portfolio score" detail="Why your score is high or low right now." onClose={() => setShowHealthBreakdown(false)}>
          <HealthBreakdown overview={overview} />
        </FormModal>
      ) : null}
    </main>
  );
}

function Kpi({ icon: Icon, label, value, detail, tone = "", onOpen }) {
  const content = (
    <>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </>
  );
  if (!onOpen) return <div className={`kpi static-kpi ${tone}`}>{content}</div>;
  return (
    <button className={`kpi ${tone}`} type="button" onClick={onOpen}>
      {content}
    </button>
  );
}

function FiscalYearKpi({ overview }) {
  const tone = overview.thisFyProfit >= 0 ? "good" : "bad";
  const Icon = overview.thisFyProfit >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className={`kpi static-kpi fiscal-kpi ${tone}`}>
      <div className="fiscal-kpi-head">
        <Icon size={20} />
        <span>This FY</span>
        <small>{fiscalYearLabel(overview.fiscalYearStart)}</small>
      </div>
      <div className="fiscal-kpi-values">
        <div><small>Profit</small><strong>{money(overview.thisFyProfit)}</strong></div>
        <div><small>Return</small><strong>{formatPercent(overview.thisFyReturn)}</strong></div>
      </div>
    </div>
  );
}

function DashboardOverview({ overview, onHealthDetails }) {
  const healthScore = portfolioHealthScore(overview);
  const profitTone = overview.totalProfit >= 0 ? "gain" : "loss";

  return (
    <section className="dashboard-grid" aria-label="Portfolio dashboard">
      <article className="dashboard-card dashboard-card-wide">
        <div className="dashboard-copy">
          <span>Portfolio score</span>
          <h2>{healthScore.label}</h2>
          <p>A quick score based on return, open tracking, and diversification.</p>
          <div className="metric-strip">
            <small>Total return <b className={profitTone}>{num(overview.profitPercent)}%</b></small>
            <small>Open profit/loss <b className={overview.unrealizedProfit >= 0 ? "gain" : "loss"}>{money(overview.unrealizedProfit)}</b></small>
            <small>Closed profit/loss <b className={overview.realizedProfit >= 0 ? "gain" : "loss"}>{money(overview.realizedProfit)}</b></small>
          </div>
        </div>
        <button className="health-button" type="button" onClick={onHealthDetails} aria-label={`Portfolio score ${num(healthScore.score)}. View details`}>
          <HealthGauge score={healthScore.score} tone={healthScore.tone} />
        </button>
      </article>

      <TotalPerformanceCard overview={overview} />
    </section>
  );
}

function TotalPerformanceCard({ overview }) {
  const positive = overview.totalProfit >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const tone = positive ? "gain" : "loss";
  return (
    <article className={`dashboard-card total-performance-card ${positive ? "positive" : "negative"}`}>
      <div className="performance-card-head">
        <span>All-time performance</span>
        <i><Icon size={18} /></i>
      </div>
      <div className="performance-profit">
        <small>Total profit</small>
        <strong className={tone}>{money(overview.totalProfit)}</strong>
        <p>Net result after brokerage, charges, dividends, and closed trades.</p>
      </div>
      <div className="performance-return">
        <span><small>Total return</small><b className={tone}>{formatPercent(overview.profitPercent)}</b></span>
        <span><small>Realized</small><b className={overview.realizedProfit >= 0 ? "gain" : "loss"}>{money(overview.realizedProfit)}</b></span>
      </div>
    </article>
  );
}

function HealthBreakdown({ overview }) {
  const health = portfolioHealthScore(overview);
  return (
    <div className="score-breakdown">
      <div className="score-hero">
        <HealthGauge score={health.score} tone={health.tone} />
        <div>
          <span>{health.label}</span>
          <strong>{num(health.score)} / 100</strong>
          <p>{health.description}</p>
        </div>
      </div>
      <div className="score-rows">
        {health.parts.map((part) => (
          <div key={part.label}>
            <span><b>{part.label}</b><em>{part.detail}</em></span>
            <i><b style={{ width: `${Math.min(100, (part.points / part.max) * 100)}%` }} /></i>
            <strong>{num(part.points)} / {part.max}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthGauge({ score, tone }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className={`health-gauge ${tone}`}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`Portfolio health ${score}`}>
        <circle cx="60" cy="60" r={radius} />
        <circle cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <strong>{num(score)}</strong>
      <span>Score</span>
    </div>
  );
}

function MiniDonut({ rows }) {
  const total = rows.reduce((sumValue, row) => sumValue + row.value, 0);
  let start = 0;
  if (!rows.length || total <= 0) return <div className="empty compact-empty">No capital data.</div>;
  return (
    <div className="mini-donut-layout">
      <svg className="mini-donut" viewBox="0 0 120 120" role="img" aria-label="Capital mix chart">
        {rows.map((row) => {
          const angle = (row.value / total) * 360;
          const path = describeSlice(60, 60, 46, start, start + angle);
          start += angle;
          return <path key={row.label} d={path} fill={row.color} />;
        })}
        <circle cx="60" cy="60" r="29" fill="#fff" />
      </svg>
      <div className="mini-legend">
        {rows.map((row) => (
          <span key={row.label}>
            <i style={{ background: row.color }} />
            <b>{row.label}</b>
            <em>{num((row.value / total) * 100)}%</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function Holdings({ holdings, title, sort, onSort, page, pageSize = 6, total = holdings.length, onPage, onSell, allowSell }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  return (
    <section className="modal-section">
      <div className="section-head"><h3>{title}</h3><span>{total}</span></div>
      {holdings.length ? (
        <div className="holding-stack">
          <div className="holding holding-header">
            <SortHeader label="Investment" field="name" sort={sort} onSort={onSort} defaultDirection="Asc" />
            <span>Units</span>
            <span>Avg buy</span>
            <span>Cost / avg sell</span>
            <SortHeader label="Value" field="value" sort={sort} onSort={onSort} />
            <SortHeader label="Return / P/L" field="return" sort={sort} onSort={onSort} />
            <span>{allowSell ? "Actions" : "Sell date"}</span>
          </div>
          {holdings.map((holding) => (
            <article key={holding.id} className={holding.status === "sold" ? "holding sold" : "holding"}>
              <div className="asset-cell">
                <i>{holding.symbol.slice(0, 2)}</i>
                <span><strong>{holding.stockName}</strong><em>{holding.symbol}:{holding.exchange}</em></span>
              </div>
              <div><small>{holding.status === "sold" ? "Sold units" : "Units held"}</small><b>{num(holding.status === "sold" ? holding.soldQuantity : holding.quantity)}</b></div>
              <div><small>Average buy price</small><b>{money(holding.averagePrice)}</b></div>
              <div><small>{holding.status === "sold" ? "Average sell price" : "Money invested"}</small><b>{holding.status === "sold" ? money(holding.averageSellPrice) : money(holding.investedValue)}</b></div>
              <div><small>{holding.status === "sold" ? "Money received" : "Current value"}</small><b>{holding.status === "sold" ? money(holding.sellValue) : money(holding.currentValue)}</b></div>
              <div className={holding.status === "sold" ? (holding.realizedProfit >= 0 ? "gain" : "loss") : (holding.profitLoss >= 0 ? "gain" : "loss")}><small>{holding.status === "sold" ? "Closed profit/loss" : "Open return"}</small><b>{holding.status === "sold" ? money(holding.realizedProfit) : `${num(holding.profitLossPercent)}%`}</b></div>
              <div className="row-actions">
                {allowSell && holding.status !== "sold" ? <button onClick={() => onSell(holding)}>Sell</button> : <span>{holding.sellDate || "-"}</span>}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="empty compact-empty">No records.</div>}
      {total > pageSize ? <Pager page={currentPage} pageCount={pageCount} onPage={onPage} /> : null}
    </section>
  );
}

function AnalyticsView({ data, period, range, setRange, busy, onPeriod }) {
  const periods = ["1w", "1mo", "3mo", "6mo", "1y", "2y", "5y"];
  const periodLabels = { "1w": "Week", "1mo": "Month", "3mo": "3M", "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y" };
  const [selectedSector, setSelectedSector] = useState("");
  const [sectorDetail, setSectorDetail] = useState(null);
  const [allocationSort, setAllocationSort] = useState("valueDesc");
  const [sectorSort, setSectorSort] = useState("weightDesc");
  const [sectorHoldingSort, setSectorHoldingSort] = useState("valueDesc");
  if (busy && !data) return <div className="empty">Loading analytics...</div>;
  if (!data) return <div className="empty">No analytics available.</div>;
  const summary = data.summary || {};
  const benchmark = data.performance?.benchmark || {};
  const returnTone = summary.profitPercent == null ? "" : summary.profitPercent >= 0 ? "gain" : "loss";
  const allocationRows = sortAllocationRows(data.allocation || [], allocationSort);
  const sectorRows = sortSectorRows(data.sectors || [], sectorSort);
  const activeSector = sectorRows.find((row) => row.label === selectedSector) || sectorRows[0];
  const customReady = range.startDate && range.endDate && range.startDate <= range.endDate;
  return (
    <>
    <section className="analytics-screen compact-analytics">
      <div className="analytics-toolbar modal-analytics-toolbar">
        <div className="segmented-control" role="tablist" aria-label="Analytics period">
          {periods.map((item) => (
            <button key={item} type="button" className={period === item ? "active" : ""} onClick={() => onPeriod(item, emptyAnalyticsRange)} disabled={busy}>
              {periodLabels[item]}
            </button>
          ))}
        </div>
        <div className="date-range-control">
          <input type="date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value })} />
          <input type="date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value })} />
          <button type="button" disabled={busy || !customReady} onClick={() => onPeriod("custom", range)}>Apply</button>
        </div>
        <div className={benchmark.unavailable ? "market-status" : "market-status good-status"}>
          <small>Nifty 50</small>
          <b>{benchmark.unavailable ? "Unavailable" : `${formatPercent(summary.niftyReturnPercent)} from ${benchmark.source || "market"}`}</b>
        </div>
      </div>

      <div className="analytics-kpis">
        <SummaryItem label={`${period === "custom" ? "Selected" : period.toUpperCase()} return`} value={formatPercent(summary.profitPercent)} tone={returnTone} />
        <SummaryItem label="Nifty 50 return" value={formatPercent(summary.niftyReturnPercent)} />
        <SummaryItem label="Better/worse than Nifty" value={formatPercent(summary.alphaPercent)} tone={(summary.alphaPercent || 0) >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Total profit change" value={summary.periodProfit == null ? "Unavailable" : money(summary.periodProfit)} tone={summary.periodProfit == null ? "" : summary.periodProfit >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Largest holding" value={`${num(summary.topHoldingWeight)}%`} />
      </div>

      <div className="analytics-grid">
        <Panel title="Your return vs Nifty 50" detail={`Comparison from ${data.periodStart || "period start"}`}>
          <AlphaBars bars={data.performance?.bars || []} />
        </Panel>
        <Panel title="Money movement" detail={`${data.periodStart || "Start"} to ${data.periodEnd || "Today"}`}>
          <FlowMatrix summary={summary} />
        </Panel>
        <Panel title="Where your money is invested" detail="Each open holding by current value">
          <ListTools compact>
            <SortControl label="Sort allocation" value={allocationSort} onChange={setAllocationSort} options={allocationSortOptions} />
          </ListTools>
          <AllocationPie rows={allocationRows} />
        </Panel>
        <Panel title="Sector breakdown" detail={`${summary.sectorCount || 0} sectors with open investments`}>
          <ListTools compact>
            <SortControl label="Sort sectors" value={sectorSort} onChange={setSectorSort} options={sectorSortOptions} />
          </ListTools>
          <SectorWorkspace
            rows={sectorRows}
            selected={activeSector?.label || ""}
            onSelect={setSelectedSector}
            onOpen={setSectorDetail}
          />
        </Panel>
      </div>
    </section>
    {sectorDetail ? (
      <FormModal title={sectorDetail.label} detail={`${sectorDetail.count || 0} open investments in this sector`} onClose={() => setSectorDetail(null)}>
        <SectorHoldings sector={sectorDetail} sort={sectorHoldingSort} onSort={setSectorHoldingSort} />
      </FormModal>
    ) : null}
    </>
  );
}

function FlowMatrix({ summary }) {
  const rows = [
    { label: "Money used to buy", value: money(summary.periodBuyValue), tone: "loss" },
    { label: "Money received from sells", value: money(summary.periodSellValue), tone: "gain" },
    { label: "Dividends received", value: money(summary.periodDividendValue), tone: "gain" },
    { label: "Profit at period start", value: summary.periodStartProfit == null ? "Unavailable" : money(summary.periodStartProfit), tone: summary.periodStartProfit == null ? "" : summary.periodStartProfit >= 0 ? "gain" : "loss" },
    { label: "Total profit change", value: summary.periodProfit == null ? "Unavailable" : money(summary.periodProfit), tone: summary.periodProfit == null ? "" : summary.periodProfit >= 0 ? "gain" : "loss" },
    { label: "Total return so far", value: formatPercent(summary.allTimeProfitPercent), tone: summary.allTimeProfitPercent >= 0 ? "gain" : "loss" },
  ];
  return (
    <div className="flow-matrix">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong className={row.tone}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AlphaBars({ bars }) {
  const cleanBars = bars.filter((bar) => bar.value != null && Number.isFinite(Number(bar.value)));
  const max = Math.max(1, ...cleanBars.map((bar) => Math.abs(Number(bar.value))));
  if (!cleanBars.length) return <div className="empty compact-empty">Benchmark data unavailable.</div>;
  return (
    <div className="alpha-bars">
      {cleanBars.map((bar) => {
        const value = Number(bar.value);
        return (
          <div key={bar.label} className="alpha-row">
            <span>{bar.label}</span>
            <i><b className={value >= 0 ? "gain-bg" : "loss-bg"} style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%` }} /></i>
            <strong className={value >= 0 ? "gain" : "loss"}>{num(value)}%</strong>
          </div>
        );
      })}
    </div>
  );
}

function AllocationPie({ rows }) {
  const colors = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#c2413b", "#0891b2", "#65a30d", "#9333ea", "#64748b"];
  const total = rows.reduce((sumValue, row) => sumValue + Number(row.value || 0), 0);
  let start = 0;
  if (!rows.length || total <= 0) return <div className="empty compact-empty">No allocation data.</div>;
  return (
    <div className="pie-layout">
      <svg className="pie-chart" viewBox="0 0 120 120" role="img" aria-label="Allocation pie chart">
        {rows.map((row, index) => {
          const angle = (Number(row.value || 0) / total) * 360;
          const path = describeSlice(60, 60, 46, start, start + angle);
          start += angle;
          return <path key={row.id || row.label} d={path} fill={colors[index % colors.length]} />;
        })}
        <circle cx="60" cy="60" r="25" fill="#fff" />
      </svg>
      <div className="chart-legend">
        {rows.map((row, index) => (
          <span key={row.id || row.label}>
            <i style={{ background: colors[index % colors.length] }} />
            <b>{row.symbol || row.label}</b>
            <em>{num(row.weight)}%</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function SectorWorkspace({ rows, selected, onSelect, onOpen }) {
  if (!rows.length) return <div className="empty compact-empty">No sector data.</div>;
  const active = rows.find((row) => row.label === selected) || rows[0];
  return (
    <div className="sector-workspace">
      <div className="sector-tile-grid">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className={selected === row.label ? "sector-tile active" : "sector-tile"}
            onClick={() => { onSelect(row.label); onOpen(row); }}
          >
            <span>{row.label}</span>
            <b>{num(row.weight)}%</b>
            <em>{row.count} holdings</em>
          </button>
        ))}
      </div>
      <div className="sector-chart-panel">
        <div className="sector-chart-head">
          <span>{active?.label || "Sector"}</span>
          <b>{num(active?.weight || 0)}%</b>
        </div>
        <SectorExposureChart rows={rows} active={active?.label || ""} />
      </div>
    </div>
  );
}

function SectorExposureChart({ rows, active }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.weight || 0)));
  return (
    <div className="sector-exposure-chart">
      {rows.slice(0, 10).map((row) => (
        <div key={row.label} className={active === row.label ? "active" : ""}>
          <span>{row.label}</span>
          <i><b style={{ width: `${Math.max(4, (Number(row.weight || 0) / max) * 100)}%` }} /></i>
          <em>{num(row.weight)}%</em>
        </div>
      ))}
    </div>
  );
}

function SectorHoldings({ sector, sort, onSort }) {
  if (!sector?.holdings?.length) return null;
  const holdings = sortAllocationRows(sector.holdings, sort);
  return (
    <div className="mini-table sector-holding-table">
      <div className="mini-table-header">
        <SortHeader label="Investment" field="name" sort={sort} onSort={onSort} defaultDirection="Asc" />
        <SortHeader label="Current value" field="value" sort={sort} onSort={onSort} />
        <span>Money invested</span>
        <SortHeader label="Return" field="return" sort={sort} onSort={onSort} />
      </div>
      {holdings.map((holding) => (
        <div key={holding.id}>
          <span><b>{holding.symbol}</b><em>{holding.label}</em></span>
          <span>{money(holding.value)}</span>
          <span>{money(holding.investedValue)}</span>
          <span className={holding.profitLoss >= 0 ? "gain" : "loss"}>{num(holding.profitLossPercent)}%</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioSummary({ overview }) {
  const profitTone = overview.totalProfit >= 0 ? "gain" : "loss";
  return (
    <>
      <div className="drill-summary">
        <SummaryItem label="Current open value" value={money(overview.currentValue)} />
        <SummaryItem label="Money still invested" value={money(overview.investedValue)} />
        <SummaryItem label="Total profit/loss" value={money(overview.totalProfit)} tone={profitTone} />
        <SummaryItem label="Total return" value={`${num(overview.profitPercent)}%`} />
      </div>
      <div className="drill-table">
        <div className="drill-row drill-header"><span>Metric</span><span>How it is calculated</span><span>Value</span></div>
        <div className="drill-row">
          <span>Current open value</span><span>Open quantity multiplied by latest synced price</span><span>{money(overview.currentValue)}</span>
        </div>
        <div className="drill-row">
          <span>Money still invested</span><span>Buy cost still left in open holdings after any sells</span><span>{money(overview.investedValue)}</span>
        </div>
        <div className="drill-row">
          <span>Total profit/loss</span><span>Open profit/loss plus closed profit/loss and dividends, after charges</span><span className={profitTone}>{money(overview.totalProfit)}</span>
        </div>
        <div className="drill-row">
          <span>Total return</span><span>Total profit/loss divided by money still invested</span><span>{num(overview.profitPercent)}%</span>
        </div>
        <div className="drill-row">
          <span>Portfolio activity</span><span>Open positions and completed sell trades are tracked separately</span><span>{overview.holdingCount} open / {overview.soldCount} closed</span>
        </div>
      </div>
    </>
  );
}

function ProfitView({ data }) {
  const summary = data.summary || {};
  return (
    <>
      <div className="drill-summary">
        <SummaryItem label="Total profit/loss" value={money(summary.totalProfit)} tone={summary.totalProfit >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Profit before charges" value={money(summary.grossInvestmentProfit)} tone={summary.grossInvestmentProfit >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Charges and fees" value={money(summary.totalCharges)} tone="loss" />
        <SummaryItem label="Open profit/loss" value={money(summary.unrealizedProfit)} tone={summary.unrealizedProfit >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Closed profit/loss" value={money(summary.realizedProfit)} tone={summary.realizedProfit >= 0 ? "gain" : "loss"} />
        <SummaryItem label="Total return" value={`${num(summary.profitPercent)}%`} />
      </div>
      <div className="drill-table">
        <div className="drill-row drill-header"><span>Part</span><span>Meaning</span><span>Amount</span></div>
        {(data.rows || []).map((row) => (
          <div className="drill-row" key={row.id}>
            <span>{row.label}</span><span>{row.calculation}</span><span className={row.amount >= 0 ? "gain" : "loss"}>{money(row.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Ledger({ data, sort, onSort, page, onPage, onEdit, onDelete }) {
  const pageCount = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 12)));
  return (
    <>
      <div className="ledger">
        <div className="ledger-header">
          <SortHeader label="Date" field="date" sort={sort} onSort={onSort} />
          <SortHeader label="Investment" field="asset" sort={sort} onSort={onSort} defaultDirection="Asc" />
          <SortHeader label="Type" field="type" sort={sort} onSort={onSort} defaultDirection="Asc" />
          <span>Units</span>
          <SortHeader label="Amount" field="amount" sort={sort} onSort={onSort} />
          <span>Actions</span>
        </div>
        {(data.rows || []).map((row) => (
          <div key={row.id}>
            <span>{row.transactionDate}</span>
            <b>{row.assetName || row.assetId}</b>
            <em>{row.transactionType}</em>
            <span>{num(row.quantity)}</span>
            <strong>{money(row.price)}</strong>
            <div className="ledger-actions">
              <button onClick={() => onEdit(row)} title="Edit"><Edit3 size={15} /></button>
              <button onClick={() => onDelete(row)} title="Delete"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {data.rows?.length ? <Pager page={page} pageCount={pageCount} onPage={onPage} /> : <div className="empty">No ledger records.</div>}
    </>
  );
}

function Pager({ page, pageCount, onPage }) {
  return (
    <div className="pager modern-pager">
      <button className="ghost icon-button" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button>
      <span>Page {page} of {pageCount}</span>
      <button className="ghost icon-button" type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button>
    </div>
  );
}

function Panel({ title, detail, children }) {
  return (
    <section className="panel analytics-panel-card">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SummaryItem({ label, value, tone = "" }) {
  return <div><small>{label}</small><b className={tone}>{value}</b></div>;
}

function SearchToolbar({ label, value, onChange, placeholder, onSubmit, onClear, resultText, submitLabel = "" }) {
  function submit(event) {
    event.preventDefault();
    if (onSubmit) onSubmit();
  }
  function clear() {
    if (onClear) onClear();
    else onChange("");
  }
  return (
    <form className="search-toolbar" onSubmit={submit}>
      <label>
        <span>{label}</span>
        <div className="search-control">
          <Search size={16} />
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
          {value ? <button className="search-clear" type="button" onClick={clear} aria-label={`Clear ${label}`}><X size={15} /></button> : null}
        </div>
      </label>
      <div className="search-actions">
        {resultText ? <small>{resultText}</small> : null}
        {submitLabel ? <button type="submit" disabled={!value.trim()}>{submitLabel}</button> : null}
      </div>
    </form>
  );
}

function ListTools({ children, compact = false }) {
  return <div className={compact ? "list-tools compact-tools" : "list-tools"}>{children}</div>;
}

function SortControl({ label = "Sort by", value, onChange, options }) {
  return (
    <label className="sort-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function SortHeader({ label, field, sort, onSort, defaultDirection = "Desc" }) {
  const active = sortField(sort) === field;
  const direction = active ? sortDirection(sort) : "";
  const Icon = direction === "Asc" ? ArrowUp : ArrowDown;
  return (
    <button
      className={active ? "sort-header active" : "sort-header"}
      type="button"
      onClick={() => onSort(nextSortKey(sort, field, defaultDirection))}
      aria-sort={active ? (direction === "Asc" ? "ascending" : "descending") : "none"}
    >
      <span>{label}</span>
      {active ? <Icon size={13} /> : <ArrowDown size={13} />}
    </button>
  );
}

function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function num(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatPercent(value) {
  return value == null || !Number.isFinite(Number(value)) ? "N/A" : `${num(value)}%`;
}

function fiscalYearLabel(startDate) {
  const startYear = Number(String(startDate || "").slice(0, 4));
  if (!startYear) return "Current year";
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function sortHoldings(rows, sortKey) {
  const getters = {
    value: (row) => Number(row.status === "sold" ? row.sellValue : row.currentValue || 0),
    return: (row) => holdingReturnPercent(row),
    profit: (row) => Number(row.status === "sold" ? row.realizedProfit : row.profitLoss || 0),
    name: (row) => row.stockName || row.symbol || "",
  };
  return sortRows(rows, sortKey, getters);
}

function sortLedgerRows(rows, sortKey) {
  const getters = {
    date: (row) => row.transactionDate || "",
    amount: (row) => transactionAmount(row),
    type: (row) => row.transactionType || "",
    asset: (row) => row.assetName || row.symbol || row.assetId || "",
  };
  return sortRows(rows, sortKey, getters);
}

function sortAllocationRows(rows, sortKey) {
  const getters = {
    value: (row) => Number(row.value || row.currentValue || 0),
    return: (row) => Number(row.profitLossPercent || row.returnPercent || 0),
    name: (row) => row.symbol || row.label || row.stockName || "",
  };
  return sortRows(rows, sortKey, getters);
}

function sortSectorRows(rows, sortKey) {
  const getters = {
    weight: (row) => Number(row.weight || 0),
    count: (row) => Number(row.count || 0),
    name: (row) => row.label || "",
  };
  return sortRows(rows, sortKey, getters);
}

function sortRows(rows, sortKey, getters) {
  const match = /^([a-z]+)(Asc|Desc)$/.exec(sortKey || "");
  if (!match) return [...rows];
  const [, field, direction] = match;
  const getter = getters[field];
  if (!getter) return [...rows];
  return [...rows].sort((left, right) => compareSortValues(getter(left), getter(right), direction === "Desc"));
}

function sortField(sortKey) {
  return /^([a-z]+)(Asc|Desc)$/.exec(sortKey || "")?.[1] || "";
}

function sortDirection(sortKey) {
  return /^([a-z]+)(Asc|Desc)$/.exec(sortKey || "")?.[2] || "";
}

function nextSortKey(currentSort, field, defaultDirection = "Desc") {
  const currentField = sortField(currentSort);
  const currentDirection = sortDirection(currentSort);
  if (currentField !== field) return `${field}${defaultDirection}`;
  return `${field}${currentDirection === "Asc" ? "Desc" : "Asc"}`;
}

function compareSortValues(leftValue, rightValue, descending) {
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  let result;
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftValue !== "" && rightValue !== "") {
    result = leftNumber - rightNumber;
  } else {
    result = String(leftValue || "").localeCompare(String(rightValue || ""), undefined, { numeric: true, sensitivity: "base" });
  }
  return descending ? -result : result;
}

function transactionAmount(row) {
  const price = Number(row.price || 0);
  const quantity = Number(row.quantity || 0);
  const charges = Number(row.charges || 0);
  return ["buy", "sell"].includes(row.transactionType) ? quantity * price + charges : price + charges;
}

function holdingReturnPercent(row) {
  if (row.status !== "sold") return Number(row.profitLossPercent || 0);
  const soldCost = Number(row.soldCost || 0);
  return soldCost ? (Number(row.realizedProfit || 0) / soldCost) * 100 : 0;
}

function portfolioHealthScore(overview) {
  const returnPercent = Number(overview.profitPercent || 0);
  const returnScore = Math.max(0, Math.min(55, returnPercent * 1.6));
  const consistencyScore = overview.holdingCount ? 15 : 5;
  const activityScore = Math.min(20, Number(overview.holdingCount || 0) * 4);
  const baseScore = 25;
  const score = Math.max(0, Math.min(100, baseScore + returnScore + consistencyScore + activityScore));
  const parts = [
    { label: "Base portfolio", points: baseScore, max: 25, detail: "Starting score for having a tracked portfolio." },
    { label: "Return", points: returnScore, max: 55, detail: `${num(returnPercent)}% profit return x 1.6, capped at 55.` },
    { label: "Active tracking", points: consistencyScore, max: 15, detail: overview.holdingCount ? "Open investments are actively tracked." : "No open investments currently tracked." },
    { label: "Diversification", points: activityScore, max: 20, detail: `${overview.holdingCount || 0} active holdings x 4, capped at 20.` },
  ];
  if (score >= 75) return { score, parts, label: "Strong", tone: "good", description: "Your portfolio score is strong because return, tracking, and diversification are contributing well." };
  if (score >= 50) return { score, parts, label: "Stable", tone: "steady", description: "Your score is stable. It can improve with higher return or broader diversification." };
  return { score, parts, label: "Needs attention", tone: "bad", description: "Your score is lower because return, tracking, or diversification needs attention." };
}

function describeSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + (radius * Math.cos(radians)),
    y: cy + (radius * Math.sin(radians)),
  };
}

function emptyOverview() {
  return {
    investedValue: 0,
    currentValue: 0,
    unrealizedProfit: 0,
    realizedProfit: 0,
    totalProfit: 0,
    profitPercent: 0,
    thisFyProfit: 0,
    thisFyReturn: 0,
    fiscalYearStart: "",
    holdingCount: 0,
    soldCount: 0,
  };
}

function currentTransactionAsset(transaction) {
  if (!transaction?.assetId) return [];
  return [{
    id: transaction.assetId,
    symbol: transaction.symbol || transaction.assetName || transaction.assetId,
    exchange: transaction.exchange || "",
    sector: transaction.sector || "",
  }];
}

function routeModal() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === analyticsPath) return "analytics";
  if (path === insiderTradesPath) return "insiders";
  if (path === sipCalculatorPath) return "sip-calculator";
  if (path === snapshotsPath) return "snapshots";
  if (path === adminPath) return "admin";
  return "";
}

function setRoutePath(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
}
