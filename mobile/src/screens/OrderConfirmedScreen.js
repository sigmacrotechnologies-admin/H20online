import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import TrackOrderModal from "@/src/components/TrackOrderModal";

const OrderConfirmedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId;
  const { orders } = useCart();
  const [showTrack, setShowTrack] = useState(false);

  const order = orderId ? orders.find((o) => o.id === orderId) : orders[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.tickWrap}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </View>
        <Text style={styles.title}>Order placed</Text>
        <Text style={styles.subtitle}>Your order has been confirmed.</Text>
        {order && <Text style={styles.orderId}>Order #{(order.id || "").slice(-8)}</Text>}
        <TouchableOpacity style={styles.trackBtn} onPress={() => setShowTrack(true)} activeOpacity={0.8}>
          <Ionicons name="navigate-outline" size={22} color="#FFFFFF" />
          <Text style={styles.trackBtnText}>Track your order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/dashboard")} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Back to dashboard</Text>
        </TouchableOpacity>
      </View>
      <TrackOrderModal visible={showTrack} onClose={() => setShowTrack(false)} order={order} />
    </SafeAreaView>
  );
};

export default OrderConfirmedScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  tickWrap: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#1B2B34", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7C85", marginBottom: 8 },
  orderId: { fontSize: 14, color: "#0EA5E9", fontWeight: "600", marginBottom: 32 },
  trackBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0EA5E9", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, marginBottom: 16 },
  trackBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  backBtn: { paddingVertical: 14 },
  backBtnText: { fontSize: 16, fontWeight: "600", color: "#6B7C85" },
});
