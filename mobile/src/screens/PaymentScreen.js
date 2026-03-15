import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import BackButton from "@/src/components/BackButton";

const PAYMENT_OPTIONS = [
  { id: "card", label: "Credit / Debit Card", icon: "card-outline" },
  { id: "upi", label: "UPI", icon: "phone-portrait-outline" },
  { id: "cod", label: "Cash on Delivery", icon: "cash-outline" },
];

const PaymentScreen = () => {
  const router = useRouter();
  const { cartTotal, placeOrder } = useCart();
  const [selected, setSelected] = useState("card");

  const handlePay = async () => {
    try {
      const order = await placeOrder(selected);
      if (order) router.replace({ pathname: "/order-confirmed", params: { orderId: order.id } });
    } catch (err) {
      alert(err.message || "Payment failed");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
        <Text style={styles.headerTitle}>Select payment</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Choose payment method</Text>
        {PAYMENT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, selected === opt.id && styles.optionCardSelected]}
            onPress={() => setSelected(opt.id)}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons name={opt.icon} size={24} color="#0EA5E9" />
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
            {selected === opt.id && <Ionicons name="checkmark-circle" size={24} color="#0EA5E9" />}
          </TouchableOpacity>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount to pay</Text>
          <Text style={styles.totalValue}>₹{cartTotal}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.8}>
          <Text style={styles.payBtnText}>Pay ₹{cartTotal}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerBackBtn: { backgroundColor: "#f0f7fcd7", marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, marginLeft: 11, marginRight: 11 },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: "#6B7C85", marginBottom: 12 },
  optionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2, borderWidth: 2, borderColor: "transparent" },
  optionCardSelected: { borderColor: "#0EA5E9", backgroundColor: "#E0F2FE" },
  optionIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginRight: 14 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: 18, backgroundColor: "#f0f7fcd7", borderRadius: 16 },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#0EA5E9" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: "#c6e2fa", marginLeft: 11, marginRight: 11 },
  payBtn: { backgroundColor: "#10B981", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
