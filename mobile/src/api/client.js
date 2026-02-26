import { API_BASE } from "./config";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export const api = {
  auth: {
    login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  },
  products: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request("/api/products" + (q ? "?" + q : ""));
    },
    get: (id) => request("/api/products/" + id),
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
};
