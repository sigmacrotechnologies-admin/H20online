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

function LiveTrackingMapInner({
  customerLatitude,
  customerLongitude,
  partnerLatitude,
  partnerLongitude,
  storeLatitude,
  storeLongitude,
  height = 200,
}) {
  const containerRef = useRef(null);
  const markersRef = useRef({ partner: null, map: null });
  const apiKey = getGoogleMapsApiKey();
  const hasCustomer = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);
  const hasPartner = Number.isFinite(partnerLatitude) && Number.isFinite(partnerLongitude);
  const hasStore = Number.isFinite(storeLatitude) && Number.isFinite(storeLongitude);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !apiKey || !hasCustomer) return undefined;

    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !el) return;
        const map = new window.google.maps.Map(el, {
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          center: { lat: customerLatitude, lng: customerLongitude },
        });
        markersRef.current.map = map;

        new window.google.maps.Marker({
          position: { lat: customerLatitude, lng: customerLongitude },
          map,
          label: "You",
        });
        if (hasStore) {
          new window.google.maps.Marker({
            position: { lat: storeLatitude, lng: storeLongitude },
            map,
            label: "Store",
          });
        }
        if (hasPartner) {
          markersRef.current.partner = new window.google.maps.Marker({
            position: { lat: partnerLatitude, lng: partnerLongitude },
            map,
            label: "Partner",
          });
        }
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: customerLatitude, lng: customerLongitude });
        if (hasPartner) bounds.extend({ lat: partnerLatitude, lng: partnerLongitude });
        if (hasStore) bounds.extend({ lat: storeLatitude, lng: storeLongitude });
        map.fitBounds(bounds, 56);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [apiKey, hasCustomer, hasPartner, hasStore]);

  useEffect(() => {
    const marker = markersRef.current.partner;
    const map = markersRef.current.map;
    if (!marker || !hasPartner) return;
    marker.setPosition({ lat: partnerLatitude, lng: partnerLongitude });
    if (map) map.panTo({ lat: partnerLatitude, lng: partnerLongitude });
  }, [partnerLatitude, partnerLongitude, hasPartner]);

  if (!apiKey || !hasCustomer) return null;

  return (
    <View style={[styles.wrap, { height }]}>
      <View ref={containerRef} style={styles.map} />
    </View>
  );
}

export default function LiveTrackingMap(props) {
  return (
    <SafeMapBoundary>
      <LiveTrackingMapInner {...props} />
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
