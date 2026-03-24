import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import BackButton from "@/src/components/BackButton";
import { useCart } from "@/src/context/CartContext";
import OrderDetailsModal from "@/src/components/OrderDetailsModal";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { theme } from "@/src/theme";

const HEADER_DROPLETS = [
  { left: -8, top: 18, width: 16, height: 22, phase: "a" },
  { left: 22, top: 58, width: 14, height: 20, phase: "b" },
  { left: 56, top: 20, width: 18, height: 24, phase: "c" },
  { left: 92, top: 86, width: 14, height: 20, phase: "a" },
  { left: 132, top: 38, width: 16, height: 22, phase: "b" },
  { left: 172, top: 102, width: 14, height: 20, phase: "c" },
  { left: 212, top: 60, width: 16, height: 22, phase: "a" },
  { left: 24, top: 156, width: 14, height: 20, phase: "c" },
  { left: 84, top: 188, width: 14, height: 20, phase: "a" },
  { left: 152, top: 174, width: 16, height: 22, phase: "b" },
  { right: 154, top: 20, width: 16, height: 22, phase: "c" },
  { right: 118, top: 68, width: 14, height: 20, phase: "a" },
  { right: 82, top: 30, width: 16, height: 22, phase: "b" },
  { right: 46, top: 94, width: 14, height: 20, phase: "c" },
  { right: 10, top: 54, width: 16, height: 22, phase: "a" },
  { right: -6, top: 124, width: 14, height: 20, phase: "b" },
  { right: 92, top: 160, width: 14, height: 20, phase: "c" },
  { right: 28, top: 188, width: 14, height: 20, phase: "a" },
];

const OrderHistoryScreen = () => {
  const router = useRouter();
  const { orders, refreshOrders } = useCart();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400), b = loop(dropletAnimB, 4200), c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

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
          style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
        >
          <View style={styles.headerOverlay}>
            {HEADER_DROPLETS.map((drop, idx) => {
              const dropAnim = getDropletAnim(drop.phase);
              return (
                <Animated.View
                  key={`order-history-drop-${idx}`}
                  style={[styles.dropletWrap, {
                    left: drop.left, right: drop.right, top: drop.top, width: drop.width, height: drop.height,
                    opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                    transform: [
                      { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                      { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                    ],
                  }]}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 60 80">
                    <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                  </Svg>
                </Animated.View>
              );
            })}
          </View>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <TouchableOpacity
              style={styles.headerMenuBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.headerInfoRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Order History</Text>
                <Text style={styles.headerSubtitle}>View recent and past customer orders</Text>
              </View>
            </View>
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

    </SafeAreaView>
  );
};

export default OrderHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
    paddingHorizontal: 0,
  },
  headerSection: { minHeight: 236, overflow: "hidden" },
  gradientBackground: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { alignItems: "flex-start", justifyContent: "center", marginTop: 2, width: "100%" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerTextWrap: { marginLeft: 12, flex: 1 },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },

  contentSection: {
    marginTop: -16,
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
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
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

});
