/** Straight-line distance in metres + rough driving ETA (no Google required). */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDriving(lat1, lon1, lat2, lon2) {
  const meters = haversineMeters(lat1, lon1, lat2, lon2);
  const speedMps = (28 * 1000) / 3600;
  const seconds = Math.max(60, Math.round(meters / speedMps));
  const km = meters / 1000;
  const distanceText = km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return {
    distanceText,
    distanceMeters: Math.round(meters),
    durationText: `${minutes} min`,
    durationSeconds: seconds,
    source: "estimate",
  };
}

export function travelFromSupplierCoords(customerCoords, supplierCoordsList) {
  const lat = customerCoords?.latitude;
  const lng = customerCoords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  const results = {};
  (supplierCoordsList || []).forEach((s) => {
    if (!s?.id || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return;
    results[s.id] = {
      ...estimateDriving(lat, lng, s.lat, s.lng),
      storeLatitude: s.lat,
      storeLongitude: s.lng,
      supplierName: s.name || "",
    };
  });
  return results;
}
