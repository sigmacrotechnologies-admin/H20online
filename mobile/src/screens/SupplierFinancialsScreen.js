import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import { StatCard, SectionCard, EmptyState, SupplierPageHeader, ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function SupplierFinancialsScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.supplier.financials().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="stats-chart-outline"
          title="Financials"
          subtitle="Revenue, fees and net earnings"
          stats={[
            {
              icon: "trending-up-outline",
              label: "Net earnings",
              value: `₹${Number(data?.netEarnings || 0).toLocaleString()}`,
            },
            {
              icon: "cash-outline",
              label: "Revenue",
              value: `₹${Number(data?.totalRevenue || 0).toLocaleString()}`,
            },
            {
              icon: "receipt-outline",
              label: "Orders",
              value: Number(data?.orderCount || 0).toLocaleString(),
            },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : data ? (
          <>
            <View style={ui.statsRow}>
              <StatCard
                icon="receipt-outline"
                label="Total orders"
                value={Number(data.orderCount || 0).toLocaleString()}
                accent={theme.accent}
              />
              <StatCard
                icon="cash-outline"
                label="Total revenue"
                value={`₹${Number(data.totalRevenue || 0).toLocaleString()}`}
                accent={theme.accent}
              />
            </View>

            <View style={ui.statsRow}>
              <StatCard
                icon="remove-circle-outline"
                label="Platform fee"
                value={`₹${Number(data.platformDeduction || 0).toLocaleString()}`}
                accent="#DC2626"
              />
              <StatCard
                icon="trending-up-outline"
                label="Net earnings"
                value={`₹${Number(data.netEarnings || 0).toLocaleString()}`}
                accent="#059669"
              />
            </View>

            <SectionCard icon="gift-outline" title="Admin bonus" subtitle="Extra benefits from H2O Online">
              <View style={styles.bonusContent}>
                <View style={styles.bonusIconWrap}>
                  <Ionicons name="gift-outline" size={22} color="#7C3AED" />
                </View>
                <View style={styles.bonusTextWrap}>
                  <Text style={styles.bonusLabel}>{data.bonusLabel || "H2O Online extra benefit"}</Text>
                  <Text style={styles.bonusAmount}>₹{Number(data.bonusAmount || 0).toLocaleString()}</Text>
                </View>
              </View>
            </SectionCard>
          </>
        ) : (
          <EmptyState
            icon="stats-chart-outline"
            title="Unable to load financials"
            subtitle="Please check your connection and try again later."
          />
        )}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
  bonusContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  bonusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bonusTextWrap: { flex: 1 },
  bonusLabel: { fontSize: 13, color: theme.textMuted, marginBottom: 4 },
  bonusAmount: { fontSize: 24, fontWeight: "800", color: "#7C3AED" },
});
