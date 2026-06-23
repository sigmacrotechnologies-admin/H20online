import { API_BASE } from "./config";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

const REQUEST_TIMEOUT_MS = 25000;
const AI_REQUEST_TIMEOUT_MS = 60000;

export async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const isAiRequest = path.includes("/api/ai/");
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    isAiRequest ? AI_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS
  );
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let errMsg = data.error || data.message;
      if (!errMsg && res.status === 404) {
        errMsg = `API not found: ${path}. Restart backend (cd backend && npm run dev).`;
      }
      throw new Error(errMsg || "Request failed");
    }
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
    registerSociety: (body) => request("/api/auth/register-society", { method: "POST", body: JSON.stringify(body) }),
  },
  societies: {
    list: () => request("/api/societies/list"),
    me: () => request("/api/societies/me"),
    products: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return request("/api/societies/products" + (q ? "?" + q : ""));
    },
  },
  suppliers: {
    me: () => request("/api/suppliers/me"),
    updateMe: (body) => request("/api/suppliers/me", { method: "PATCH", body: JSON.stringify(body) }),
  },
  supplier: {
    ordersIncoming: () => request("/api/supplier/orders/incoming"),
    ordersAccepted: () => request("/api/supplier/orders/accepted"),
    ordersHistory: (params) => request("/api/supplier/orders/history?" + new URLSearchParams(params || {}).toString()),
    acceptOrder: (orderId, body) => request("/api/supplier/orders/" + orderId + "/accept", { method: "PATCH", body: JSON.stringify(body) }),
    rejectOrder: (orderId, body) => request("/api/supplier/orders/" + orderId + "/reject", { method: "PATCH", body: JSON.stringify(body || {}) }),
    assignRider: (orderId, body) => request("/api/supplier/orders/" + orderId + "/assign-rider", { method: "PATCH", body: JSON.stringify(body) }),
    cancelOrder: (orderId) => request("/api/supplier/orders/" + orderId + "/cancel", { method: "PATCH" }),
    financials: () => request("/api/supplier/financials"),
    products: () => request("/api/supplier/products"),
    deliveryPartners: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return request("/api/supplier/delivery-partners" + (q ? "?" + q : ""));
      },
      create: (body) => request("/api/supplier/delivery-partners", { method: "POST", body: JSON.stringify(body) }),
    },
  },
  deliveryPartners: {
    me: () => request("/api/delivery-partners/me"),
    setOnline: (body) =>
      request("/api/delivery-partners/me/online", { method: "PATCH", body: JSON.stringify(body) }),
    updateAvailabilityLocation: (body) =>
      request("/api/delivery-partners/me/location", { method: "PATCH", body: JSON.stringify(body) }),
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
    markPickedUp: (orderId, body) =>
      request("/api/delivery-partners/orders/" + orderId + "/picked-up", {
        method: "PATCH",
        body: JSON.stringify(body || {}),
      }),
    updateLocation: (orderId, body) =>
      request("/api/delivery-partners/orders/" + orderId + "/location", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
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
  customerSupport: {
    listTickets: () => request("/api/customer-support/tickets"),
    createTicket: (body) => request("/api/customer-support/tickets", { method: "POST", body: JSON.stringify(body) }),
    getTicket: (id) => request("/api/customer-support/tickets/" + id),
    replyToTicket: (id, text) =>
      request("/api/customer-support/tickets/" + id + "/reply", { method: "POST", body: JSON.stringify({ text }) }),
  },
  products: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return request("/api/products" + (q ? "?" + q : ""));
    },
    get: (id) => request("/api/products/" + id),
    create: (body) => request("/api/products", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request("/api/products/" + id, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id) => request("/api/products/" + id, { method: "DELETE" }),
  },
  orders: {
    list: () => request("/api/orders"),
    get: (id) => request("/api/orders/" + id),
    tracking: (id) => request("/api/orders/" + id + "/tracking"),
    create: (body) => request("/api/orders", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id) => request("/api/orders/" + id + "/cancel", { method: "PATCH" }),
  },
  reviews: {
    submit: (body) => request("/api/reviews", { method: "POST", body: JSON.stringify(body) }),
    listForProduct: (productId) => request("/api/reviews/product/" + productId),
    getMyOrderReviews: (orderId) => request("/api/reviews/me/order/" + orderId),
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
  serviceability: {
    check: (body) => request("/api/serviceability/check", { method: "POST", body: JSON.stringify(body) }),
  },
  maps: {
    travel: (body) => request("/api/maps/travel", { method: "POST", body: JSON.stringify(body) }),
  },
  stores: {
    list: () => request("/api/stores"),
    approved: () => request("/api/stores/approved"),
    create: (body) => request("/api/stores", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request("/api/stores/" + id, { method: "PATCH", body: JSON.stringify(body) }),
  },
  waterIntake: {
    get: (date) => request("/api/water-intake" + (date ? "?date=" + encodeURIComponent(date) : "")),
    add: (body) => request("/api/water-intake", { method: "POST", body: JSON.stringify(body) }),
    remove: (entryId, date) =>
      request(
        "/api/water-intake/" +
          encodeURIComponent(entryId) +
          (date ? "?date=" + encodeURIComponent(date) : ""),
        { method: "DELETE" }
      ),
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
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return request("/api/plans" + (q ? "?" + q : ""));
    },
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
  settings: {
    tax: () => request("/api/settings/tax"),
    payment: () => request("/api/settings/payment"),
  },
  payments: {
    razorpayCreateOrder: (body) =>
      request("/api/payments/razorpay/create-order", { method: "POST", body: JSON.stringify(body) }),
    razorpayVerify: (body) =>
      request("/api/payments/razorpay/verify-payment", { method: "POST", body: JSON.stringify(body) }),
  },
  ai: {
    waterInsight: () => request("/api/ai/water-insight"),
    intakeSense: (date) =>
      request("/api/ai/intake-sense" + (date ? "?date=" + encodeURIComponent(date) : "")),
    waterReport: () => request("/api/ai/water-report", { method: "POST" }),
    ask: (question) => request("/api/ai/ask", { method: "POST", body: JSON.stringify({ question }) }),
  },
  leaderboard: {
    get: (year, month) => {
      const params = [];
      if (year) params.push("year=" + encodeURIComponent(year));
      if (month) params.push("month=" + encodeURIComponent(month));
      const q = params.length ? "?" + params.join("&") : "";
      return request("/api/leaderboard" + q);
    },
    updatePreferences: (body) =>
      request("/api/leaderboard/preferences", { method: "PUT", body: JSON.stringify(body) }),
  },
};
