import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "@/src/context/WalletContext";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "";

function AmountField({ label, icon, value, onChangeText, placeholder, actionLabel, onAction, loading }) {
  return (
    <View style={styles.amountSection}>
      <Text style={styles.amountLabel}>{label}</Text>
      <View style={styles.amountRow}>
        <View style={styles.amountInputWrap}>
          <Ionicons name={icon} size={18} color={theme.textMuted} style={styles.amountInputIcon} />
          <Text style={styles.rupeePrefix}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
        </View>
        <TouchableOpacity onPress={onAction} activeOpacity={0.9} disabled={loading} style={styles.amountActionWrap}>
          <LinearGradient colors={loading ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]} style={styles.amountActionPrimary}>
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.amountActionPrimaryText}>{actionLabel}</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WalletModal({ visible, onClose }) {
  const { balance, setBalance } = useWallet();
  const { user } = useAuth();
  const [addValue, setAddValue] = useState("");
  const [busy, setBusy] = useState(false);

  const handleTopUp = async () => {
    const amount = Math.round(Number(addValue));
    if (!addValue || !Number.isFinite(amount) || amount < 1) {
      Alert.alert("Invalid amount", "Enter a valid amount to add.");
      return;
    }

    setBusy(true);
    try {
      const createRes = await api.payments.razorpayWalletTopupCreate({ amount });
      const keyId = RAZORPAY_KEY_ID || createRes.key_id;
      const { openRazorpayCheckout } = await import("@/src/utils/razorpayCheckout");
      const paymentResult = await openRazorpayCheckout({
        keyId,
        orderId: createRes.order_id,
        amount: createRes.amount,
        description: `H2O wallet top-up · ₹${amount}`,
        prefill: {
          contact: user?.phone || "",
          name: user?.name || "",
        },
      });

      const result = await api.payments.razorpayWalletTopupVerify({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        amount,
      });

      setBalance(result.balance ?? balance);
      setAddValue("");
      Alert.alert(
        "Wallet updated",
        result.alreadyCredited
          ? "This payment was already credited to your wallet."
          : `₹${amount} added to your wallet successfully.`
      );
    } catch (err) {
      Alert.alert("Top-up failed", err.message || "Could not add money to wallet.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickAdd = (amount) => {
    setAddValue(String(amount));
  };

  const handleClose = () => {
    setAddValue("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheetPanel}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sheetHero}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeroRow}>
              <View style={styles.sheetHeroLeft}>
                <View style={styles.sheetHeroIcon}>
                  <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sheetHeroTitle}>H2 Wallet</Text>
                  <Text style={styles.sheetHeroSubtitle}>Add money via Razorpay</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.sheetHeroClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceHeroCard}>
              <Text style={styles.balanceHeroLabel}>Available balance</Text>
              <Text style={styles.balanceHeroValue}>₹{Number(balance || 0).toLocaleString("en-IN")}</Text>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Quick add</Text>
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((amount) => {
                  const selected = addValue === String(amount);
                  return (
                    <TouchableOpacity key={amount} onPress={() => handleQuickAdd(amount)} activeOpacity={0.88}>
                      {selected ? (
                        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.quickChip}>
                          <Text style={styles.quickChipTextSelected}>₹{amount}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.quickChipMuted}>
                          <Text style={styles.quickChipText}>₹{amount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formCard}>
              <AmountField
                label="Add money (UPI / card via Razorpay)"
                icon="card-outline"
                value={addValue}
                onChangeText={setAddValue}
                placeholder="Enter amount"
                actionLabel="Pay & add"
                onAction={handleTopUp}
                loading={busy}
              />

              <View style={styles.tipCard}>
                <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
                <Text style={styles.tipText}>
                  Wallet balance increases only after a successful Razorpay payment. Admin can also adjust your wallet if needed.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.doneBtnWrap} onPress={handleClose} activeOpacity={0.9}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  sheetPanel: {
    maxHeight: "88%",
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  sheetHero: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginBottom: 14,
  },
  sheetHeroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetHeroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sheetHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  sheetHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  sheetHeroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  sheetHeroClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceHeroCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  balanceHeroLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  balanceHeroValue: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", marginTop: 4, letterSpacing: -0.5 },

  sheetScroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  quickSection: { marginBottom: 16 },
  quickTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 10 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  quickChipMuted: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  quickChipTextSelected: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  quickChipText: { fontSize: 14, fontWeight: "600", color: theme.textSecondary },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 18,
  },
  amountSection: { gap: 8 },
  amountLabel: { fontSize: 13, fontWeight: "700", color: theme.textPrimary },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amountInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    paddingHorizontal: 12,
  },
  amountInputIcon: { marginRight: 4 },
  rupeePrefix: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginRight: 4 },
  amountInput: { flex: 1, paddingVertical: 13, fontSize: 16, color: theme.textPrimary },
  amountActionWrap: { borderRadius: 12, overflow: "hidden" },
  amountActionPrimary: { paddingHorizontal: 14, paddingVertical: 13, minWidth: 96, alignItems: "center" },
  amountActionPrimaryText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(30,143,177,0.08)",
    borderWidth: 1,
    borderColor: "rgba(30,143,177,0.14)",
  },
  tipText: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    backgroundColor: theme.contentPanelBackground,
  },
  doneBtnWrap: { borderRadius: 16, overflow: "hidden" },
  doneBtn: { alignItems: "center", paddingVertical: 14 },
  doneBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
