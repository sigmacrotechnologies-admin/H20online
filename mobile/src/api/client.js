import { API_BASE } from "./config";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

const REQUEST_TIMEOUT_MS = 25000;

export async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Check that the backend is running and reachable.");
    }
    if (err.message && (err.message.includes("Network request failed") || err.message.includes("Failed to fetch"))) {
      throw new Error("Cannot reach server. On a device/emulator set EXPO_PUBLIC_API_URL to your computer IP (e.g. http://192.168.1.x:5000) in mobile/.env");
    }
    throw err;
  }
}

export const api = {
  auth: {
    login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    registerSupplier: (body) => request("/api/auth/register-supplier", { method: "POST", body: JSON.stringify(body) }),
  },
  suppliers: {
    me: () => request("/api/suppliers/me"),
  },
  products: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request("/api/products" + (q ? "?" + q : ""));
    },
    get: (id) => request("/api/products/" + id),
    create: (body) => request("/api/products", { method: "POST", body: JSON.stringify(body) }),
  },
  orders: {
    list: () => request("/api/orders"),
    get: (id) => request("/api/orders/" + id),
    create: (body) => request("/api/orders", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id) => request("/api/orders/" + id + "/cancel", { method: "PATCH" }),
  },
  wallet: {
    get: () => request("/api/wallet"),
    credit: (amount) => request("/api/wallet/credit", { method: "POST", body: JSON.stringify({ amount }) }),
    debit: (amount) => request("/api/wallet/debit", { method: "POST", body: JSON.stringify({ amount }) }),
  },
  users: {
    me: () => request("/api/users/me"),
    update: (body) => request("/api/users/me", { method: "PUT", body: JSON.stringify(body) }),
  },
  waterIntake: {
    get: (date) => request("/api/water-intake" + (date ? "?date=" + encodeURIComponent(date) : "")),
    add: (body) => request("/api/water-intake", { method: "POST", body: JSON.stringify(body) }),
    summary: (from, to) => {
      let path = "/api/water-intake/summary";
      const params = [];
      if (from) params.push("from=" + encodeURIComponent(from));
      if (to) params.push("to=" + encodeURIComponent(to));
      if (params.length) path += "?" + params.join("&");
      return request(path);
    },
  },
};
