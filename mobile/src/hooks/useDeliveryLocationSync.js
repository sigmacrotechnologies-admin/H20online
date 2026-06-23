import { useEffect } from "react";
import * as Location from "expo-location";
import { api } from "@/src/api/client";

const INTERVAL_MS = 12000;

/**
 * Pushes delivery partner GPS to the server for active picked-up orders.
 * Safe to call with empty ids — no-op.
 */
export function useDeliveryLocationSync(orderIds) {
  const ids = (orderIds || []).filter(Boolean).map(String);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return undefined;

    let stopped = false;

    const pushOnce = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        for (const orderId of ids) {
          if (stopped) break;
          try {
            await api.deliveryPartners.updateLocation(orderId, { latitude, longitude });
          } catch {
            // per-order failure should not stop other updates
          }
        }
      } catch {
        // location unavailable — skip silently
      }
    };

    pushOnce();
    const timer = setInterval(pushOnce, INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [key]);
}

export async function getLocationForPickup() {
  try {
    return await (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    })();
  } catch {
    return null;
  }
}
