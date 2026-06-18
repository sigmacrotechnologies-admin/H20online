import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image, Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppLogo from "@/src/components/AppLogo";
import BackButton from "@/src/components/BackButton";
import { useCart } from "@/src/context/CartContext";
import { api } from "@/src/api/client";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { theme } from "@/src/theme";

const OrderConfirmedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderIdParam = params.orderId ?? params?.orderId;
  const orderId = typeof orderIdParam === "string" ? orderIdParam : null;
  const { orders, refreshOrders } = useCart();
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(!!orderId);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const orderFromList = orderId ? orders.find((o) => getOrderId(o) === orderId) : orders[0];
  const order = orderFromList || fetchedOrder;

  useEffect(() => {
    if (!orderId) {
      setLoadingOrder(false);
      return;
    }
    if (orderFromList) {
      setLoadingOrder(false);
      return;
    }
    let cancelled = false;
    setLoadingOrder(true);
    api.orders
      .get(orderId)
      .then((data) => {
        if (!cancelled) setFetchedOrder(data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingOrder(false);
      });
    refreshOrders();
    return () => { cancelled = true; };
  }, [orderId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
        >
          <View style={styles.headerLogoRow}>
            <AppLogo size="header" />
          </View>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.replace("/dashboard")} />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Order confirmed</Text>
              <Text style={styles.headerSubtitle}>Your order has been placed successfully</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
      <View style={styles.content}>
        <View style={styles.confirmCard}>
          <View style={styles.tickWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#10B981" />
          </View>
          <Text style={styles.thankYou}>Thank you! Your order has been placed.</Text>
          <Text style={styles.subtitle}>Order confirmed successfully.</Text>
          {loadingOrder && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />}
          {order && <Text style={styles.orderId}>Order ID: {getOrderIdShort(order)}</Text>}
          {orderId && !order && !loadingOrder && <Text style={styles.orderId}>Order ID: {orderId.slice(-8)}</Text>}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => {
                const id = orderId || getOrderId(order);
                router.push(id ? "/track-order?orderId=" + id : "/track-order");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
              <Text style={styles.trackBtnText}>Track order</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/dashboard")} activeOpacity={0.8}>
              <Text style={styles.backBtnText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </View>
    </SafeAreaView>
  );
};

export default OrderConfirmedScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerSection: { minHeight: 230, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 26 },
  headerLogoRow: { alignItems: "center", marginBottom: 12, zIndex: 2 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: {
    marginTop: -38,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
    flex: 1,
    overflow: "hidden",
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 },
  confirmCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  tickWrap: { marginBottom: 12 },
  thankYou: { fontSize: 21, fontWeight: "800", color: theme.primary, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#6B7C85", textAlign: "center", marginBottom: 10 },
  orderId: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: "700",
    marginBottom: 14,
    backgroundColor: theme.selectedTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionRow: { width: "100%", gap: 10 },
  trackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 16 },
  trackBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  backBtn: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: "rgba(30,143,177,0.22)" },
  backBtnText: { fontSize: 15, fontWeight: "700", color: "#4B5563" },
});
