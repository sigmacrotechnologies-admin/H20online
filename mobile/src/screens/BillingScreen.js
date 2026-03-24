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
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import BackButton from "@/src/components/BackButton";
import { useWallet } from "@/src/context/WalletContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 14, top: 62, width: 16, height: 22, phase: "b" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { left: 88, top: 94, width: 14, height: 20, phase: "a" },
  { right: 110, top: 8, width: 16, height: 22, phase: "a" },
  { right: 76, top: 66, width: 18, height: 24, phase: "b" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: 8, top: 98, width: 16, height: 22, phase: "a" },
];

export default function BillingScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { balance, setBalance } = useWallet();
  const dropletAnimA = React.useRef(new Animated.Value(0)).current;
  const dropletAnimB = React.useRef(new Animated.Value(0)).current;
  const dropletAnimC = React.useRef(new Animated.Value(0)).current;
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

  React.useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400), b = loop(dropletAnimB, 4200), c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerOverlay}>
            {HEADER_DROPLETS.map((drop, idx) => {
              const dropAnim = getDropletAnim(drop.phase);
              return (
                <Animated.View
                  key={`billing-drop-${idx}`}
                  style={[styles.dropletWrap, {
                    left: drop.left, right: drop.right, top: drop.top, width: drop.width, height: drop.height,
                    opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                    transform: [
                      { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                      { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                    ],
                  }]}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 60 80">
                    <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                  </Svg>
                </Animated.View>
              );
            })}
          </View>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Billing</Text>
              <Text style={styles.headerSubtitle}>Manage subscription bills and wallet payments</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  headerSection: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 34 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: { marginTop: -18, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, overflow: "hidden" },
  scrollContent: { padding: 16, paddingBottom: 40, paddingTop: 18 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 6 },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 16 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  card: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
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
