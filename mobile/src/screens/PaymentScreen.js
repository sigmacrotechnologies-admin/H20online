import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
        >
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="card-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Select payment</Text>
              <Text style={styles.headerSubtitle}>Choose preferred payment method to place order</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
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
      </View>
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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerSection: { minHeight: 230, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 26 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: {
    marginTop: -36,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    flex: 1,
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#6B7C85", marginBottom: 12 },
  optionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, padding: 18, marginBottom: 12, elevation: 0, borderWidth: 2, borderColor: "transparent" },
  optionCardSelected: { borderColor: theme.primary, backgroundColor: theme.selectedTint },
  optionCardDisabled: { opacity: 0.6 },
  optionIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.selectedTint, justifyContent: "center", alignItems: "center", marginRight: 14 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: 18, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalValue: { fontSize: 20, fontWeight: "800", color: theme.primary },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: theme.screenBackground },
  payBtn: { backgroundColor: "#10B981", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
