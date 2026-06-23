import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { formatTravelLabel } from "@/src/hooks/useStoreTravel";
import { formatDistanceEtaLabel } from "@/src/utils/orderEta";

export default function StoreTravelBadge({ info, loading, compact = false, etaText }) {
  const label = etaText ? formatDistanceEtaLabel(info, etaText) : formatTravelLabel(info);

  if (loading && !label) {
    return (
      <View style={[styles.row, compact && styles.rowCompact]}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={styles.muted}>Checking distance…</Text>
      </View>
    );
  }

  if (!label) return null;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Ionicons name="navigate-outline" size={compact ? 11 : 13} color={theme.accent} />
      <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  rowCompact: { marginTop: 2 },
  text: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: "600",
    flexShrink: 1,
  },
  textCompact: { fontSize: 11 },
  muted: { fontSize: 11, color: theme.textMuted },
});
