import { useCallback, useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { api } from "@/src/api/client";
import { travelFromSupplierCoords } from "@/src/utils/geo";

/**
 * Distance/ETA from customer to approved store/warehouse locations.
 * destinations: [{ id, lat, lng, name }]
 */
export function useStoreTravelInfo(customerCoords, destinations = [], storeIdsFallback = []) {
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

  const storeIds = useMemo(() => {
    const ids = new Set();
    (storeIdsFallback || []).forEach((id) => {
      if (id) ids.add(String(id));
    });
    uniqueDestinations.forEach((d) => ids.add(String(d.id)));
    return [...ids];
  }, [storeIdsFallback, uniqueDestinations]);

  const refresh = useCallback(async () => {
    const lat = customerCoords?.latitude;
    const lng = customerCoords?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setTravelByStore((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setLoading(false);
      return;
    }
    if (uniqueDestinations.length === 0 && storeIds.length === 0) {
      setTravelByStore((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setLoading(false);
      return;
    }

    setLoading(true);
    let apiResults = {};
    try {
      const payload = { fromLat: lat, fromLng: lng };
      if (uniqueDestinations.length > 0) {
        payload.destinations = uniqueDestinations;
      } else if (storeIds.length > 0) {
        payload.storeIds = storeIds;
      }
      const data = await api.maps.travel(payload);
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

    const missingStoreIds = storeIds.filter((id) => !merged[id]);
    if (missingStoreIds.length > 0) {
      try {
        const data2 = await api.maps.travel({ fromLat: lat, fromLng: lng, storeIds: missingStoreIds });
        const extra = data2?.results || {};
        Object.assign(merged, extra);
      } catch {
        // keep partial results
      }
    }

    setTravelByStore(merged);
    setLoading(false);
  }, [customerCoords?.latitude, customerCoords?.longitude, uniqueDestinations, storeIds]);

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
