import { authorizedRequest } from "./apiClient";

export function getFinanceOverview() {
  return authorizedRequest("/api/finance/overview").then(normalizeOverview);
}

export function syncFinanceQuotes() {
  return authorizedRequest("/api/finance/sync", { method: "POST" });
}

export function getAdminBatches() {
  return authorizedRequest("/api/admin/batches");
}

export function runAdminBatch(batchId) {
  return authorizedRequest(`/api/admin/batches/${encodeURIComponent(batchId)}/run`, { method: "POST", timeoutMs: 5 * 60 * 1000 });
}

export function updateAdminBatchSchedule(batchId, cronExpression, enabled) {
  return authorizedRequest(`/api/admin/batches/${encodeURIComponent(batchId)}/schedule`, { method: "PATCH", body: JSON.stringify({ cronExpression, enabled }) });
}

export function getInsiderBackfillStatus() {
  return authorizedRequest("/api/finance/insider-trades/backfill/status");
}

export function startInsiderBackfill(fromYear, fromMonth, toYear, toMonth) {
  return authorizedRequest("/api/finance/insider-trades/backfill", { method: "POST", body: JSON.stringify({ fromYear, fromMonth, toYear, toMonth }) });
}

export function terminateInsiderBackfill() {
  return authorizedRequest("/api/finance/insider-trades/backfill", { method: "DELETE" });
}

export function getAnalyticsFeature({ period = "1y", startDate = "", endDate = "" } = {}) {
  const params = new URLSearchParams({ period });
  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }
  return authorizedRequest(`/api/finance/analytics?${params.toString()}`).then(normalizeAnalytics);
}

export function getHoldingsFeature({ page = 1, pageSize = 6, search = "", status = "open", sort = "valueDesc" } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, status, sort });
  return authorizedRequest(`/api/finance/holdings?${params.toString()}`).then((payload) => ({
    holdings: (payload.holdings || []).map(normalizeHolding),
    page: Number(payload.page || page),
    pageSize: Number(payload.pageSize || pageSize),
    total: Number(payload.total || 0),
    status: payload.status || status,
    search: payload.search || search,
    allocation: payload.allocation || [],
    sectors: payload.sectors || [],
    refreshedAt: payload.refreshedAt || "",
    sort: payload.sort || sort,
  }));
}

function normalizeAnalytics(payload) {
  const summary = payload.summary || {};
  const performance = payload.performance || {};
  return {
    period: payload.period || "1y",
    periodStart: payload.periodStart || "",
    periodEnd: payload.periodEnd || "",
    summary: {
      currentValue: Number(summary.currentValue || 0),
      investedValue: Number(summary.investedValue || 0),
      totalProfit: Number(summary.totalProfit || 0),
      profitPercent: summary.profitPercent == null ? null : Number(summary.profitPercent),
      allTimeProfitPercent: Number(summary.allTimeProfitPercent || 0),
      periodProfit: Number(summary.periodProfit || 0),
      periodRealizedProfit: Number(summary.periodRealizedProfit || 0),
      periodUnrealizedProfit: Number(summary.periodUnrealizedProfit || 0),
      periodStartValue: Number(summary.periodStartValue || 0),
      periodBuyValue: Number(summary.periodBuyValue || 0),
      periodSellValue: Number(summary.periodSellValue || 0),
      periodDividendValue: Number(summary.periodDividendValue || 0),
      alphaPercent: summary.alphaPercent == null ? null : Number(summary.alphaPercent),
      niftyReturnPercent: summary.niftyReturnPercent == null ? null : Number(summary.niftyReturnPercent),
      holdingCount: Number(summary.holdingCount || 0),
      soldCount: Number(summary.soldCount || 0),
      topHoldingWeight: Number(summary.topHoldingWeight || 0),
      sectorCount: Number(summary.sectorCount || 0),
    },
    performance: {
      ...performance,
      bars: (performance.bars || []).map((bar) => ({ ...bar, value: bar.value == null ? null : Number(bar.value) })),
      benchmark: performance.benchmark || {},
    },
    allocation: (payload.allocation || []).map((row) => ({
      ...row,
      value: Number(row.value || 0),
      investedValue: Number(row.investedValue || 0),
      weight: Number(row.weight || 0),
      profitLoss: Number(row.profitLoss || 0),
      profitLossPercent: Number(row.profitLossPercent || 0),
    })),
    sectors: (payload.sectors || []).map((row) => ({
      ...row,
      value: Number(row.value || 0),
      investedValue: Number(row.investedValue || 0),
      weight: Number(row.weight || 0),
      profitLoss: Number(row.profitLoss || 0),
      count: Number(row.count || 0),
      holdings: (row.holdings || []).map((holding) => ({
        ...holding,
        value: Number(holding.value || 0),
        investedValue: Number(holding.investedValue || 0),
        profitLoss: Number(holding.profitLoss || 0),
        profitLossPercent: Number(holding.profitLossPercent || 0),
      })),
    })),
    sold: (payload.sold || []).map((row) => ({
      ...row,
      realizedProfit: Number(row.realizedProfit || 0),
      dividends: Number(row.dividends || 0),
      fees: Number(row.fees || 0),
      totalProfit: Number(row.totalProfit || 0),
    })),
    refreshedAt: payload.refreshedAt || "",
  };
}

export function getProfitFeature() {
  return authorizedRequest("/api/finance/profit");
}

export function getInsiderTradesFeature({ year, scope = "market", search = "", date = "", page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams({ scope, search, date, page: String(page), pageSize: String(pageSize) });
  if (year) params.set("year", String(year));
  return authorizedRequest(`/api/finance/insider-trades?${params.toString()}`);
}

export function getLedgerFeature({ page = 1, pageSize = 12, search = "", sort = "dateDesc" } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, sort });
  return authorizedRequest(`/api/finance/ledger?${params.toString()}`);
}

export function getHeldStockOptions() {
  return authorizedRequest("/api/finance/assets/held").then((payload) => ({
    assets: payload.assets || [],
  }));
}

export function addHolding(holding) {
  return authorizedRequest("/api/finance/holdings", {
    method: "POST",
    body: JSON.stringify(holding),
  });
}

export function updateHolding(id, holding) {
  return authorizedRequest(`/api/finance/holdings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(holding),
  });
}

export function deleteHolding(id) {
  return authorizedRequest(`/api/finance/holdings/${id}`, { method: "DELETE" });
}

export function sellHolding(id, sale) {
  return authorizedRequest(`/api/finance/holdings/${id}/sell`, {
    method: "POST",
    body: JSON.stringify(sale),
  });
}

export function addDividend(dividend) {
  return authorizedRequest("/api/finance/dividends", {
    method: "POST",
    body: JSON.stringify(dividend),
  });
}

export function updateTransaction(id, transaction) {
  return authorizedRequest(`/api/finance/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(transaction),
  });
}

export function deleteTransaction(id) {
  return authorizedRequest(`/api/finance/transactions/${id}`, { method: "DELETE" });
}

function normalizeOverview(payload) {
  return {
    currentValue: Number(payload.currentValue || 0),
    investedValue: Number(payload.investedValue || 0),
    totalProfit: Number(payload.totalProfit || 0),
    profitPercent: Number(payload.profitPercent || 0),
    realizedProfit: Number(payload.realizedProfit || 0),
    unrealizedProfit: Number(payload.unrealizedProfit || 0),
    thisFyProfit: Number(payload.thisFyProfit || 0),
    thisFyReturn: Number(payload.thisFyReturn || 0),
    fiscalYearStart: payload.fiscalYearStart || "",
    holdingCount: Number(payload.holdingCount || 0),
    soldCount: Number(payload.soldCount || 0),
    refreshedAt: payload.refreshedAt || "",
  };
}

function normalizeHolding(holding) {
  return {
    ...holding,
    quantity: Number(holding.quantity || 0),
    soldQuantity: Number(holding.soldQuantity || 0),
    averagePrice: Number(holding.averagePrice || 0),
    averageSellPrice: Number(holding.averageSellPrice || 0),
    sellValue: Number(holding.sellValue || 0),
    soldCost: Number(holding.soldCost || 0),
    currentPrice: Number(holding.currentPrice || holding.lastPrice || 0),
    purchaseDate: holding.purchaseDate || "",
    charges: Number(holding.charges || 0),
    status: holding.status || "open",
    investedValue: Number(holding.investedValue || 0),
    currentValue: Number(holding.currentValue || 0),
    profitLoss: Number(holding.profitLoss || 0),
    profitLossPercent: Number(holding.profitLossPercent || 0),
    realizedProfit: Number(holding.realizedProfit || 0),
    dividends: Number(holding.dividends || 0),
    fees: Number(holding.fees || 0),
  };
}
