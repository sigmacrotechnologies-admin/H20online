import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
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
      <SafeAreaView style={styles.container}>
        <DeliveryPartnerLayout title="Order summary" icon="stats-chart-outline">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </DeliveryPartnerLayout>
      </SafeAreaView>
    );
  }

  const total = data?.totalOrders ?? 0;
  const delivered = data?.delivered ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const cancelled = data?.cancelled ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryPartnerLayout title="Order summary" icon="stats-chart-outline">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentWrap}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total orders</Text>
          <Text style={styles.cardValue}>{total}</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Delivered</Text>
            <Text style={styles.cardValue}>{delivered}</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>In progress</Text>
            <Text style={styles.cardValue}>{inProgress}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cancelled</Text>
          <Text style={styles.cardValue}>{cancelled}</Text>
        </View>
        <TouchableOpacity style={styles.orderDetailsBtn} onPress={() => router.push("/delivery-incoming-orders")} activeOpacity={0.8}>
          <Ionicons name="list-outline" size={22} color="#FFFFFF" />
          <Text style={styles.orderDetailsBtnText}>Order details</Text>
        </TouchableOpacity>
        </ScrollView>
      </DeliveryPartnerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  contentWrap: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 20, marginBottom: 12 },
  cardHalf: { flex: 1, marginHorizontal: 6 },
  row: { flexDirection: "row", marginHorizontal: -6, marginBottom: 12 },
  cardLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: "700", color: "#1B2B34" },
  orderDetailsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 16, marginTop: 16 },
  orderDetailsBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
