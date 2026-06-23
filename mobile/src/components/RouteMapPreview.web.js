import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import SafeMapBoundary from "@/src/components/SafeMapBoundary";
import { theme } from "@/src/theme";
import { getGoogleMapsApiKey } from "@/src/utils/googleMaps";

function loadGoogleMapsScript(apiKey) {
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if (window.google?.maps) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.dataset.googleMaps = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export default function RouteMapPreview({
  fromLatitude,
  fromLongitude,
  toLatitude,
  toLongitude,
  height = 180,
}) {
  const containerRef = useRef(null);
  const apiKey = getGoogleMapsApiKey();
  const hasFrom = Number.isFinite(fromLatitude) && Number.isFinite(fromLongitude);
  const hasTo = Number.isFinite(toLatitude) && Number.isFinite(toLongitude);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !apiKey || !hasFrom || !hasTo) return undefined;

    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !el) return;
        const from = { lat: fromLatitude, lng: fromLongitude };
        const to = { lat: toLatitude, lng: toLongitude };
        const map = new window.google.maps.Map(el, {
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        new window.google.maps.Marker({ position: from, map, label: "You" });
        new window.google.maps.Marker({ position: to, map, label: "Store" });
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(from);
        bounds.extend(to);
        map.fitBounds(bounds, 48);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [apiKey, fromLatitude, fromLongitude, toLatitude, toLongitude, hasFrom, hasTo]);

  if (!hasFrom || !hasTo || !apiKey) return null;

  return (
    <SafeMapBoundary>
      <View style={[styles.wrap, { height }]}>
        <View ref={containerRef} style={styles.map} />
      </View>
    </SafeMapBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  map: { width: "100%", height: "100%" },
});
