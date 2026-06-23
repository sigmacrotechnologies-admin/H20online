import { bandEtaFromMeters, etaFromTravelInfo } from "@/src/utils/deliveryEta";

export function getAcceptedResponse(order) {
  return (order?.supplierResponses || []).find((r) => r && r.status === "accepted");
}

/** Display ETA using distance bands — never Google Maps drive-time minutes. */
export function resolveOrderEta(order, liveTracking) {
  const accepted = getAcceptedResponse(order);
  const stage = accepted?.deliveryStage;
  const isLive = stage === "picked_up" && order?.status === "in_progress";

  if (isLive && liveTracking?.liveDistanceMeters != null) {
    if (accepted?.eta) return accepted.eta;
    return bandEtaFromMeters(liveTracking.liveDistanceMeters).text;
  }

  if (accepted?.eta) return accepted.eta;
  if (order?.estimatedDeliveryText) return order.estimatedDeliveryText;
  if (liveTracking?.estimatedDeliveryText) return liveTracking.estimatedDeliveryText;
  if (order?.travelInfo?.length) return etaFromTravelInfo(order.travelInfo, 0).text;
  return null;
}

/** Distance + band ETA label for badges (no Google durationText). */
export function formatDistanceEtaLabel(info, etaText) {
  const parts = [];
  if (info?.distanceText) parts.push(info.distanceText);
  const eta =
    etaText ||
    (info?.distanceMeters != null ? bandEtaFromMeters(info.distanceMeters).text : null) ||
    (info?.durationText && /min/i.test(info.durationText) ? null : info?.durationText);
  if (eta) parts.push(eta);
  return parts.length ? parts.join(" · ") : null;
}

export function bandEtaForTravelLeg(travelLeg) {
  if (!travelLeg) return null;
  if (travelLeg.distanceMeters != null) return bandEtaFromMeters(travelLeg.distanceMeters).text;
  return null;
}
