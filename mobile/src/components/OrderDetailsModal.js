import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";

export default function OrderDetailsModal({ visible, onClose, order }) {
  const { cancelOrder } = useCart();

  if (!order) return null;

  const statusLabel = order.status === "cancelled" ? "Cancelled" : order.status === "in_progress" ? "In progress" : "Delivered";

  const handleCancel = () => {
    cancelOrder(order.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Order details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <Text style={styles.orderId}>Order #{order.id.slice(-8)}</Text>
            <Text style={styles.date}>{new Date(order.date).toLocaleString()}</Text>
            <Text style={styles.sectionLabel}>Items</Text>
            {(order.items || []).map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQty}>× {item.qty || 1} — ₹{(item.price || 0) * (item.qty || 1)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{order.total}</Text>
            </View>
            <Text style={styles.addressLabel}>Delivery address</Text>
            <Text style={styles.address}>{order.address || "Current location"}</Text>
          </ScrollView>
          {order.status === "in_progress" && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  scroll: { maxHeight: 360 },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#E0F2FE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 10 },
  statusText: { fontSize: 14, fontWeight: "600", color: "#0EA5E9" },
  orderId: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  date: { fontSize: 13, color: "#6B7C85", marginTop: 4, marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#6B7C85", marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  itemName: { flex: 1, fontSize: 14, color: "#1B2B34" },
  itemQty: { fontSize: 14, color: "#6B7C85" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#0EA5E9" },
  addressLabel: { fontSize: 14, fontWeight: "600", color: "#6B7C85", marginTop: 16 },
  address: { fontSize: 14, color: "#1B2B34", marginTop: 4 },
  cancelBtn: { marginTop: 20, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 16, fontWeight: "600", color: "#EF4444" },
});
