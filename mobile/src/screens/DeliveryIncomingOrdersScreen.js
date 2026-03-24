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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { theme } from "@/src/theme";

export default function DeliveryIncomingOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");

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

  const handlePickedUp = (orderId) => {
    setActioningId(orderId);
    api.deliveryPartners.markPickedUp(orderId)
      .then(() => fetchOrders())
      .catch((e) => Alert.alert("Error", e.message || "Failed to update"))
      .finally(() => setActioningId(null));
  };

  const handleDelivered = (orderId) => {
    setActioningId(orderId);
    api.deliveryPartners.markDelivered(orderId)
      .then(() => fetchOrders())
      .catch((e) => Alert.alert("Error", e.message || "Failed to complete delivery"))
      .finally(() => setActioningId(null));
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const instantOrders = orders.filter((o) => (o.orderType || "instant") === "instant");
  const scheduledOrders = orders.filter((o) => (o.orderType || "instant") === "scheduled");
  const visibleOrders =
    activeTypeFilter === "instant"
      ? instantOrders
      : activeTypeFilter === "scheduled"
      ? scheduledOrders
      : orders;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DeliveryPartnerLayout title="Incoming orders" subtitle="Accept & deliver" icon="cart-outline">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </DeliveryPartnerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryPartnerLayout title="Incoming orders" subtitle="Accept & deliver" icon="cart-outline">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
        <View style={styles.typeTilesRow}>
          <TouchableOpacity
            style={[styles.typeTile, activeTypeFilter === "instant" && styles.typeTileActive]}
            onPress={() => setActiveTypeFilter("instant")}
            activeOpacity={0.85}
          >
            <View style={styles.typeTileTop}>
              <Text style={[styles.typeTileTitle, activeTypeFilter === "instant" && styles.typeTileTitleActive]}>Instant order</Text>
              {instantOrders.length > 0 ? <View style={styles.liveDot} /> : null}
            </View>
            <Text style={[styles.typeTileCount, activeTypeFilter === "instant" && styles.typeTileCountActive]}>{instantOrders.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTile, activeTypeFilter === "scheduled" && styles.typeTileActive]}
            onPress={() => setActiveTypeFilter("scheduled")}
            activeOpacity={0.85}
          >
            <View style={styles.typeTileTop}>
              <Text style={[styles.typeTileTitle, activeTypeFilter === "scheduled" && styles.typeTileTitleActive]}>Schedule for later</Text>
              {scheduledOrders.length > 0 ? <View style={[styles.liveDot, { backgroundColor: "#22C55E" }]} /> : null}
            </View>
            <Text style={[styles.typeTileCount, activeTypeFilter === "scheduled" && styles.typeTileCountActive]}>{scheduledOrders.length}</Text>
          </TouchableOpacity>
        </View>
        {visibleOrders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No incoming orders</Text>
            <Text style={styles.emptySub}>When suppliers assign orders to you, they will appear here. Completed orders are in Order history.</Text>
          </View>
        ) : (
          visibleOrders.map((o) => {
            const stage = o.supplierResponse?.deliveryStage || "accepted";
            const canPickedUp = stage === "accepted" && o.status === "in_progress";
            const canDeliver = stage === "picked_up" && o.status === "in_progress";
            const isDelivered = o.status === "delivered" || stage === "delivered";
            const busy = actioningId === o.id;
            return (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardId}>Order #{o.id?.slice(-6) || "—"}</Text>
                  <View style={[styles.statusBadge, isDelivered && styles.statusDelivered, stage === "picked_up" && !isDelivered && styles.statusPickedUp]}>
                    <Text style={styles.statusText}>
                      {isDelivered ? "Delivered" : stage === "picked_up" ? "Picked up" : "In progress"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
                <View style={[styles.orderTypePill, (o.orderType || "instant") === "scheduled" ? styles.orderTypeScheduled : styles.orderTypeInstant]}>
                  <Text style={styles.orderTypeText}>{(o.orderType || "instant") === "scheduled" ? "Scheduled" : "Instant"}</Text>
                </View>
                {o.address ? <Text style={styles.cardAddress} numberOfLines={2}>{o.address}</Text> : null}
                {o.supplierResponse?.eta ? <Text style={styles.cardEta}>ETA: {o.supplierResponse.eta}</Text> : null}
                <Text style={styles.cardTotal}>₹{o.total ?? 0}</Text>
                <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>
                {!isDelivered && (
                  <View style={styles.actionRow}>
                    {canPickedUp && (
                      <TouchableOpacity
                        style={[styles.actionBtn, busy && styles.actionBtnDisabled]}
                        onPress={() => handlePickedUp(o.id)}
                        disabled={busy}
                      >
                        <Ionicons name="cube-outline" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>{busy ? "Updating..." : "Order picked up"}</Text>
                      </TouchableOpacity>
                    )}
                    {canDeliver && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnGreen, busy && styles.actionBtnDisabled]}
                        onPress={() => handleDelivered(o.id)}
                        disabled={busy}
                      >
                        <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>{busy ? "Updating..." : "Complete delivery"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
        </ScrollView>
      </DeliveryPartnerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  typeTilesRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  typeTile: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  typeTileActive: { backgroundColor: theme.primary },
  typeTileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTileTitle: { fontSize: 13, fontWeight: "700", color: "#1B2B34" },
  typeTileTitleActive: { color: "#FFFFFF" },
  typeTileCount: { fontSize: 20, fontWeight: "800", color: theme.primary, marginTop: 8 },
  typeTileCountActive: { color: "#FFFFFF" },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  statusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPickedUp: { backgroundColor: "#DBEAFE" },
  statusDelivered: { backgroundColor: "#D1FAE5" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#92400E" },
  cardCustomer: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 4 },
  orderTypePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  orderTypeInstant: { backgroundColor: "#FEE2E2" },
  orderTypeScheduled: { backgroundColor: "#DCFCE7" },
  orderTypeText: { fontSize: 11, fontWeight: "700", color: "#1F2937" },
  cardAddress: { fontSize: 13, color: "#6B7C85", marginBottom: 4 },
  cardEta: { fontSize: 13, color: theme.primary, marginBottom: 4 },
  cardTotal: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  cardDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.primary, paddingVertical: 10, borderRadius: 12 },
  actionBtnGreen: { backgroundColor: "#10B981" },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});
