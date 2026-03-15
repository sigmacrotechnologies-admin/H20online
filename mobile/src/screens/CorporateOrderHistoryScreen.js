import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import BackButton from "@/src/components/BackButton";

const CorporateOrderHistoryScreen = () => {
  const router = useRouter();
  const { orders } = useCart();

  const statusColor = (status) => (status === "cancelled" ? "#EF4444" : status === "in_progress" ? "#0EA5E9" : "#10B981");
  const list = orders.length > 0 ? orders : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={["#7DD3FC", "#38BDF8", "#0EA5E9", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerOverlay}>
              <BackButton onPress={() => router.back()} />
              <Text style={styles.headerTitle}>Corporate Order History</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <TouchableOpacity style={styles.updatePlanTile} onPress={() => router.push("/corporate-dashboard")} activeOpacity={0.8}>
            <Ionicons name="repeat" size={24} color="#1EA7FD" />
            <Text style={styles.updatePlanText}>Update subscription plans</Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Orders</Text>
          {list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={56} color="#9CA3AF" />
              <Text style={styles.emptyText}>No orders yet</Text>
              <TouchableOpacity style={styles.adhocBtn} onPress={() => router.push("/order")} activeOpacity={0.8}>
                <Text style={styles.adhocBtnText}>Place ad hoc order</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.8}>
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
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.adhocLink} onPress={() => router.push("/order")} activeOpacity={0.8}>
            <Ionicons name="cart-outline" size={20} color="#1EA7FD" />
            <Text style={styles.adhocLinkText}>Ad hoc / single orders (customer order flow)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CorporateOrderHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 100, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerOverlay: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginLeft: 12 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },
  updatePlanTile: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  updatePlanText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#6B7C85", marginTop: 12 },
  adhocBtn: { marginTop: 16, backgroundColor: "#1EA7FD", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  adhocBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  card: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "600" },
  date: { fontSize: 13, color: "#6B7C85", marginTop: 8 },
  total: { fontSize: 18, fontWeight: "700", color: "#0EA5E9", marginTop: 4 },
  adhocLink: { flexDirection: "row", alignItems: "center", marginTop: 24, paddingVertical: 12, gap: 8 },
  adhocLinkText: { fontSize: 14, fontWeight: "600", color: "#1EA7FD" },
});
