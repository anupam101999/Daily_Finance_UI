export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const accessTokenKey = "finance_access_token";
const refreshTokenKey = "finance_refresh_token";
const refreshIntervalMs = 29 * 60 * 1000;
let refreshPromise = null;
let refreshTimer = null;
const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30_000);

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", requestId = "", details = null, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    this.retryable = status === 0 || status === 429 || status >= 500;
  }
}

export function saveAuthSession(session) {
  if (!session?.user || !session?.accessToken || !session?.refreshToken) {
    throw new Error("The API returned an invalid authentication response.");
  }
  localStorage.setItem(accessTokenKey, session.accessToken);
  localStorage.setItem(refreshTokenKey, session.refreshToken);
  startRefreshTimer();
  return normalizeUser(session.user);
}

export function clearAuthSession() {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = null;
}

export async function restoreAuthSession() {
  if (!localStorage.getItem(refreshTokenKey)) return null;
  try {
    const session = await refreshAuthSession();
    return normalizeUser(session.user);
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function loginUser(username, password) {
  const session = await publicRequest("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return saveAuthSession(session);
}

export async function registerUser(username, password) {
  const session = await publicRequest("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return saveAuthSession(session);
}

export async function publicRequest(path, options = {}) {
  return parseResponse(await fetchWithTimeout(`${apiBaseUrl}${path}`, withJsonHeaders(options)));
}

export async function authorizedRequest(path, options = {}) {
  return parseResponse(await authorizedFetch(path, options));
}

export async function authorizedFetch(path, options = {}, retry = true) {
  let token = localStorage.getItem(accessTokenKey);
  if (!token && localStorage.getItem(refreshTokenKey)) {
    const session = await refreshAuthSession();
    token = session.accessToken;
  }

  const nextOptions = withJsonHeaders(options);
  const response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
    ...nextOptions,
    headers: {
      ...nextOptions.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401 && retry && localStorage.getItem(refreshTokenKey)) {
    await refreshAuthSession();
    return authorizedFetch(path, options, false);
  }
  return response;
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem(refreshTokenKey);
  if (!refreshToken) throw new Error("Session has expired");

  refreshPromise = publicRequest("/api/users/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  }).then((session) => {
    saveAuthSession(session);
    return session;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function startRefreshTimer() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    refreshAuthSession().catch(() => clearAuthSession());
  }, refreshIntervalMs);
}

function withJsonHeaders(options) {
  return {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  };
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || `API request failed: ${response.status}`, {
      status: response.status,
      code: data?.code || "API_ERROR",
      requestId: data?.requestId || response.headers.get("x-request-id") || "",
      details: data?.details || null,
    });
  }
  return data;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new ApiError("The request timed out. Please try again.", { code: "REQUEST_TIMEOUT", cause: error });
    throw new ApiError("Unable to reach the server. Check your connection and try again.", { cause: error });
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeUser(user) {
  if (!user?.id) return null;
  return {
    ...user,
    id: String(user.id),
    username: user.username || user.name,
    name: user.name || user.username,
  };
}
