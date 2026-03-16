import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { useCart } from "@/src/context/CartContext";
import OrderDetailsModal from "@/src/components/OrderDetailsModal";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { theme } from "@/src/theme";

const OrderHistoryScreen = () => {
  const router = useRouter();
  const { orders, refreshOrders } = useCart();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);

  useFocusEffect(useCallback(() => { refreshOrders(); }, [refreshOrders]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshOrders();
    setRefreshing(false);
  }, [refreshOrders]);

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const statusColor = (status) =>
    status === "cancelled" ? "#EF4444" : status === "in_progress" ? theme.primary : "#10B981";

  const statusLabel = (status) =>
    status === "cancelled" ? "Cancelled" : status === "in_progress" ? "In progress" : "Delivered";

  return (
    <SafeAreaView style={styles.container}>
      {/* Top panel - same as Dashboard */}
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <TouchableOpacity
              style={styles.headerMenuBtn}
              activeOpacity={0.7}
              onPress={() => setShowMenuModal(true)}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="receipt-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Order history</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Content panel - same curve and padding as Dashboard */}
      <View style={styles.contentSection}>
        {orders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => getOrderId(item) || String(Math.random())}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => openDetails(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.orderId} numberOfLines={1}>
                    #{getOrderIdShort(item)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor(item.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusColor(item.status) }]}
                      numberOfLines={1}
                    >
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#6B7C85"
                    style={styles.chevron}
                  />
                </View>
                <Text style={styles.date}>
                  {new Date(item.date || item.createdAt || 0).toLocaleDateString()}
                </Text>
                <Text style={styles.total}>₹{item.total}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <OrderDetailsModal
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        order={selectedOrder}
      />

      {/* Hamburger menu - same as Dashboard */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/profile");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/order-history");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Order History</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/water-intake");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="water-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Water Intake</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/dashboard");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default OrderHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
    paddingHorizontal: 20,
  },
  headerSection: {
    marginTop: -10,
    marginLeft: -20,
    marginRight: -20,
    height: 200,
    overflow: "hidden",
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 36,
    paddingBottom: 36,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    width: "100%",
  },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    paddingBottom: 32,
  },

  contentSection: {
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    flex: 1,
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7C85",
    marginTop: 16,
  },

  card: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B2B34",
    flex: 1,
    minWidth: 0,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: "45%",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chevron: {
    marginLeft: 4,
  },
  date: {
    fontSize: 13,
    color: "#6B7C85",
    marginTop: 8,
  },
  total: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.primary,
    marginTop: 4,
  },

  menuModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingRight: 20,
    alignItems: "flex-end",
  },
  menuModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuModalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2B34",
    marginLeft: 12,
  },
});
