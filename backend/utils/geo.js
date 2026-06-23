/** Straight-line distance in metres (Haversine). */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rough city driving estimate (~28 km/h average). */
function estimateDriving(lat1, lon1, lat2, lon2) {
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

function formatDistanceMeters(meters) {
  const m = Math.max(0, Number(meters) || 0);
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

module.exports = { haversineMeters, estimateDriving, formatDistanceMeters };
