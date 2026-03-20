import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { useWallet } from "@/src/context/WalletContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

export default function BillingScreen() {
  const router = useRouter();
  const { balance, setBalance } = useWallet();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);

  const fetchBills = useCallback(() => api.bills.list().then(setBills).catch(() => setBills([])), []);

  useEffect(() => {
    fetchBills().finally(() => setLoading(false));
  }, [fetchBills]);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills().finally(() => setRefreshing(false));
  };

  const handlePay = (bill) => {
    if (balance < bill.amount) {
      Alert.alert("Insufficient balance", "Add money to wallet first.");
      return;
    }
    setPayingId(bill.id);
    api.bills
      .pay(bill.id)
      .then((data) => {
        setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: "paid", paidAt: new Date() } : b)));
        if (data.balance != null) setBalance(data.balance);
      })
      .catch((e) => Alert.alert("Error", e.message || "Payment failed"))
      .finally(() => setPayingId(null));
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" />
        <Text style={styles.headerTitle}>Billing</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        <Text style={styles.sectionLabel}>Subscription bills</Text>
        <Text style={styles.hint}>Monthly bills are generated on the 1st. Pay within 5 days. You can pay from your wallet (₹{balance}).</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
        ) : bills.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySub}>When you have active subscriptions, monthly bills will appear here.</Text>
          </View>
        ) : (
          bills.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>{b.subscriptionLabel || "Subscription"}</Text>
                <View style={[styles.statusBadge, b.status === "paid" && styles.statusPaid, b.status === "overdue" && styles.statusOverdue]}>
                  <Text style={styles.statusText}>{b.status}</Text>
                </View>
              </View>
              <Text style={styles.cardPeriod}>{b.period} · Due {formatDate(b.dueDate)}</Text>
              <Text style={styles.cardAmount}>₹{b.amount}</Text>
              {b.status === "pending" || b.status === "overdue" ? (
                <TouchableOpacity
                  style={[styles.payBtn, (payingId === b.id || balance < b.amount) && styles.payBtnDisabled]}
                  onPress={() => handlePay(b)}
                  disabled={payingId === b.id || balance < b.amount}
                  activeOpacity={0.8}
                >
                  <Text style={styles.payBtnText}>{payingId === b.id ? "Paying…" : balance < b.amount ? "Insufficient balance" : "Pay from wallet"}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.paidText}>Paid {b.paidAt ? formatDate(b.paidAt) : ""}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#1B2B34", textAlign: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 6 },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 16 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  statusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPaid: { backgroundColor: "#D1FAE5" },
  statusOverdue: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#92400E" },
  cardPeriod: { fontSize: 13, color: "#6B7C85", marginBottom: 6 },
  cardAmount: { fontSize: 20, fontWeight: "700", color: theme.primary, marginBottom: 12 },
  payBtn: { backgroundColor: theme.primary, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  paidText: { fontSize: 14, color: "#059669" },
});
