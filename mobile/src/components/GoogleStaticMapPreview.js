import React from "react";
import { Image, View, StyleSheet } from "react-native";
import { getGoogleMapsApiKey } from "@/src/utils/mapRuntime";
import { theme } from "@/src/theme";

function buildStaticMapUrl({
  width = 400,
  height = 200,
  markers = [],
}) {
  const key = getGoogleMapsApiKey();
  if (!key) return null;
  const parts = markers
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
    .map((m) => `markers=color:${m.color || "red"}%7C${m.lat},${m.lng}`);
  if (!parts.length) return null;
  const size = `${Math.round(width)}x${Math.round(height)}`;
  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&${parts.join("&")}&key=${key}`;
}

export default function GoogleStaticMapPreview({
  fromLatitude,
  fromLongitude,
  toLatitude,
  toLongitude,
  partnerLatitude,
  partnerLongitude,
  height = 180,
}) {
  const markers = [];
  if (Number.isFinite(fromLatitude) && Number.isFinite(fromLongitude)) {
    markers.push({ lat: fromLatitude, lng: fromLongitude, color: "0x1E8FB1" });
  }
  if (Number.isFinite(toLatitude) && Number.isFinite(toLongitude)) {
    markers.push({ lat: toLatitude, lng: toLongitude, color: "0xEF4444" });
  }
  if (Number.isFinite(partnerLatitude) && Number.isFinite(partnerLongitude)) {
    markers.push({ lat: partnerLatitude, lng: partnerLongitude, color: "0x10B981" });
  }

  const uri = buildStaticMapUrl({ width: 400, height, markers });
  if (!uri) return null;

  return (
    <View style={[styles.wrap, { height }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#EAF2F8",
  },
  image: { width: "100%", height: "100%" },
});
