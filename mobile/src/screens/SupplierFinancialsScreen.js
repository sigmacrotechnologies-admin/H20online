import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function SupplierFinancialsScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.supplier.financials().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="stats-chart-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Financials</Text>
              <Text style={styles.headerSubtitle}>Track supplier earnings and platform split</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} /> : data ? (
          <>
            <View style={styles.metricGrid}>
              <View style={styles.metricTile}>
                <View style={styles.metricIconWrap}><Ionicons name="receipt-outline" size={20} color={theme.primary} /></View>
                <Text style={styles.metricLabel}>Total orders</Text>
                <Text style={styles.metricValue}>{Number(data.orderCount || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.metricTile}>
                <View style={styles.metricIconWrap}><Ionicons name="cash-outline" size={20} color={theme.primary} /></View>
                <Text style={styles.metricLabel}>Total revenue</Text>
                <Text style={styles.metricValue}>₹{Number(data.totalRevenue || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.metricTile}>
                <View style={styles.metricIconWrap}><Ionicons name="remove-circle-outline" size={20} color="#DC2626" /></View>
                <Text style={styles.metricLabel}>Platform deduction</Text>
                <Text style={styles.metricValueDeduction}>₹{Number(data.platformDeduction || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.metricTile}>
                <View style={styles.metricIconWrap}><Ionicons name="trending-up-outline" size={20} color="#0E9F6E" /></View>
                <Text style={styles.metricLabel}>Net earnings</Text>
                <Text style={styles.metricValue}>₹{Number(data.netEarnings || 0).toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.bonusCard}>
              <View style={styles.bonusHead}>
                <Ionicons name="gift-outline" size={20} color="#7C3AED" />
                <Text style={styles.bonusTitle}>Admin bonus / extra benefits</Text>
              </View>
              <Text style={styles.bonusLabel}>{data.bonusLabel || "H2O Online extra benefit"}</Text>
              <Text style={styles.bonusAmount}>₹{Number(data.bonusAmount || 0).toLocaleString()}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Unable to load financials</Text>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 28, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: {
    marginTop: -16,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    flex: 1,
    overflow: "hidden",
  },
  content: { flex: 1 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricTile: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    elevation: 0,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(14,165,233,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: { fontSize: 12, color: "#6B7C85", marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  metricValueDeduction: { fontSize: 18, fontWeight: "700", color: "#DC2626" },
  bonusCard: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  bonusHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  bonusTitle: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  bonusLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 6 },
  bonusAmount: { fontSize: 20, fontWeight: "700", color: "#7C3AED" },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
});
