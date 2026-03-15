import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import OrderDetailsModal from "@/src/components/OrderDetailsModal";
import BackButton from "@/src/components/BackButton";

const OrderHistoryScreen = () => {
  const router = useRouter();
  const { orders } = useCart();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const statusColor = (status) => (status === "cancelled" ? "#EF4444" : status === "in_progress" ? "#0EA5E9" : "#10B981");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
        <Text style={styles.headerTitle}>Order history</Text>
      </View>
      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)} activeOpacity={0.8}>
              <View style={styles.cardRow}>
                <Text style={styles.orderId}>#{(item.id || "").slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                    {item.status === "cancelled" ? "Cancelled" : item.status === "in_progress" ? "In progress" : "Delivered"}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
              <Text style={styles.total}>₹{item.total}</Text>
              <Ionicons name="chevron-forward" size={20} color="#6B7C85" style={styles.chevron} />
            </TouchableOpacity>
          )}
        />
      )}
      <OrderDetailsModal visible={showDetails} onClose={() => setShowDetails(false)} order={selectedOrder} />
    </SafeAreaView>
  );
};

export default OrderHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerBackBtn: { backgroundColor: "#f0f7fcd7", marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, marginLeft: 11, marginRight: 11 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#6B7C85", marginTop: 16 },
  card: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2, position: "relative" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "600" },
  date: { fontSize: 13, color: "#6B7C85", marginTop: 8 },
  total: { fontSize: 18, fontWeight: "700", color: "#0EA5E9", marginTop: 4 },
  chevron: { position: "absolute", right: 18, top: 18 },
});
