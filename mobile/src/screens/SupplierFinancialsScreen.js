import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

export default function SupplierFinancialsScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.supplier.financials().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Financials</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color="#1EA7FD" style={{ marginTop: 24 }} /> : data ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total revenue</Text>
              <Text style={styles.cardValue}>₹{Number(data.totalRevenue || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Platform deduction (30%)</Text>
              <Text style={styles.cardValueDeduction}>₹{Number(data.platformDeduction || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Net earnings</Text>
              <Text style={styles.cardValue}>₹{Number(data.netEarnings || 0).toLocaleString()}</Text>
            </View>
            <Text style={styles.orderCount}>Total orders: {data.orderCount || 0}</Text>
          </>
        ) : (
          <Text style={styles.empty}>Unable to load financials</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  content: { flex: 1 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 20, marginBottom: 12 },
  cardLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: "700", color: "#1B2B34" },
  cardValueDeduction: { fontSize: 20, fontWeight: "700", color: "#DC2626" },
  orderCount: { fontSize: 15, color: "#6B7C85", marginTop: 16 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
});
