import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import { SectionCard, EmptyState, SupplierPageHeader, GradientButton, ui } from "@/src/components/supplier/supplierUi";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  approved: { bg: "#D1FAE5", text: "#065F46" },
  rejected: { bg: "#FFE4E6", text: "#9F1239" },
};

export default function SupplierWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [showRedeem, setShowRedeem] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    accountHolderName: "",
    bankAccountNumber: "",
    ifscCode: "",
    upiId: "",
  });
  const mountedRef = useRef(true);
  const lastWalletRef = useRef(null);

  const loadAll = React.useCallback(async () => {
    try {
      const [walletData, prefillData, requestsData] = await Promise.all([
        api.wallet.get(),
        api.supplier.walletRedeemPrefill().catch(() => null),
        api.supplier.walletRedeemRequests().catch(() => ({ requests: [] })),
      ]);

      const first = Number(walletData?.balance ?? 0);
      const prev = Number(lastWalletRef.current?.balance ?? 0);
      let finalWallet = walletData;
      if (first === 0 && prev > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        finalWallet = await api.wallet.get();
      }

      if (mountedRef.current) {
        setWallet(finalWallet);
        lastWalletRef.current = finalWallet;
        setPrefill(prefillData);
        setRedeemRequests(requestsData?.requests || []);
      }
    } catch (_) {
      if (mountedRef.current) setWallet(lastWalletRef.current);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
      loadAll();
      const interval = setInterval(loadAll, 60 * 1000);
      return () => clearInterval(interval);
    }, [loadAll])
  );

  const openRedeemModal = () => {
    setForm({
      amount: prefill?.availableBalance ? String(Math.floor(prefill.availableBalance)) : "",
      accountHolderName: prefill?.accountHolderName || "",
      bankAccountNumber: prefill?.bankAccountNumber || "",
      ifscCode: prefill?.ifscCode || "",
      upiId: prefill?.upiId || "",
    });
    setShowRedeem(true);
  };

  const handleSubmitRedeem = async () => {
    const amount = Math.round(Number(form.amount));
    if (!Number.isFinite(amount) || amount < 1) {
      Alert.alert("Invalid amount", "Enter a valid amount to redeem.");
      return;
    }
    const available = prefill?.availableBalance ?? wallet?.balance ?? 0;
    if (amount > available) {
      Alert.alert("Insufficient balance", `Available balance is ₹${Number(available).toLocaleString()}.`);
      return;
    }
    if (!form.accountHolderName.trim()) {
      Alert.alert("Missing details", "Account holder name is required.");
      return;
    }
    const hasBank = form.bankAccountNumber.trim().length >= 8 && form.ifscCode.trim().length >= 8;
    const hasUpi = form.upiId.trim().length >= 3;
    if (!hasBank && !hasUpi) {
      Alert.alert("Missing details", "Provide bank account + IFSC, or a UPI ID.");
      return;
    }

    setSubmitting(true);
    try {
      await api.supplier.createWalletRedeemRequest({
        amount,
        accountHolderName: form.accountHolderName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        upiId: form.upiId.trim(),
      });
      setShowRedeem(false);
      Alert.alert(
        "Request submitted",
        "Your redeem request is pending admin approval. Wallet balance will be debited after approval."
      );
      loadAll();
    } catch (e) {
      Alert.alert("Error", e.message || "Could not submit redeem request.");
    } finally {
      setSubmitting(false);
    }
  };

  const txns = wallet?.transactions || [];
  const availableBalance = prefill?.availableBalance ?? wallet?.balance ?? 0;
  const pendingTotal = prefill?.pendingRedeemTotal ?? 0;

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

  const renderRedeemRequest = (r) => {
    const colors = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
    return (
      <View key={r.id} style={styles.redeemCard}>
        <View style={styles.redeemHeader}>
          <Text style={styles.redeemAmount}>₹{Number(r.amount || 0).toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{r.status}</Text>
          </View>
        </View>
        <Text style={styles.redeemMeta}>{r.accountHolderName}</Text>
        {r.bankAccountNumber ? (
          <Text style={styles.redeemMeta}>
            {r.bankAccountNumber} · {r.ifscCode}
          </Text>
        ) : null}
        {r.upiId ? <Text style={styles.redeemMeta}>UPI: {r.upiId}</Text> : null}
        {r.adminNote ? <Text style={styles.redeemNote}>Note: {r.adminNote}</Text> : null}
        <Text style={styles.redeemDate}>{new Date(r.createdAt).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <>
      <SupplierScreenShell
        showMenu
        tallHeader
        headerExtra={
          <SupplierPageHeader
            icon="wallet-outline"
            title="Wallet"
            subtitle="Balance, redeem to bank, and transactions"
            stats={[
              {
                icon: "cash-outline",
                label: "Available",
                value: `₹${Number(availableBalance).toLocaleString()}`,
              },
              {
                icon: "time-outline",
                label: "Pending redeem",
                value: pendingTotal > 0 ? `₹${Number(pendingTotal).toLocaleString()}` : "—",
              },
              { icon: "swap-horizontal-outline", label: "Transactions", value: String(txns.length) },
            ]}
          />
        }
      >
        <ScrollView
          contentContainerStyle={ui.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadAll();
              }}
              colors={[theme.accent]}
            />
          }
        >
          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
          ) : wallet ? (
            <>
              <SectionCard icon="arrow-down-circle-outline" title="Redeem to bank" subtitle="Transfer wallet balance to your bank or UPI">
                <Text style={styles.balanceLabel}>Wallet balance</Text>
                <Text style={styles.balanceValue}>₹{Number(wallet?.balance || 0).toLocaleString()}</Text>
                {pendingTotal > 0 ? (
                  <Text style={styles.pendingHint}>
                    ₹{Number(pendingTotal).toLocaleString()} reserved in pending redeem requests
                  </Text>
                ) : null}
                <Text style={styles.redeemHint}>
                  Submit bank account, IFSC, or UPI details. Admin will review and transfer funds; wallet is debited on approval.
                </Text>
                <GradientButton
                  label="Request redeem"
                  onPress={openRedeemModal}
                  icon="business-outline"
                  disabled={availableBalance < 1}
                />
              </SectionCard>

              <SectionCard icon="document-text-outline" title="Redeem requests" subtitle="Your payout request history">
                {redeemRequests.length === 0 ? (
                  <EmptyState icon="receipt-outline" title="No redeem requests" subtitle="Submit a request to transfer wallet balance to your bank." />
                ) : (
                  redeemRequests.map(renderRedeemRequest)
                )}
              </SectionCard>

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

      <Modal visible={showRedeem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redeem to bank / UPI</Text>
              <TouchableOpacity onPress={() => setShowRedeem(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, "") }))}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.modalHint}>Available: ₹{Number(availableBalance).toLocaleString()}</Text>

            <Text style={styles.modalLabel}>Account holder name</Text>
            <TextInput
              style={styles.modalInput}
              value={form.accountHolderName}
              onChangeText={(v) => setForm((f) => ({ ...f, accountHolderName: v }))}
              placeholder="As per bank records"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Bank account number</Text>
            <TextInput
              style={styles.modalInput}
              value={form.bankAccountNumber}
              onChangeText={(v) => setForm((f) => ({ ...f, bankAccountNumber: v.replace(/\s/g, "") }))}
              placeholder="Optional if UPI provided"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>IFSC code</Text>
            <TextInput
              style={styles.modalInput}
              value={form.ifscCode}
              onChangeText={(v) => setForm((f) => ({ ...f, ifscCode: v.toUpperCase() }))}
              placeholder="e.g. HDFC0001234"
              autoCapitalize="characters"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>UPI ID</Text>
            <TextInput
              style={styles.modalInput}
              value={form.upiId}
              onChangeText={(v) => setForm((f) => ({ ...f, upiId: v }))}
              placeholder="name@upi (optional if bank provided)"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.modalSubmit, submitting && styles.modalSubmitDisabled]}
              onPress={handleSubmitRedeem}
              disabled={submitting}
            >
              <Text style={styles.modalSubmitText}>{submitting ? "Submitting…" : "Submit redeem request"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
  balanceLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  balanceValue: { fontSize: 28, fontWeight: "800", color: "#10B981", marginTop: 4, marginBottom: 6 },
  pendingHint: { fontSize: 13, color: "#B45309", marginBottom: 6 },
  redeemHint: { fontSize: 13, color: theme.textMuted, marginBottom: 14, lineHeight: 18 },
  redeemCard: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    padding: 12,
    marginBottom: 10,
  },
  redeemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  redeemAmount: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  redeemMeta: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  redeemNote: { fontSize: 12, color: theme.textPrimary, marginTop: 6, fontStyle: "italic" },
  redeemDate: { fontSize: 11, color: theme.textMuted, marginTop: 6 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8, marginTop: 4 },
  modalInput: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  modalHint: { fontSize: 13, color: "#6B7C85", marginBottom: 12 },
  modalSubmit: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  modalSubmitDisabled: { opacity: 0.7 },
  modalSubmitText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
