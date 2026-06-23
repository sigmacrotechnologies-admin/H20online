/**
 * Customer live rider map: active once a delivery partner is assigned until delivery completes.
 */
export function isCustomerLiveTrackingEnabled(order) {
  if (!order || order.status === "cancelled") return false;
  const accepted = (order.supplierResponses || []).find((r) => r && r.status === "accepted");
  if (!accepted) return false;
  const stage = accepted.deliveryStage || "accepted";
  const isDelivered = order.status === "delivered" || stage === "delivered";
  const hasPartner = !!(accepted.deliveryPartnerId || accepted.deliveryPartnerName);
  return order.status === "in_progress" && !isDelivered && hasPartner;
}
