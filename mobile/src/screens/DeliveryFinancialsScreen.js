import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

export default function DeliveryFinancialsScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFinancials = () => api.deliveryPartners.financials().then(setData).catch(() => setData(null));

  useEffect(() => {
    fetchFinancials().finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinancials().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Financials</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1EA7FD" />
        </View>
      </SafeAreaView>
    );
  }

  const totalDeliveries = data?.totalDeliveries ?? 0;
  const totalEarnings = data?.totalEarnings ?? 0;
  const deliveryShare = data?.deliveryShare ?? 0;
  const currency = data?.currency ?? "INR";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Financials</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1EA7FD"]} />}
      >
        <View style={styles.card}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="wallet-outline" size={36} color="#10B981" />
          </View>
          <Text style={styles.cardValue}>{currency === "INR" ? "₹" : ""}{deliveryShare}</Text>
          <Text style={styles.cardLabel}>Your delivery share (estimated)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{currency === "INR" ? "₹" : ""}{totalEarnings}</Text>
          <Text style={styles.cardLabel}>Total order value delivered</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{totalDeliveries}</Text>
          <Text style={styles.cardLabel}>Completed deliveries</Text>
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
  cardIconWrap: { marginBottom: 12 },
  cardValue: { fontSize: 26, fontWeight: "800", color: "#1B2B34" },
  cardLabel: { fontSize: 14, color: "#6B7C85", marginTop: 4 },
});
