/**
 * Canonical order identifier. Backend may return id, _id, or orderId.
 * Use this everywhere for display, keys, and API calls.
 */
export function getOrderId(order) {
  if (!order) return null;
  const id = order.orderId ?? order.id ?? order._id;
  return id != null ? String(id) : null;
}

/** Short display form (last 8 chars) */
export function getOrderIdShort(order) {
  const id = getOrderId(order);
  return id ? id.slice(-8) : "";
}
