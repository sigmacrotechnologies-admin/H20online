const { estimateDriving } = require("../utils/geo");

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

async function fetchDistanceMatrix(origins, destinations, mode = "driving") {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is not configured on the server");
  }
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}` +
    `&destinations=${encodeURIComponent(destinations)}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(data.error_message || data.status || "Distance Matrix request failed");
  }
  return data;
}

function mapElement(el) {
  if (!el || el.status !== "OK") return null;
  return {
    distanceText: el.distance?.text || "",
    distanceMeters: el.distance?.value || 0,
    durationText: el.duration?.text || "",
    durationSeconds: el.duration?.value || 0,
    source: "google",
  };
}

function withFallback(fromLat, fromLng, toLat, toLng, info) {
  if (info) return info;
  const est = estimateDriving(fromLat, fromLng, toLat, toLng);
  return est;
}

async function travelInfo(fromLat, fromLng, toLat, toLng) {
  try {
    const data = await fetchDistanceMatrix(`${fromLat},${fromLng}`, `${toLat},${toLng}`);
    const mapped = mapElement(data.rows?.[0]?.elements?.[0]);
    return withFallback(fromLat, fromLng, toLat, toLng, mapped);
  } catch {
    return estimateDriving(fromLat, fromLng, toLat, toLng);
  }
}

async function travelInfoBatch(fromLat, fromLng, destinations) {
  const valid = (destinations || []).filter(
    (d) => d && Number.isFinite(d.lat) && Number.isFinite(d.lng)
  );
  if (!valid.length) return {};

  try {
    const destStr = valid.map((d) => `${d.lat},${d.lng}`).join("|");
    const data = await fetchDistanceMatrix(`${fromLat},${fromLng}`, destStr);
    const elements = data.rows?.[0]?.elements || [];
    const results = {};
    valid.forEach((d, i) => {
      const mapped = mapElement(elements[i]);
      const info = withFallback(fromLat, fromLng, d.lat, d.lng, mapped);
      results[d.id] = {
        ...info,
        storeLatitude: d.lat,
        storeLongitude: d.lng,
        supplierName: d.name || "",
      };
    });
    return results;
  } catch {
    const results = {};
    valid.forEach((d) => {
      results[d.id] = {
        ...estimateDriving(fromLat, fromLng, d.lat, d.lng),
        storeLatitude: d.lat,
        storeLongitude: d.lng,
        supplierName: d.name || "",
      };
    });
    return results;
  }
}

module.exports = {
  travelInfo,
  travelInfoBatch,
};
