import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import BackButton from "@/src/components/BackButton";
import { getOrderId } from "@/src/utils/orderId";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const PAYMENT_OPTIONS = [
  { id: "wallet", label: "Wallet", icon: "wallet-outline" },
  { id: "card", label: "Credit / Debit Card", icon: "card-outline" },
  { id: "upi", label: "UPI", icon: "phone-portrait-outline" },
  { id: "cod", label: "Cash on Delivery", icon: "cash-outline" },
];

const PaymentScreen = () => {
  const router = useRouter();
  const { cartTotal, placeOrder, getCheckoutDetails } = useCart();
  const { balance, setBalance } = useWallet();
  const [selected, setSelected] = useState("wallet");
  const [paying, setPaying] = useState(false);
  const canPayWithWallet = balance >= cartTotal;

  const handlePay = async () => {
    if (paying) return;
    if (selected === "wallet" && !canPayWithWallet) {
      alert("Insufficient wallet balance. Add money or choose another payment method.");
      return;
    }
    setPaying(true);
    try {
      const details = getCheckoutDetails();
      const order = await placeOrder(selected, details);
      const id = getOrderId(order);
      if (order && id) {
        if (selected === "wallet") api.wallet.get().then((d) => setBalance(d.balance ?? 0)).catch(() => {});
        setPaying(false);
        router.replace({ pathname: "/order-confirmed", params: { orderId: id } });
      } else {
        setPaying(false);
        alert("Order could not be placed. Please try again.");
      }
    } catch (err) {
      setPaying(false);
      alert(err.message || "Payment failed");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
        <Text style={styles.headerTitle}>Select payment</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Choose payment method</Text>
        {PAYMENT_OPTIONS.map((opt) => {
          const isWallet = opt.id === "wallet";
          const disabled = isWallet && !canPayWithWallet;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, selected === opt.id && styles.optionCardSelected, disabled && styles.optionCardDisabled]}
              onPress={() => !disabled && setSelected(opt.id)}
              activeOpacity={0.8}
              disabled={disabled}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name={opt.icon} size={24} color={theme.primary} />
              </View>
              <Text style={styles.optionLabel}>{opt.label}{isWallet ? ` (₹${balance})` : ""}</Text>
              {selected === opt.id && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
            </TouchableOpacity>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount to pay</Text>
          <Text style={styles.totalValue}>₹{cartTotal}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.8} disabled={paying}>
          <Text style={styles.payBtnText}>{paying ? "Placing order..." : "Pay ₹" + cartTotal}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerBackBtn: { backgroundColor: "#f0f7fcd7", marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, marginLeft: 11, marginRight: 11 },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#6B7C85", marginBottom: 12 },
  optionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2, borderWidth: 2, borderColor: "transparent" },
  optionCardSelected: { borderColor: theme.primary, backgroundColor: theme.selectedTint },
  optionCardDisabled: { opacity: 0.6 },
  optionIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.selectedTint, justifyContent: "center", alignItems: "center", marginRight: 14 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: 18, backgroundColor: "#f0f7fcd7", borderRadius: 16 },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalValue: { fontSize: 20, fontWeight: "800", color: theme.primary },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: theme.screenBackground, marginLeft: 11, marginRight: 11 },
  payBtn: { backgroundColor: "#10B981", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
