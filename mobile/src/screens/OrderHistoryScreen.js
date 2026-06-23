import React, { useState, useCallback, useMemo } from "react";
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
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import OrderDetailsModal from "@/src/components/OrderDetailsModal";
import { useCart } from "@/src/context/CartContext";
import { useAuth } from "@/src/context/AuthContext";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { theme } from "@/src/theme";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function statusMeta(status) {
  if (status === "cancelled") {
    return { color: "#DC2626", bg: "rgba(220,38,38,0.12)", label: "Cancelled", icon: "close-circle-outline" };
  }
  if (status === "in_progress") {
    return { color: theme.accent, bg: "rgba(30,143,177,0.12)", label: "In progress", icon: "bicycle-outline" };
  }
  return { color: "#059669", bg: "rgba(5,150,105,0.12)", label: "Delivered", icon: "checkmark-circle-outline" };
}

const OrderHistoryScreen = () => {
  const router = useRouter();
  const portal = useCustomerPortal();
  const { orders, refreshOrders } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const sourceOrders = useMemo(() => {
    if (!portal.isSociety) return orders;
    return orders.filter((o) => o.orderChannel === "society");
  }, [orders, portal.isSociety]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      setLoadingOrders(true);
      Promise.resolve(refreshOrders()).finally(() => setLoadingOrders(false));
    }, [isAuthenticated, refreshOrders])
  );

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await Promise.resolve(refreshOrders());
    setRefreshing(false);
  }, [isAuthenticated, refreshOrders]);

  const filteredOrders = useMemo(() => {
    const sorted = [...sourceOrders].sort(
      (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
    );
    if (activeFilter === "all") return sorted;
    return sorted.filter((o) => (o.status || "in_progress") === activeFilter);
  }, [sourceOrders, activeFilter]);

  const stats = useMemo(() => {
    const totalSpent = sourceOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const delivered = sourceOrders.filter((o) => o.status === "delivered").length;
    const active = sourceOrders.filter((o) => o.status === "in_progress").length;
    return { totalSpent, delivered, active, count: sourceOrders.length };
  }, [sourceOrders]);

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/");
        },
      },
    ]);
  };

  const renderOrderCard = ({ item }) => {
    const meta = statusMeta(item.status);
    const date = new Date(item.date || item.createdAt || 0);
    const itemCount = Array.isArray(item.items) ? item.items.reduce((s, i) => s + (i.qty || 1), 0) : 0;

    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => openDetails(item)} activeOpacity={0.88}>
        <View style={styles.orderCardTop}>
          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.orderIcon}>
            <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.orderMain}>
            <Text style={styles.orderId} numberOfLines={1}>
              Order #{getOrderIdShort(item)}
            </Text>
            <Text style={styles.orderDate}>
              {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.orderCardBottom}>
          <View style={styles.orderMetaItem}>
            <Ionicons name="cube-outline" size={14} color={theme.textMuted} />
            <Text style={styles.orderMetaText}>{itemCount || "—"} item{itemCount !== 1 ? "s" : ""}</Text>
          </View>
          <View style={styles.orderMetaItem}>
            <Ionicons name="wallet-outline" size={14} color={theme.textMuted} />
            <Text style={styles.orderMetaText}>{item.paymentMethod || "Card"}</Text>
          </View>
          <Text style={styles.orderTotal}>₹{Number(item.total || 0).toLocaleString("en-IN")}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <DropletOverlay />
            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push(portal.profile)}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Order history</Text>
            <Text style={styles.headerSubtitle}>
              {isAuthenticated ? `Welcome back, ${user?.name?.split(" ")[0] || "there"}` : "Your recent orders on this device"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => getOrderId(item) || String(Math.random())}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              isAuthenticated ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
              ) : undefined
            }
            ListHeaderComponent={
              <>
                <View style={styles.summaryBanner}>
                  <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                    <View style={styles.summaryBannerIcon}>
                      <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.summaryBannerText}>
                      <Text style={styles.summaryBannerLabel}>Your orders</Text>
                      <Text style={styles.summaryBannerValue}>
                        {stats.count} total · ₹{stats.totalSpent.toLocaleString("en-IN")} spent
                      </Text>
                    </View>
                    <View style={styles.summaryStatChip}>
                      <Text style={styles.summaryStatValue}>{stats.active}</Text>
                      <Text style={styles.summaryStatLabel}>Active</Text>
                    </View>
                  </LinearGradient>
                </View>

                {!isAuthenticated ? (
                  <TouchableOpacity style={styles.loginPromptWrap} onPress={() => router.push({ pathname: "/login", params: { role: "Customer" } })} activeOpacity={0.9}>
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.loginPrompt}>
                      <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                      <View style={styles.loginPromptTextWrap}>
                        <Text style={styles.loginPromptTitle}>Login to sync orders</Text>
                        <Text style={styles.loginPromptSub}>Keep order history across devices</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}

                <SectionCard icon="funnel-outline" title="Filter orders" subtitle="Browse by delivery status">
                  <View style={styles.filterRow}>
                    {FILTERS.map((f) => {
                      const selected = activeFilter === f.id;
                      return (
                        <TouchableOpacity key={f.id} onPress={() => setActiveFilter(f.id)} activeOpacity={0.88}>
                          {selected ? (
                            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.filterChip}>
                              <Text style={styles.filterChipTextSelected}>{f.label}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.filterChipMuted}>
                              <Text style={styles.filterChipText}>{f.label}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </SectionCard>

                <View style={styles.listHeadingRow}>
                  <Text style={styles.listHeading}>
                    {activeFilter === "all" ? "All orders" : FILTERS.find((f) => f.id === activeFilter)?.label}
                  </Text>
                  <Text style={styles.listCount}>{filteredOrders.length} shown</Text>
                </View>
              </>
            }
            ListEmptyComponent={
              loadingOrders ? (
                <ActivityIndicator style={styles.loader} size="large" color={theme.accent} />
              ) : (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="receipt-outline" size={34} color={theme.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>No orders found</Text>
                  <Text style={styles.emptyText}>
                    {activeFilter === "all"
                      ? "Place your first order from the shop to see it here."
                      : "No orders match this filter. Try another status."}
                  </Text>
                  <TouchableOpacity style={styles.shopBtnWrap} onPress={() => router.push("/order")} activeOpacity={0.9}>
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.shopBtn}>
                      <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.shopBtnText}>Browse products</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )
            }
            renderItem={renderOrderCard}
          />
        </View>
      </View>

      <View style={styles.footer}>
        {isAuthenticated ? (
          <TouchableOpacity style={styles.logoutBtnWrap} onPress={handleLogout} activeOpacity={0.9}>
            <View style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutText}>Log out</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtnWrap} onPress={() => router.push({ pathname: "/login", params: { role: "Customer" } })} activeOpacity={0.9}>
            <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtn}>
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              <Text style={styles.loginText}>Login to your account</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <OrderDetailsModal visible={showDetails} onClose={() => setShowDetails(false)} order={selectedOrder} />
    </SafeAreaView>
  );
};

export default OrderHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.92)", marginTop: 6 },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  listContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  summaryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBannerText: { flex: 1 },
  summaryBannerLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  summaryBannerValue: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  summaryStatChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  summaryStatValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  summaryStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.88)", marginTop: 2 },

  loginPromptWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  loginPrompt: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  loginPromptTextWrap: { flex: 1 },
  loginPromptTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  loginPromptSub: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  filterChipMuted: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.contentPanelBackground,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  filterChipTextSelected: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },

  listHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listHeading: { fontSize: 17, fontWeight: "700", color: theme.textPrimary },
  listCount: { fontSize: 12, fontWeight: "600", color: theme.textMuted },

  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  orderCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  orderMain: { flex: 1, minWidth: 0 },
  orderId: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  orderDate: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.8)",
    gap: 12,
  },
  orderMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderMetaText: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
  orderTotal: { marginLeft: "auto", fontSize: 17, fontWeight: "800", color: theme.accent },

  loader: { marginTop: 40 },
  emptyWrap: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(30,143,177,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  shopBtnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 20 },
  shopBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
  shopBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  logoutBtnWrap: { borderRadius: 16, overflow: "hidden" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
  loginBtnWrap: { borderRadius: 16, overflow: "hidden" },
  loginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  loginText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
