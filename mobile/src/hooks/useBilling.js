import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/api/client";
import { computeBilling, DEFAULT_TAX_SETTINGS } from "@/src/utils/billing";

export function useBilling(subtotal) {
  const [settings, setSettings] = useState(DEFAULT_TAX_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.settings
      .tax()
      .then((data) => {
        if (active) setSettings(data || DEFAULT_TAX_SETTINGS);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const billing = useMemo(() => computeBilling(subtotal, settings), [subtotal, settings]);

  return { billing, settings, loading };
}
