/**
 * Canonical order identifier. Backend may return id, _id, or orderId.
 * Use this everywhere for display, keys, and API calls.
 */
export function getOrderId(order) {
  if (!order) return null;
  const id = order.orderId ?? order.id ?? order._id;
  return id != null ? String(id) : null;
}

/** Mongo _id for API calls (prefer over human ORD_ id). */
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

/** Short display form (last 8 chars) */
export function getOrderIdShort(order) {
  const id = getOrderId(order);
  return id ? id.slice(-8) : "";
}
