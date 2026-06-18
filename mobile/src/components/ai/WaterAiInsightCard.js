import React from "react";
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

export default function WaterAiInsightCard({
  title = "AI Water Sense",
  insight,
  loading,
  error,
  onRefresh,
  onViewReport,
  onAsk,
  compact = false,
}) {
  return (
    <LinearGradient
      colors={["#0F4C5C", "#1E6B7F", theme.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.sparkleWrap}>
            <Ionicons name="sparkles" size={16} color="#FBBF24" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Smart</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>Analyzing your hydration data...</Text>
        </View>
      ) : error ? (
        <Text style={styles.body}>{error}</Text>
      ) : (
        <Text style={styles.body}>{insight || "Log water intake to unlock personalized AI insights."}</Text>
      )}

      <View style={styles.actions}>
        {onRefresh ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onRefresh} activeOpacity={0.8} disabled={loading}>
            <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        ) : null}
        {onViewReport ? (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onViewReport} activeOpacity={0.8}>
            <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionText}>AI Report</Text>
          </TouchableOpacity>
        ) : null}
        {onAsk ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onAsk} activeOpacity={0.8}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionText}>Ask AI</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14 },
      android: { elevation: 0 },
    }),
  },
  cardCompact: { marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  sparkleWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  badge: { backgroundColor: "rgba(251,191,36,0.22)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#FDE68A", textTransform: "uppercase", letterSpacing: 0.3 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  loadingText: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
  body: { fontSize: 14, color: "rgba(255,255,255,0.94)", lineHeight: 21, marginBottom: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  actionBtnPrimary: { backgroundColor: "rgba(255,255,255,0.28)" },
  actionText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
