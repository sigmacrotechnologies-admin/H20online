import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import { SectionCard, EmptyState, SupplierPageHeader, ui } from "@/src/components/supplier/supplierUi";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

export default function SupplierWalletScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const mountedRef = useRef(true);
  const lastWalletRef = useRef(null);

  const loadWallet = React.useCallback(async () => {
    try {
      const data = await api.wallet.get();
      const first = Number(data?.balance ?? 0);
      const prev = Number(lastWalletRef.current?.balance ?? 0);
      if (first === 0 && prev > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const retry = await api.wallet.get();
        if (mountedRef.current) {
          setWallet(retry);
          lastWalletRef.current = retry;
        }
        return;
      }
      if (mountedRef.current) {
        setWallet(data);
        lastWalletRef.current = data;
      }
    } catch (_) {
      if (mountedRef.current) setWallet(lastWalletRef.current);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadWallet();
      const interval = setInterval(loadWallet, 60 * 1000);
      return () => clearInterval(interval);
    }, [loadWallet])
  );

  const txns = wallet?.transactions || [];

  const renderTxn = (t, idx) => {
    const isCredit = t.type === "credit";
    return (
      <View key={`${t.ref || "tx"}-${idx}`} style={styles.txnCard}>
        <View style={[styles.txnIconWrap, isCredit ? styles.txnIconCredit : styles.txnIconDebit]}>
          <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={16} color={isCredit ? "#065F46" : "#9F1239"} />
        </View>
        <View style={styles.txnMain}>
          <Text style={styles.txnRef}>{t.ref || "wallet"}</Text>
          <Text style={styles.txnType}>{t.type || "credit"}</Text>
        </View>
        <Text style={[styles.txnAmount, isCredit ? styles.creditText : styles.debitText]}>
          {isCredit ? "+" : "-"}₹{Number(t.amount || 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="wallet-outline"
          title="Wallet"
          subtitle="Balance and recent transactions"
          stats={[
            {
              icon: "cash-outline",
              label: "Balance",
              value: `₹${Number(wallet?.balance || 0).toLocaleString()}`,
            },
            { icon: "swap-horizontal-outline", label: "Transactions", value: String(txns.length) },
            {
              icon: "arrow-down-outline",
              label: "Credits",
              value: String(txns.filter((t) => t.type === "credit").length),
            },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : wallet ? (
          <>
            <SectionCard icon="swap-horizontal-outline" title="Recent transactions" subtitle="Your wallet activity">
              {txns.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No transactions yet" subtitle="Wallet activity will appear here." />
              ) : (
                txns
                  .slice()
                  .reverse()
                  .map(renderTxn)
              )}
            </SectionCard>
          </>
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="Unable to load wallet"
            subtitle="Please check your connection and try again."
          />
        )}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    padding: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  txnIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txnIconCredit: { backgroundColor: "#D1FAE5" },
  txnIconDebit: { backgroundColor: "#FFE4E6" },
  txnMain: { flex: 1 },
  txnRef: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  txnType: { fontSize: 12, color: theme.textMuted, marginTop: 2, textTransform: "capitalize" },
  txnAmount: { fontSize: 15, fontWeight: "700" },
  creditText: { color: "#065F46" },
  debitText: { color: "#9F1239" },
});
