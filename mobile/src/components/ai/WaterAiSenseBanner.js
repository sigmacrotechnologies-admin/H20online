import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { surfaceShadow } from "@/src/utils/platformStyles";

const PANEL_MIN_HEIGHT = 96;

function WaterAiSenseBanner({
  expanded,
  insight,
  loading,
  refreshing,
  error,
  onToggle,
  onRefresh,
  onViewReport,
  onAsk,
}) {
  const showPanel = expanded;
  const showSpinner = loading && !insight;
  const showRefreshing = refreshing && !!insight;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.9}>
        <LinearGradient
          colors={["#0F4C5C", "#1E6B7F", theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerIcon}>
            <Ionicons name="sparkles" size={22} color="#FBBF24" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>AI Water Sense</Text>
            <Text style={styles.bannerSubtitle}>
              {expanded ? "Your hydration prediction" : "Tap to view your AI prediction"}
            </Text>
          </View>
          <View style={styles.bannerCta}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {showPanel ? (
        <View style={[styles.predictionPanel, { minHeight: PANEL_MIN_HEIGHT }]}>
          {showSpinner ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.loadingText}>Preparing your prediction...</Text>
            </View>
          ) : null}

          {!showSpinner && error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!showSpinner && !error && insight ? (
            <View style={styles.predictionBody}>
              {showRefreshing ? (
                <View style={styles.refreshingBadge}>
                  <ActivityIndicator size="small" color={theme.accent} />
                  <Text style={styles.refreshingText}>Updating</Text>
                </View>
              ) : null}
              <Text style={styles.predictionText}>{insight}</Text>
            </View>
          ) : null}

          {!showSpinner && !error && !insight ? (
            <Text style={styles.predictionText}>Tap the banner above to load your prediction.</Text>
          ) : null}

          <View style={styles.actions}>
            {onRefresh ? (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onRefresh}
                activeOpacity={0.8}
                disabled={loading || refreshing}
              >
                <Ionicons name="refresh-outline" size={14} color={theme.link} />
                <Text style={styles.actionText}>Refresh</Text>
              </TouchableOpacity>
            ) : null}
            {onViewReport ? (
              <TouchableOpacity style={styles.actionBtn} onPress={onViewReport} activeOpacity={0.8}>
                <Ionicons name="document-text-outline" size={14} color={theme.link} />
                <Text style={styles.actionText}>AI Report</Text>
              </TouchableOpacity>
            ) : null}
            {onAsk ? (
              <TouchableOpacity style={styles.actionBtn} onPress={onAsk} activeOpacity={0.8}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.link} />
                <Text style={styles.actionText}>Ask AI</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default memo(WaterAiSenseBanner);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    backgroundColor: "#FFFFFF",
    ...surfaceShadow("md"),
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  bannerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3, lineHeight: 17 },
  bannerCta: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  predictionPanel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    backgroundColor: theme.contentPanelBackground,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  loadingText: { fontSize: 13, color: theme.textMuted },
  errorText: { fontSize: 14, color: "#DC2626", lineHeight: 21, marginBottom: 8 },
  predictionBody: { marginBottom: 8 },
  predictionText: { fontSize: 14, color: theme.textPrimary, lineHeight: 22 },
  refreshingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(51,175,193,0.1)",
  },
  refreshingText: { fontSize: 11, fontWeight: "700", color: theme.link },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.18)",
  },
  actionText: { fontSize: 12, fontWeight: "700", color: theme.link },
});
