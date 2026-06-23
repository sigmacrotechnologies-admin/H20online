import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { SectionCard, ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

export default function DeliverySummaryScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = () => api.deliveryPartners.ordersSummary().then(setData).catch(() => setData(null));

  useEffect(() => {
    fetchSummary().finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <DeliveryPartnerLayout title="Order summary" icon="stats-chart-outline">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </DeliveryPartnerLayout>
    );
  }

  const total = data?.totalOrders ?? 0;
  const delivered = data?.delivered ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const cancelled = data?.cancelled ?? 0;

  return (
    <DeliveryPartnerLayout title="Order summary" subtitle="Totals & delivery progress" icon="stats-chart-outline">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={ui.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        <SectionCard icon="stats-chart-outline" title="Overview" subtitle="Your delivery performance at a glance">
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total orders</Text>
              <Text style={styles.statValue}>{total}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSuccess]}>
              <Text style={styles.statLabel}>Delivered</Text>
              <Text style={styles.statValue}>{delivered}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardInfo]}>
              <Text style={styles.statLabel}>In progress</Text>
              <Text style={styles.statValue}>{inProgress}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMuted]}>
              <Text style={styles.statLabel}>Cancelled</Text>
              <Text style={styles.statValue}>{cancelled}</Text>
            </View>
          </View>
        </SectionCard>

        <TouchableOpacity onPress={() => router.push("/delivery-incoming-orders")} activeOpacity={0.9}>
          <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orderDetailsBtn}>
            <Ionicons name="list-outline" size={22} color="#FFFFFF" />
            <Text style={styles.orderDetailsBtnText}>View incoming orders</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </DeliveryPartnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  statCardSuccess: { backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" },
  statCardInfo: { backgroundColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)" },
  statCardMuted: { backgroundColor: "rgba(107,124,133,0.06)" },
  statLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  statValue: { fontSize: 24, fontWeight: "800", color: theme.textPrimary, marginTop: 6 },
  orderDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  orderDetailsBtnText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
