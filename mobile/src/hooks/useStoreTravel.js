import { useCallback, useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { api } from "@/src/api/client";
import { travelFromSupplierCoords } from "@/src/utils/geo";

/**
 * Distance/ETA from customer to approved store/warehouse locations.
 * destinations: [{ id, lat, lng, name }]
 */
export function useStoreTravelInfo(customerCoords, destinations = []) {
  const [travelByStore, setTravelByStore] = useState({});
  const [loading, setLoading] = useState(false);

  const uniqueDestinations = useMemo(() => {
    const map = new Map();
    (destinations || []).forEach((d) => {
      if (d?.id && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
        map.set(String(d.id), {
          id: String(d.id),
          lat: d.lat,
          lng: d.lng,
          name: d.name || "",
        });
      }
    });
    return [...map.values()];
  }, [destinations]);

  const refresh = useCallback(async () => {
    const lat = customerCoords?.latitude;
    const lng = customerCoords?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || uniqueDestinations.length === 0) {
      setTravelByStore({});
      return;
    }

    setLoading(true);
    let apiResults = {};
    try {
      const data = await api.maps.travel({
        fromLat: lat,
        fromLng: lng,
        destinations: uniqueDestinations,
      });
      apiResults = data?.results || {};
    } catch {
      apiResults = {};
    }

    const merged = { ...apiResults };
    uniqueDestinations.forEach((d) => {
      if (merged[d.id]) return;
      const est = travelFromSupplierCoords(customerCoords, [d]);
      if (est[d.id]) merged[d.id] = est[d.id];
    });

    setTravelByStore(merged);
    setLoading(false);
  }, [customerCoords?.latitude, customerCoords?.longitude, uniqueDestinations]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { travelByStore, loading, refresh };
}

export async function getCurrentLocationCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export function formatTravelLabel(info) {
  if (!info) return null;
  const parts = [];
  if (info.distanceText) parts.push(info.distanceText);
  if (info.durationText) parts.push(info.durationText);
  if (info.source === "estimate" && parts.length) parts.push("est.");
  return parts.length ? parts.join(" · ") : null;
}
