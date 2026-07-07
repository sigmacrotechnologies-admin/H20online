/**
 * Canonical order identifier. Backend may return id, _id, or orderId.
 * Use this everywhere for display, keys, and API calls.
 */
export function getOrderId(order) {
  if (!order) return null;
  const id = order.orderId ?? order.id ?? order._id;
  return id != null ? String(id) : null;
}

/** Mongo _id for API calls (prefer over human H2O- id). */
export function getOrderMongoId(order) {
  if (!order) return null;
  const id = order.id ?? order._id;
  return id != null ? String(id) : null;
}

export function matchOrderId(order, id) {
  if (!order || !id) return false;
  const c = String(id);
  return String(order.id) === c || String(order._id) === c || String(order.orderId) === c;
}

/** Display form — full H2O-/ORD_ id when present, else last 8 chars of Mongo id */
export function getOrderIdShort(order) {
  const id = getOrderId(order);
  if (!id) return "";
  if (id.startsWith("H2O-") || id.startsWith("ORD_")) return id;
  return id.slice(-8);
}

export function getPaymentMethodLabel(order) {
  const payment = order?.payment;
  if (payment?.methodLabel) return payment.methodLabel;
  const method = order?.paymentMethod || "";
  if (method === "razorpay") return "Razorpay";
  if (method === "wallet") return "H2O Wallet";
  if (method === "cod") return "Cash on Delivery";
  return method || "—";
}

export function formatPaidAt(order) {
  const value = order?.paidAt || order?.payment?.paidAt || order?.date;
  if (!value) return null;
  return new Date(value).toLocaleString();
}
