import { API_BASE } from "./config";

let authToken = localStorage.getItem("h20_admin_token") || "";

export function setAuthToken(token) {
  authToken = token || "";
  if (token) localStorage.setItem("h20_admin_token", token);
  else localStorage.removeItem("h20_admin_token");
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
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data;
}

export const api = {
  auth: {
    login: (email, password) => request("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request("/api/admin/auth/me"),
  },
  users: (params) => request("/api/admin/users?" + new URLSearchParams(params || {})),
  user: (id) => request(`/api/admin/users/${id}`),
  updateUser: (id, body) => request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: "DELETE" }),
  createAdmin: (body) => request("/api/admin/admins", { method: "POST", body: JSON.stringify(body) }),
  orders: (params) => request("/api/admin/orders?" + new URLSearchParams(params || {})),
  order: (id) => request(`/api/admin/orders/${id}`),
  suppliers: (params) => request("/api/admin/suppliers?" + new URLSearchParams(params || {})),
  createSupplier: (body) => request("/api/admin/suppliers", { method: "POST", body: JSON.stringify(body) }),
  deleteSupplier: (id) => request(`/api/admin/suppliers/${id}`, { method: "DELETE" }),
  verifySupplier: (id, body) => request(`/api/admin/suppliers/${id}/verify`, { method: "PATCH", body: JSON.stringify(body) }),
  supplier: (id) => request(`/api/admin/suppliers/${id}`),
  plans: () => request("/api/admin/plans"),
  updatePlan: (id, body) => request(`/api/admin/plans/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updatePlanProduct: (id, body) => request(`/api/admin/plan-products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  financials: () => request("/api/admin/financials"),
  deliveryPartners: (params) => request("/api/admin/delivery-partners?" + new URLSearchParams(params || {})),
  verifyDeliveryPartner: (id, body) => request(`/api/admin/delivery-partners/${id}/verify`, { method: "PATCH", body: JSON.stringify(body) }),
  supplierSupport: () => request("/api/admin/supplier-support"),
  supplierSupportThread: (supplierId) => request("/api/admin/supplier-support/" + supplierId),
  supplierSupportReply: (supplierId, text) => request("/api/admin/supplier-support/" + supplierId + "/reply", { method: "POST", body: JSON.stringify({ text }) }),
};
