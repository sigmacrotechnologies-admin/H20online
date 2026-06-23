import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

export default function DeliveryOrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = () => {
    return api.deliveryPartners.ordersHistory(statusFilter ? { status: statusFilter } : {})
      .then(setOrders)
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  };

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const statusLabel = (s) => (s === "delivered" ? "Delivered" : s === "cancelled" ? "Cancelled" : "In progress");

  return (
    <DeliveryPartnerLayout title="Order history" subtitle="Past & completed deliveries" icon="receipt-outline">
      <View style={styles.pagePad}>
        <View style={styles.filterRow}>
          {["", "in_progress", "delivered", "cancelled"].map((s) => (
            <TouchableOpacity
              key={s || "all"}
              style={[styles.filterChip, statusFilter === s && styles.filterChipSelected]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextSelected]}>{s || "All"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={ui.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
          ) : orders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No orders in history</Text>
            </View>
          ) : (
            orders.map((o) => (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardId}>Order #{o.id?.slice(-6) || "—"}</Text>
                  <View style={[styles.statusBadge, o.status === "delivered" && styles.statusDelivered, o.status === "cancelled" && styles.statusCancelled]}>
                    <Text style={styles.statusText}>{statusLabel(o.status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
                {o.address ? <Text style={styles.cardAddress} numberOfLines={2}>{o.address}</Text> : null}
                <Text style={styles.cardTotal}>₹{o.total ?? 0}</Text>
                <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </DeliveryPartnerLayout>
  );
}

const styles = StyleSheet.create({
  pagePad: { paddingHorizontal: 20, paddingTop: 24, flex: 1 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)" },
  filterChipSelected: { backgroundColor: theme.primary },
  filterChipText: { fontSize: 13, color: "#1B2B34", fontWeight: "600" },
  filterChipTextSelected: { color: "#FFF" },
  scroll: { flex: 1 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, color: "#6B7C85", marginTop: 12 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  statusBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDelivered: { backgroundColor: "#D1FAE5" },
  statusCancelled: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#1E40AF" },
  cardCustomer: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 4 },
  cardAddress: { fontSize: 13, color: "#6B7C85", marginBottom: 4 },
  cardTotal: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  cardDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
});
