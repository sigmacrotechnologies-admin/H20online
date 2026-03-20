import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.content}>
        <View style={styles.tickWrap}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </View>
        <Text style={styles.title}>Order confirmed</Text>
        <Text style={styles.thankYou}>Thank you!</Text>
        <Text style={styles.subtitle}>Your order has been placed successfully.</Text>
        {loadingOrder && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />}
        {order && <Text style={styles.orderId}>Order #{getOrderIdShort(order)}</Text>}
        {orderId && !order && !loadingOrder && <Text style={styles.orderId}>Order #{orderId.slice(-8)}</Text>}
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => {
            const id = orderId || getOrderId(order);
            router.push(id ? "/track-order?orderId=" + id : "/track-order");
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={22} color="#FFFFFF" />
          <Text style={styles.trackBtnText}>Track order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/dashboard")} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Back to dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OrderConfirmedScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  tickWrap: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#1B2B34", marginBottom: 8 },
  thankYou: { fontSize: 20, fontWeight: "700", color: theme.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7C85", marginBottom: 8 },
  orderId: { fontSize: 14, color: theme.primary, fontWeight: "600", marginBottom: 32 },
  trackBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, marginBottom: 16 },
  trackBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  backBtn: { paddingVertical: 14 },
  backBtnText: { fontSize: 16, fontWeight: "600", color: "#6B7C85" },
});
