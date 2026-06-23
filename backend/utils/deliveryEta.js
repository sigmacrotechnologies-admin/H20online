/**
 * Distance-band delivery ETA (not Google Maps drive-time).
 * Real-time distance is shown separately from maps; ETA uses these bands.
 */
function bandEtaFromMeters(meters) {
  const m = Math.max(0, Number(meters) || 0);
  if (m <= 500) return { min: 8, max: 10, text: "8–10 min" };
  if (m <= 1000) return { min: 15, max: 20, text: "15–20 min" };
  if (m <= 2000) return { min: 25, max: 30, text: "25–30 min" };
  if (m <= 5000) return { min: 30, max: 40, text: "30–40 min" };
  return { min: 40, max: 50, text: "40–50 min" };
}

function applyEtaBuffer(band, bufferMinutes) {
  const b = Math.max(0, Math.min(120, Number(bufferMinutes) || 0));
  const min = band.min + b;
  const max = band.max + b;
  return { min, max, text: `${min}–${max} min`, bufferMinutes: b };
}

function maxDistanceMeters(travelInfo) {
  if (!Array.isArray(travelInfo) || travelInfo.length === 0) return 0;
  return Math.max(...travelInfo.map((t) => Number(t.distanceMeters) || 0));
}

function etaFromTravelInfo(travelInfo, bufferMinutes = 0) {
  const band = bandEtaFromMeters(maxDistanceMeters(travelInfo));
  return applyEtaBuffer(band, bufferMinutes);
}

function etaFromPartnerToCustomer(partnerLat, partnerLng, customerLat, customerLng) {
  const { haversineMeters, formatDistanceMeters } = require("./geo");
  const meters = haversineMeters(
    Number(partnerLat),
    Number(partnerLng),
    Number(customerLat),
    Number(customerLng)
  );
  const band = bandEtaFromMeters(meters);
  return {
    distanceMeters: Math.round(meters),
    distanceText: formatDistanceMeters(meters),
    etaText: band.text,
    min: band.min,
    max: band.max,
  };
}

module.exports = {
  bandEtaFromMeters,
  applyEtaBuffer,
  maxDistanceMeters,
  etaFromTravelInfo,
  etaFromPartnerToCustomer,
};
