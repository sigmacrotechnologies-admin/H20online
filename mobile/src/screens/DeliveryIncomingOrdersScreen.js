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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

export default function DeliveryIncomingOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = () => {
    return api.deliveryPartners.ordersIncoming()
      .then(setOrders)
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Incoming orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1EA7FD" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Incoming orders</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1EA7FD"]} />}
      >
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders assigned to you yet</Text>
            <Text style={styles.emptySub}>Suppliers will assign orders from their dashboard.</Text>
          </View>
        ) : (
          orders.map((o) => (
            <TouchableOpacity key={o.id} style={styles.card} activeOpacity={0.9}>
              <View style={styles.cardRow}>
                <Text style={styles.cardId}>Order #{o.id?.slice(-6) || "—"}</Text>
                <View style={[styles.statusBadge, o.status === "delivered" && styles.statusDelivered]}>
                  <Text style={styles.statusText}>{o.status === "delivered" ? "Delivered" : "In progress"}</Text>
                </View>
              </View>
              <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
              {o.address ? <Text style={styles.cardAddress} numberOfLines={2}>{o.address}</Text> : null}
              {o.supplierResponse?.eta ? <Text style={styles.cardEta}>ETA: {o.supplierResponse.eta}</Text> : null}
              <Text style={styles.cardTotal}>₹{o.total ?? 0}</Text>
              <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  statusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDelivered: { backgroundColor: "#D1FAE5" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#92400E" },
  cardCustomer: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 4 },
  cardAddress: { fontSize: 13, color: "#6B7C85", marginBottom: 4 },
  cardEta: { fontSize: 13, color: "#1EA7FD", marginBottom: 4 },
  cardTotal: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  cardDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
});
