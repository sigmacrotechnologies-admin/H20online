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
      const hint =
        "Backend running? Same Wi‑Fi? In mobile/.env set EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000 (ipconfig for IP). Then: npx expo start -c";
      throw new Error("Request timed out. " + hint);
    }
    if (err.message && (err.message.includes("Network request failed") || err.message.includes("Failed to fetch"))) {
      throw new Error(
        "Cannot reach server at " + API_BASE + ". See mobile/CONNECTION_HELP.md for simple steps."
      );
    }
    throw err;
  }
}

export const api = {
  auth: {
    login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    registerSupplier: (body) => request("/api/auth/register-supplier", { method: "POST", body: JSON.stringify(body) }),
    registerDelivery: (body) => request("/api/auth/register-delivery", { method: "POST", body: JSON.stringify(body) }),
  },
  suppliers: {
    me: () => request("/api/suppliers/me"),
  },
  supplier: {
    ordersIncoming: () => request("/api/supplier/orders/incoming"),
    ordersAccepted: () => request("/api/supplier/orders/accepted"),
    ordersHistory: (params) => request("/api/supplier/orders/history?" + new URLSearchParams(params || {}).toString()),
    acceptOrder: (orderId, body) => request("/api/supplier/orders/" + orderId + "/accept", { method: "PATCH", body: JSON.stringify(body) }),
    assignRider: (orderId, body) => request("/api/supplier/orders/" + orderId + "/assign-rider", { method: "PATCH", body: JSON.stringify(body) }),
    cancelOrder: (orderId) => request("/api/supplier/orders/" + orderId + "/cancel", { method: "PATCH" }),
    financials: () => request("/api/supplier/financials"),
    products: () => request("/api/supplier/products"),
  },
  deliveryPartners: {
    me: () => request("/api/delivery-partners/me"),
    list: (vehicleType) => request("/api/delivery-partners" + (vehicleType ? "?vehicleType=" + encodeURIComponent(vehicleType) : "")),
    ordersIncoming: () => request("/api/delivery-partners/orders/incoming"),
    ordersHistory: (params) => request("/api/delivery-partners/orders/history" + (params?.status ? "?status=" + encodeURIComponent(params.status) : "")),
    ordersSummary: () => request("/api/delivery-partners/orders/summary"),
    subscriptions: (params) => {
      const q = new URLSearchParams();
      if (params?.scheduleFilter) q.set("scheduleFilter", params.scheduleFilter);
      if (params?.timeRangeStart) q.set("timeRangeStart", params.timeRangeStart);
      if (params?.timeRangeEnd) q.set("timeRangeEnd", params.timeRangeEnd);
      return request("/api/delivery-partners/subscriptions" + (q.toString() ? "?" + q.toString() : ""));
    },
    financials: () => request("/api/delivery-partners/financials"),
    updateProfile: (body) => request("/api/delivery-partners/me", { method: "PATCH", body: JSON.stringify(body) }),
    markPickedUp: (orderId) => request("/api/delivery-partners/orders/" + orderId + "/picked-up", { method: "PATCH" }),
    markDelivered: (orderId) => request("/api/delivery-partners/orders/" + orderId + "/delivered", { method: "PATCH" }),
  },
  deliverySupport: {
    getThread: () => request("/api/delivery-support/thread"),
    sendMessage: (text) => request("/api/delivery-support/message", { method: "POST", body: JSON.stringify({ text }) }),
  },
  supplierSupport: {
    getThread: () => request("/api/supplier-support/thread"),
    sendMessage: (text) => request("/api/supplier-support/message", { method: "POST", body: JSON.stringify({ text }) }),
  },
  products: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return request("/api/products" + (q ? "?" + q : ""));
    },
    get: (id) => request("/api/products/" + id),
    create: (body) => request("/api/products", { method: "POST", body: JSON.stringify(body) }),
    delete: (id) => request("/api/products/" + id, { method: "DELETE" }),
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
  addresses: {
    list: () => request("/api/addresses"),
    create: (body) => request("/api/addresses", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request("/api/addresses/" + id, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id) => request("/api/addresses/" + id, { method: "DELETE" }),
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
  plans: {
    list: () => request("/api/plans"),
    products: (slug) => request("/api/plans/" + encodeURIComponent(slug) + "/products"),
  },
  subscriptions: {
    list: () => request("/api/subscriptions"),
    create: (body) => request("/api/subscriptions", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id) => request("/api/subscriptions/" + id + "/cancel", { method: "PATCH" }),
  },
  bills: {
    list: () => request("/api/bills"),
    pay: (id) => request("/api/bills/" + id + "/pay", { method: "POST" }),
  },
};
