import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
      <SafeAreaView style={styles.container}>
        <DeliveryPartnerLayout title="Financials" icon="wallet-outline">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </DeliveryPartnerLayout>
      </SafeAreaView>
    );
  }

  const totalDeliveries = data?.totalDeliveries ?? 0;
  const totalEarnings = data?.totalEarnings ?? 0;
  const deliveryShare = data?.deliveryShare ?? 0;
  const currency = data?.currency ?? "INR";
  const prefix = currency === "INR" ? "₹" : "";

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryPartnerLayout title="Financials" icon="wallet-outline">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentWrap}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your delivery share (estimated)</Text>
          <Text style={styles.cardValue}>{prefix}{deliveryShare}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total order value delivered</Text>
          <Text style={styles.cardValue}>{prefix}{totalEarnings}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Completed deliveries</Text>
          <Text style={styles.cardValue}>{totalDeliveries}</Text>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletRow}>
            <Ionicons name="wallet-outline" size={28} color="#10B981" />
            <Text style={styles.walletLabel}>Wallet balance</Text>
          </View>
          <Text style={styles.walletValue}>{prefix}{walletBalance ?? 0}</Text>
          <Text style={styles.walletHint}>Earnings from completed deliveries are added here.</Text>
          <TouchableOpacity style={styles.redeemBtn} onPress={() => setShowRedeem(true)} activeOpacity={0.8}>
            <Text style={styles.redeemBtnText}>Redeem from wallet</Text>
          </TouchableOpacity>
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  contentWrap: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 20, marginBottom: 12 },
  cardLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: "700", color: "#1B2B34" },
  walletCard: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 20, marginTop: 8, marginBottom: 24 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  walletLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  walletValue: { fontSize: 26, fontWeight: "800", color: "#10B981", marginBottom: 4 },
  walletHint: { fontSize: 13, color: "#6B7C85", marginBottom: 16 },
  redeemBtn: { backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  redeemBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
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
