/** Distance-band ETA — matches backend/utils/deliveryEta.js */
export function bandEtaFromMeters(meters) {
  const m = Math.max(0, Number(meters) || 0);
  if (m <= 500) return { min: 8, max: 10, text: "8–10 min" };
  if (m <= 1000) return { min: 15, max: 20, text: "15–20 min" };
  if (m <= 2000) return { min: 25, max: 30, text: "25–30 min" };
  if (m <= 5000) return { min: 30, max: 40, text: "30–40 min" };
  return { min: 40, max: 50, text: "40–50 min" };
}

export function applyEtaBuffer(band, bufferMinutes) {
  const b = Math.max(0, Math.min(120, Number(bufferMinutes) || 0));
  const min = band.min + b;
  const max = band.max + b;
  return { min, max, text: `${min}–${max} min`, bufferMinutes: b };
}

export function maxDistanceMeters(travelInfo) {
  if (!Array.isArray(travelInfo) || travelInfo.length === 0) return 0;
  return Math.max(...travelInfo.map((t) => Number(t.distanceMeters) || 0));
}

export function etaFromTravelInfo(travelInfo, bufferMinutes = 0) {
  return applyEtaBuffer(bandEtaFromMeters(maxDistanceMeters(travelInfo)), bufferMinutes);
}

export function primaryTravelLeg(travelInfo) {
  if (!Array.isArray(travelInfo) || travelInfo.length === 0) return null;
  return travelInfo.reduce((best, t) => {
    if (!best) return t;
    return (Number(t.distanceMeters) || 0) > (Number(best.distanceMeters) || 0) ? t : best;
  }, null);
}
