import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { SectionCard, GradientButton, ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

export default function DeliveryFinancialsScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);

  const fetchAll = () => {
    return Promise.all([
      api.deliveryPartners.financials().catch(() => null),
      api.wallet.get().then((r) => r.balance).catch(() => null),
    ]).then(([financials, balance]) => {
      setData(financials);
      setWalletBalance(balance);
    });
  };

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll().finally(() => setRefreshing(false));
  };

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount to redeem.");
      return;
    }
    if (walletBalance != null && amount > walletBalance) {
      Alert.alert("Insufficient balance", `Your wallet balance is ₹${walletBalance}.`);
      return;
    }
    setRedeemLoading(true);
    try {
      await api.wallet.debit(amount);
      setWalletBalance((prev) => (prev != null ? prev - amount : 0));
      setRedeemAmount("");
      setShowRedeem(false);
      Alert.alert("Done", "Amount redeemed successfully.");
    } catch (e) {
      Alert.alert("Error", e.message || "Redeem failed.");
    } finally {
      setRedeemLoading(false);
    }
  };

  if (loading) {
    return (
      <DeliveryPartnerLayout title="Financials" subtitle="Wallet & earnings" icon="wallet-outline">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </DeliveryPartnerLayout>
    );
  }

  const totalDeliveries = data?.totalDeliveries ?? 0;
  const estimatedShare = data?.deliveryShareEstimated ?? 0;
  const walletEarnings = data?.walletEarnings ?? data?.deliveryShare ?? 0;
  const sharePercent = data?.deliverySharePercent ?? 10;
  const currency = data?.currency ?? "INR";
  const prefix = currency === "INR" ? "₹" : "";

  return (
    <>
      <DeliveryPartnerLayout title="Financials" subtitle="Wallet & delivery earnings" icon="wallet-outline">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={ui.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
          <SectionCard icon="cash-outline" title="Earnings" subtitle={`${sharePercent}% of order total on each delivery`}>
            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Paid to wallet</Text>
                <Text style={styles.metricValue}>{prefix}{walletEarnings}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Estimated ({sharePercent}%)</Text>
                <Text style={styles.metricValue}>{prefix}{estimatedShare}</Text>
              </View>
            </View>
            <View style={styles.metricCardFull}>
              <Text style={styles.metricLabel}>Completed deliveries</Text>
              <Text style={styles.metricValue}>{totalDeliveries}</Text>
            </View>
          </SectionCard>

          <SectionCard icon="wallet-outline" title="Wallet" subtitle="Redeem your delivery earnings">
            <Text style={styles.walletValue}>{prefix}{walletBalance ?? 0}</Text>
            <Text style={styles.walletHint}>Earnings from completed deliveries are added here.</Text>
            <GradientButton label="Redeem from wallet" onPress={() => setShowRedeem(true)} icon="arrow-down-circle-outline" />
          </SectionCard>
        </ScrollView>
      </DeliveryPartnerLayout>

      <Modal visible={showRedeem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redeem</Text>
              <TouchableOpacity onPress={() => { setShowRedeem(false); setRedeemAmount(""); }}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Amount to redeem (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={redeemAmount}
              onChangeText={setRedeemAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.modalHint}>Available: {prefix}{walletBalance ?? 0}</Text>
            <TouchableOpacity style={[styles.modalSubmit, redeemLoading && styles.modalSubmitDisabled]} onPress={handleRedeem} disabled={redeemLoading}>
              <Text style={styles.modalSubmitText}>{redeemLoading ? "Processing..." : "Redeem"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  metricRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  metricCardFull: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  metricLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  metricValue: { fontSize: 20, fontWeight: "800", color: theme.textPrimary, marginTop: 6 },
  walletValue: { fontSize: 28, fontWeight: "800", color: "#10B981", marginBottom: 6 },
  walletHint: { fontSize: 13, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  modalInput: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 8 },
  modalHint: { fontSize: 13, color: "#6B7C85", marginBottom: 20 },
  modalSubmit: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  modalSubmitDisabled: { opacity: 0.7 },
  modalSubmitText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
