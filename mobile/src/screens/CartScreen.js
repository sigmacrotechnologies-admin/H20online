import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const CartScreen = () => {
  const router = useRouter();
  const { cart, cartTotal, updateCartQty, removeFromCart } = useCart();

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.back()}>
            <Text style={styles.shopBtnText}>Continue shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
        <Text style={styles.headerTitle}>My Cart</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cart.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemSupplier}>{item.supplierName}</Text>
                <Text style={styles.itemPrice}>₹{item.price} x {item.qty || 1} = ₹{(item.price * (item.qty || 1))}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, (item.qty || 1) - 1)}>
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.qty || 1}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, (item.qty || 1) + 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{cartTotal}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push("/checkout")} activeOpacity={0.8}>
          <Text style={styles.checkoutBtnText}>Proceed to payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerBackBtn: { backgroundColor: "#f0f7fcd7", marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, marginLeft: 11, marginRight: 11 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 16, color: "#6B7C85", marginTop: 16 },
  shopBtn: { marginTop: 20, backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  shopBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  card: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  itemSupplier: { fontSize: 13, color: "#6B7C85", marginBottom: 8 },
  itemPrice: { fontSize: 14, fontWeight: "600", color: theme.primary },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 18, fontWeight: "600", color: "#1B2B34" },
  qtyValue: { fontSize: 16, fontWeight: "700", color: "#1B2B34", minWidth: 24, textAlign: "center" },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  removeText: { fontSize: 14, color: "#EF4444", fontWeight: "600" },
  totalCard: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 20, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  totalValue: { fontSize: 22, fontWeight: "800", color: theme.primary },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: theme.screenBackground, marginLeft: 11, marginRight: 11 },
  checkoutBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  checkoutBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
