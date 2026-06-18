import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import WalletModal from "@/src/components/WalletModal";
import { getOrderId } from "@/src/utils/orderId";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const PAYMENT_OPTIONS = [
  {
    id: "wallet",
    label: "H2 Wallet",
    desc: "Pay instantly from wallet balance",
    icon: "wallet-outline",
    accent: "#059669",
  },
  {
    id: "upi",
    label: "UPI",
    desc: "GPay, PhonePe, Paytm & more",
    icon: "phone-portrait-outline",
    accent: "#0E7490",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    desc: "Visa, Mastercard, RuPay",
    icon: "card-outline",
    accent: "#7C3AED",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay when order arrives",
    icon: "cash-outline",
    accent: "#D97706",
  },
];

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const PaymentScreen = () => {
  const router = useRouter();
  const { cart, cartCount, cartTotal, placeOrder, getCheckoutDetails } = useCart();
  const { balance, setBalance } = useWallet();
  const [selected, setSelected] = useState("wallet");
  const [paying, setPaying] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const canPayWithWallet = balance >= cartTotal;
  const shortfall = Math.max(0, cartTotal - balance);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const checkoutDetails = getCheckoutDetails?.() || {};
  const deliveryAddress = checkoutDetails.address?.trim() || "";
  const selectedOption = PAYMENT_OPTIONS.find((o) => o.id === selected);
  const itemCount = cart.reduce((sum, i) => sum + (i.qty || 1), 0);

  useFocusEffect(
    useCallback(() => {
      if (cart.length === 0) {
        router.replace("/cart");
        return;
      }
      const details = getCheckoutDetails?.();
      if (!details?.address?.trim()) {
        router.replace("/checkout");
      }
    }, [cart.length, getCheckoutDetails, router])
  );

  const handlePay = async () => {
    if (paying) return;
    if (selected === "wallet" && !canPayWithWallet) {
      setShowWallet(true);
      return;
    }
    setPaying(true);
    try {
      const details = getCheckoutDetails();
      const order = await placeOrder(selected, details);
      const id = getOrderId(order);
      if (order && id) {
        if (selected === "wallet") {
          api.wallet.get().then((d) => setBalance(d.balance ?? 0)).catch(() => {});
        }
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

  const walletNeedsTopUp = selected === "wallet" && !canPayWithWallet;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.headerSubtitle}>Review total and choose how to pay</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.amountCard}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.amountGradient}>
                <View style={styles.amountLeft}>
                  <View style={styles.amountIcon}>
                    <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Amount to pay</Text>
                    <Text style={styles.amountHint}>
                      {itemCount} item{itemCount !== 1 ? "s" : ""} · inclusive of item charges
                    </Text>
                  </View>
                </View>
                <Text style={styles.amountValue}>₹{cartTotal}</Text>
              </LinearGradient>
            </View>

            <SectionCard icon="bag-check-outline" title="Order recap" subtitle="Items and delivery details">
              {cart.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.recapRow}>
                  <Text style={styles.recapItemName} numberOfLines={1}>
                    {item.qty || 1}× {item.productName}
                  </Text>
                  <Text style={styles.recapItemPrice}>₹{(item.price || 0) * (item.qty || 1)}</Text>
                </View>
              ))}
              {cart.length > 3 ? (
                <Text style={styles.recapMore}>+{cart.length - 3} more item{cart.length - 3 !== 1 ? "s" : ""}</Text>
              ) : null}
              {deliveryAddress ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color={theme.accent} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {deliveryAddress}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.editCheckoutLink} onPress={() => router.push("/checkout")} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={16} color={theme.link} />
                <Text style={styles.editCheckoutText}>Edit checkout details</Text>
              </TouchableOpacity>
            </SectionCard>

            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill details</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total ({cartCount})</Text>
                <Text style={styles.billValue}>₹{cartTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery</Text>
                <Text style={styles.billValueFree}>Included</Text>
              </View>
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>Total payable</Text>
                <Text style={styles.billTotalValue}>₹{cartTotal}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.walletCard} onPress={() => setShowWallet(true)} activeOpacity={0.88}>
              <LinearGradient colors={["#059669", "#047857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletGradient}>
                <View style={styles.walletLeft}>
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.walletLabel}>H2 Wallet balance</Text>
                    <Text style={styles.walletTap}>Tap to add or manage balance</Text>
                  </View>
                </View>
                <Text style={styles.walletBalance}>₹{balance}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {selected === "wallet" && !canPayWithWallet ? (
              <View style={styles.lowBalanceCard}>
                <View style={styles.lowBalanceTop}>
                  <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                  <View style={styles.lowBalanceTextWrap}>
                    <Text style={styles.lowBalanceTitle}>Insufficient wallet balance</Text>
                    <Text style={styles.lowBalanceDesc}>Add ₹{shortfall} more to pay with wallet, or choose another method.</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.addMoneyBtnWrap} onPress={() => setShowWallet(true)} activeOpacity={0.9}>
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.addMoneyBtn}>
                    <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.addMoneyBtnText}>Add money to wallet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}

            <SectionCard icon="card-outline" title="Payment method" subtitle="Select one option below">
              {PAYMENT_OPTIONS.map((opt) => {
                const isWallet = opt.id === "wallet";
                const isSelected = selected === opt.id;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setSelected(opt.id)}
                    activeOpacity={0.88}
                  >
                    {isSelected ? (
                      <LinearGradient colors={[theme.medium, theme.accent]} style={styles.optionIconActive}>
                        <Ionicons name={opt.icon} size={22} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.optionIconWrap, { backgroundColor: `${opt.accent}14` }]}>
                        <Ionicons name={opt.icon} size={22} color={opt.accent} />
                      </View>
                    )}
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionLabel}>
                        {opt.label}
                        {isWallet ? ` · ₹${balance}` : ""}
                      </Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                      {isWallet && !canPayWithWallet ? (
                        <Text style={styles.optionWarn}>Need ₹{shortfall} more for this order</Text>
                      ) : null}
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </SectionCard>

            <View style={styles.secureCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
              <View style={styles.secureTextWrap}>
                <Text style={styles.secureTitle}>Secure checkout</Text>
                <Text style={styles.secureDesc}>Your payment details are encrypted and never stored on device.</Text>
              </View>
            </View>

            {selectedOption ? (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryLabel}>Paying with</Text>
                <Text style={styles.selectedSummaryValue}>{selectedOption.label}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerLabel}>Total payable</Text>
          <Text style={styles.footerTotal}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity style={[styles.payBtnWrap, paying && styles.payBtnDisabled]} onPress={handlePay} activeOpacity={0.9} disabled={paying}>
          <LinearGradient
            colors={paying ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payBtn}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <View style={styles.payBtnLeft}>
                  <Ionicons name={walletNeedsTopUp ? "wallet-outline" : "lock-closed-outline"} size={16} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>
                    {walletNeedsTopUp ? `Add ₹${shortfall} to pay` : `Pay ₹${cartTotal}`}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <WalletModal visible={showWallet} onClose={() => setShowWallet(false)} />
    </SafeAreaView>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 },

  amountCard: { borderRadius: 20, overflow: "hidden", marginBottom: 14 },
  amountGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  amountLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  amountIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  amountLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  amountHint: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  amountValue: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  recapRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  recapItemName: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  recapItemPrice: { fontSize: 14, fontWeight: "700", color: theme.accent },
  recapMore: { fontSize: 12, fontWeight: "600", color: theme.textMuted, marginBottom: 10 },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(51,175,193,0.06)",
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  addressText: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  editCheckoutLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  editCheckoutText: { fontSize: 13, fontWeight: "600", color: theme.link },

  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  billTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginBottom: 12 },
  billRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  billLabel: { fontSize: 13, color: theme.textMuted },
  billValue: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  billValueFree: { fontSize: 13, fontWeight: "600", color: "#059669" },
  billDivider: { height: 1, backgroundColor: "rgba(214,234,242,0.95)", marginVertical: 8 },
  billTotalLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  billTotalValue: { fontSize: 18, fontWeight: "800", color: theme.accent },

  walletCard: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  walletGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  walletTap: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  walletBalance: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },

  lowBalanceCard: {
    backgroundColor: "rgba(220,38,38,0.05)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  lowBalanceTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  lowBalanceTextWrap: { flex: 1 },
  lowBalanceTitle: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
  lowBalanceDesc: { fontSize: 12, color: theme.textMuted, marginTop: 4, lineHeight: 17 },
  addMoneyBtnWrap: { borderRadius: 12, overflow: "hidden" },
  addMoneyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  addMoneyBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FCFD",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 12,
  },
  optionCardSelected: { borderColor: theme.accent, backgroundColor: "rgba(51,175,193,0.06)" },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  optionDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  optionWarn: { fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 4 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: theme.accent },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.accent },

  secureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 16,
    padding: 14,
    marginTop: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.15)",
  },
  secureTextWrap: { flex: 1 },
  secureTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  secureDesc: { fontSize: 12, color: theme.textMuted, marginTop: 4, lineHeight: 17 },

  selectedSummary: { alignItems: "center", paddingVertical: 8, marginBottom: 8 },
  selectedSummaryLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  selectedSummaryValue: { fontSize: 14, fontWeight: "700", color: theme.link, marginTop: 4 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  footerSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  footerLabel: { fontSize: 13, fontWeight: "600", color: theme.textMuted },
  footerTotal: { fontSize: 22, fontWeight: "800", color: theme.accent },
  payBtnWrap: { borderRadius: 16, overflow: "hidden" },
  payBtnDisabled: { opacity: 0.95 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 54,
  },
  payBtnLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  payBtnTextDisabled: { color: "#8A9AA3" },
});
