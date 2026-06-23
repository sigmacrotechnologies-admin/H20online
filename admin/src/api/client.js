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
  updateSupplier: (id, body) => request(`/api/admin/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  plans: () => request("/api/admin/plans"),
  updatePlan: (id, body) => request(`/api/admin/plans/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updatePlanProduct: (id, body) => request(`/api/admin/plan-products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createPlanProduct: (body) => request("/api/admin/plan-products", { method: "POST", body: JSON.stringify(body) }),
  deletePlanProduct: (id) => request(`/api/admin/plan-products/${id}`, { method: "DELETE" }),
  financials: () => request("/api/admin/financials"),
  walletManagement: (params) => request("/api/admin/wallet-management?" + new URLSearchParams(params || {})),
  walletManagementUser: (userId) => request("/api/admin/wallet-management/" + userId),
  walletManagementAdjust: (userId, body) => request("/api/admin/wallet-management/" + userId + "/adjust", { method: "POST", body: JSON.stringify(body) }),
  deliveryPartners: (params) => request("/api/admin/delivery-partners?" + new URLSearchParams(params || {})),
  verifyDeliveryPartner: (id, body) => request(`/api/admin/delivery-partners/${id}/verify`, { method: "PATCH", body: JSON.stringify(body) }),
  supplierSupport: () => request("/api/admin/supplier-support"),
  supplierSupportThread: (supplierId) => request("/api/admin/supplier-support/" + supplierId),
  supplierSupportReply: (supplierId, text) => request("/api/admin/supplier-support/" + supplierId + "/reply", { method: "POST", body: JSON.stringify({ text }) }),
  deliverySupport: () => request("/api/admin/delivery-support"),
  deliverySupportThread: (deliveryPartnerId) => request("/api/admin/delivery-support/" + deliveryPartnerId),
  deliverySupportReply: (deliveryPartnerId, text) => request("/api/admin/delivery-support/" + deliveryPartnerId + "/reply", { method: "POST", body: JSON.stringify({ text }) }),
  customerSupport: () => request("/api/admin/customer-support"),
  customerSupportTicket: (ticketId) => request("/api/admin/customer-support/" + ticketId),
  customerSupportReply: (ticketId, text) => request("/api/admin/customer-support/" + ticketId + "/reply", { method: "POST", body: JSON.stringify({ text }) }),
  customerSupportStatus: (ticketId, status) => request("/api/admin/customer-support/" + ticketId + "/status", { method: "PATCH", body: JSON.stringify({ status }) }),
  pickupHubs: () => request("/api/admin/pickup-hubs"),
  createPickupHub: (body) => request("/api/admin/pickup-hubs", { method: "POST", body: JSON.stringify(body) }),
  subscriptions: (params) => request("/api/admin/subscriptions?" + new URLSearchParams(params || {}).toString()),
  subscriptionsFinancials: () => request("/api/admin/subscriptions/financials"),
  subscriptionStatus: (id, status) => request(`/api/admin/subscriptions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  subscriptionDelete: (id) => request(`/api/admin/subscriptions/${id}`, { method: "DELETE" }),
  subscriptionDelivery: (id, body) => request(`/api/admin/subscriptions/${id}/delivery`, { method: "PATCH", body: JSON.stringify(body) }),
  subscriptionUpdate: (id, body) => request(`/api/admin/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  assignDeliveryBulk: (body) => request("/api/admin/subscriptions/assign-delivery-bulk", { method: "POST", body: JSON.stringify(body) }),
  societies: (params) => request("/api/admin/societies?" + new URLSearchParams(params || {}).toString()),
  society: (id) => request(`/api/admin/societies/${id}`),
  societySubscriptionDelivery: (societyId, subscriptionId, body) =>
    request(`/api/admin/societies/${societyId}/subscriptions/${subscriptionId}/delivery`, { method: "PATCH", body: JSON.stringify(body) }),
  stores: (params) => request("/api/admin/stores?" + new URLSearchParams(params || {}).toString()),
  approveStore: (id) => request(`/api/admin/stores/${id}/approve`, { method: "PATCH" }),
  rejectStore: (id, reason) =>
    request(`/api/admin/stores/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  products: (params) => request("/api/admin/products?" + new URLSearchParams(params || {}).toString()),
  deleteProduct: (id) => request(`/api/admin/products/${id}`, { method: "DELETE" }),
  surveys: () => request("/api/admin/surveys"),
  survey: (id) => request(`/api/admin/surveys/${id}`),
  createSurvey: (body) => request("/api/admin/surveys", { method: "POST", body: JSON.stringify(body) }),
  importSurvey: (body) => request("/api/admin/surveys/import", { method: "POST", body: JSON.stringify(body) }),
  updateSurvey: (id, body) => request(`/api/admin/surveys/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSurvey: (id) => request(`/api/admin/surveys/${id}`, { method: "DELETE" }),
  setSurveyActive: (id, isActive) => request(`/api/admin/surveys/${id}/active`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
  surveyResponses: (id) => request(`/api/admin/surveys/${id}/responses`),
  surveyStats: (id) => request(`/api/admin/surveys/${id}/stats`),
  analyzeSurvey: (id) => request(`/api/admin/surveys/${id}/analyze`, { method: "POST" }),
  taxSettings: () => request("/api/admin/tax-settings"),
  updateTaxSettings: (body) => request("/api/admin/tax-settings", { method: "PUT", body: JSON.stringify(body) }),
  serviceableAreas: () => request("/api/admin/serviceable-areas"),
  createServiceableArea: (body) => request("/api/admin/serviceable-areas", { method: "POST", body: JSON.stringify(body) }),
  updateServiceableArea: (id, body) => request(`/api/admin/serviceable-areas/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteServiceableArea: (id) => request(`/api/admin/serviceable-areas/${id}`, { method: "DELETE" }),
};
