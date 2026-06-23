import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/api/client";

const POLL_MS = 30000;

export function useLiveOrderTracking(orderId, enabled) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await api.orders.tracking(orderId);
      setTracking(data || null);
    } catch {
      // keep last good snapshot
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled || !orderId) {
      setTracking(null);
      return undefined;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, orderId, refresh]);

  return { tracking, loading, refresh };
}
