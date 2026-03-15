import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

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
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Order summary</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1EA7FD" />
        </View>
      </SafeAreaView>
    );
  }

  const total = data?.totalOrders ?? 0;
  const delivered = data?.delivered ?? 0;
  const inProgress = data?.inProgress ?? 0;
  const earnings = data?.totalEarnings ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Order summary</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1EA7FD"]} />}
      >
        <View style={styles.card}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="cart-outline" size={32} color="#1EA7FD" />
          </View>
          <Text style={styles.cardValue}>{total}</Text>
          <Text style={styles.cardLabel}>Total orders</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardValue}>{delivered}</Text>
            <Text style={styles.cardLabel}>Delivered</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardValue}>{inProgress}</Text>
            <Text style={styles.cardLabel}>In progress</Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="wallet-outline" size={32} color="#10B981" />
          </View>
          <Text style={styles.cardValue}>₹{earnings}</Text>
          <Text style={styles.cardLabel}>Total earnings</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, padding: 24, marginBottom: 16, alignItems: "center" },
  cardHalf: { flex: 1, marginHorizontal: 6 },
  row: { flexDirection: "row", marginHorizontal: -6, marginBottom: 16 },
  cardIconWrap: { marginBottom: 12 },
  cardValue: { fontSize: 28, fontWeight: "800", color: "#1B2B34" },
  cardLabel: { fontSize: 14, color: "#6B7C85", marginTop: 4 },
});
