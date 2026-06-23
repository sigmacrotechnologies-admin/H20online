import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
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
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import { useAuth } from "@/src/context/AuthContext";
import WalletModal from "@/src/components/WalletModal";
import AppLogo from "@/src/components/AppLogo";
import { api } from "@/src/api/client";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { theme } from "@/src/theme";

const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: -10, top: 18, width: 18, height: 24, phase: "b" },
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  return "good evening";
};

const getInitials = (name) => {
  const parts = String(name || "Society").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "S").toUpperCase();
};

export default function SocietyDashboardScreen() {
  const router = useRouter();
  const portal = useCustomerPortal();
  const { user, isAuthenticated } = useAuth();
  const { orders, refreshOrders } = useCart();
  const { balance } = useWallet();
  const [society, setSociety] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionDropdownOpen, setSubscriptionDropdownOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const points = 1250;
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const societyOrders = orders.filter((o) => o.orderChannel === "society");
  const latestOrder = societyOrders[0] || null;
  const ongoingOrder =
    latestOrder && latestOrder.status !== "delivered" && latestOrder.status !== "cancelled" ? latestOrder : null;
  const trackSubtitle = ongoingOrder
    ? ongoingOrder.supplierResponses?.[0]?.eta || "In progress"
    : "No ongoing orders";

  const displayName = society?.societyName || user?.name || "Society";
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const memberCount = society?.memberCount ?? 0;
  const waterLiters = society?.waterConsumptionLiters ?? 0;
  const weekData = useMemo(() => {
    const week = society?.consumptionWeek || [];
    const maxL = Math.max(1, ...week.map((d) => d.totalLiters || 0));
    return week.map((d) => Math.max(0.08, (d.totalLiters || 0) / maxL));
  }, [society?.consumptionWeek]);

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
    const a = loop(dropletAnimA, 3400);
    const b = loop(dropletAnimB, 4200);
    const c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);

  const getDropletAnim = (phase) => (phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA);

  const loadSociety = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.societies.me();
      setSociety(data);
    } catch (_) {
      setSociety(null);
    }
  }, [isAuthenticated]);

  const fetchSubscriptions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await api.subscriptions.list();
      setSubscriptions(list);
    } catch (_) {
      setSubscriptions([]);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      loadSociety();
      refreshOrders();
      fetchSubscriptions();
    }, [isAuthenticated, loadSociety, refreshOrders, fetchSubscriptions])
  );

  const quickActions = [
    {
      id: 1,
      title: "Order tanker",
      subtitle: "Browse society products",
      icon: "water-outline",
      color: theme.accent,
      onPress: () => router.push("/order"),
    },
    {
      id: 2,
      title: "My plan",
      subtitle: subscriptions.length ? `${subscriptions.length} scheduled` : "Schedule orders",
      icon: "calendar-outline",
      color: "#7C3AED",
      onPress: () => router.push({ pathname: "/plan-subscription", params: { category: "society" } }),
    },
    {
      id: 3,
      title: "Track",
      subtitle: trackSubtitle,
      icon: "navigate-outline",
      color: "#0E7490",
      onPress: () => router.push("/track-order"),
    },
    {
      id: 4,
      title: `₹${balance}`,
      subtitle: "Wallet balance",
      icon: "wallet-outline",
      color: "#059669",
      onPress: () => setShowWalletModal(true),
    },
    {
      id: 5,
      title: String(points),
      subtitle: "Reward points",
      icon: "sparkles-outline",
      color: "#7C3AED",
      onPress: () => setShowPointsModal(true),
    },
    {
      id: 6,
      title: "Billing",
      subtitle: "Society bills",
      icon: "receipt-outline",
      color: "#D97706",
      onPress: () => router.push("/billing"),
    },
    {
      id: 7,
      title: "Order history",
      subtitle: `${societyOrders.length} orders`,
      icon: "time-outline",
      color: theme.primary,
      onPress: () => router.push("/order-history"),
    },
    {
      id: 8,
      title: "My orders",
      subtitle: ongoingOrder ? "Active delivery" : "View all",
      icon: "bag-check-outline",
      color: "#0E7490",
      onPress: () => router.push("/order-history"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
          >
            <View style={styles.headerOverlay} pointerEvents="none">
              {HEADER_DROPLETS.map((drop, idx) => {
                const dropAnim = getDropletAnim(drop.phase);
                return (
                  <Animated.View
                    key={`soc-drop-${idx}`}
                    style={[
                      styles.dropletWrap,
                      {
                        left: drop.left,
                        right: drop.right,
                        top: drop.top,
                        width: drop.width,
                        height: drop.height,
                        opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                        transform: [
                          { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                        ],
                      },
                    ]}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 60 80">
                      <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                    </Svg>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.headerTopRow}>
              <AppLogo size="header" style={styles.headerLogoLeft} />
              <TouchableOpacity
                style={styles.headerMenuBtn}
                activeOpacity={0.85}
                onPress={() => router.push(portal.profile)}
              >
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.headerWelcomeBlock}
              onPress={() => router.push(portal.profile)}
              activeOpacity={0.85}
            >
              <View style={styles.welcomeRow}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.welcomeAvatarFallback}>
                  <Text style={styles.welcomeAvatarInitial}>{initials}</Text>
                </LinearGradient>
                <View style={styles.welcomeTextWrap}>
                  <Text style={styles.profileGreeting}>Welcome back, {getTimeGreeting()}</Text>
                  <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Society water hub</Text>
              <Text style={styles.headerSubtitle}>
                Tanker orders, member consumption & billing for your residents
              </Text>
            </View>
            <View style={styles.headerStatsRow}>
              <View style={styles.headerStatCard}>
                <LinearGradient colors={["#EDE9FE", "#DDD6FE"]} style={styles.headerStatIconWrap}>
                  <Ionicons name="people-outline" size={16} color="#7C3AED" />
                </LinearGradient>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Members</Text>
                  <Text style={styles.headerStatValue}>{memberCount}</Text>
                </View>
              </View>
              <View style={styles.headerStatCard}>
                <LinearGradient colors={["#CFFAFE", "#A5F3FC"]} style={styles.headerStatIconWrap}>
                  <Ionicons name="water-outline" size={16} color="#0E7490" />
                </LinearGradient>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Consumption</Text>
                  <Text style={styles.headerStatValue}>{Number(waterLiters).toFixed(1)} L</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          {ongoingOrder ? (
            <TouchableOpacity
              style={styles.orderBanner}
              onPress={() => router.push("/track-order")}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.medium, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.orderBannerGradient}
              >
                <View style={styles.orderBannerIcon}>
                  <Ionicons name="bus-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.orderBannerText}>
                  <Text style={styles.orderBannerLabel}>Tanker in progress</Text>
                  <Text style={styles.orderBannerTitle} numberOfLines={1}>
                    {(ongoingOrder.items || []).map((i) => i.productName).join(", ") || "Water tanker"}
                  </Text>
                  <Text style={styles.orderBannerMeta}>{trackSubtitle}</Text>
                </View>
                <View style={styles.orderBannerCta}>
                  <Text style={styles.orderBannerCtaText}>Track</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.cardHeaderIcon}>
                <Ionicons name="water" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardHeaderTitle}>Water consumption</Text>
                <Text style={styles.cardHeaderSubtitle}>
                  {memberCount > 0
                    ? `Aggregated from ${memberCount} linked resident${memberCount === 1 ? "" : "s"}`
                    : "Link residents from customer profiles to track usage"}
                </Text>
              </View>
            </View>
            <Text style={styles.consumptionTotal}>{Number(waterLiters).toFixed(1)} L this week</Text>
            <Text style={styles.trendLabel}>Last 7 days (members)</Text>
            <View style={styles.barChartRow}>
              {DAY_LABELS.map((day, index) => (
                <View key={`${day}-${index}`} style={styles.barChartItem}>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={[theme.light, theme.accent]}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[styles.barFill, { height: `${Math.max(8, (weekData[index] || 0.08) * 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Quick actions</Text>
            <Text style={styles.sectionHeader}>Everything for your society</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
                activeOpacity={0.88}
              >
                <View style={styles.quickActionTop}>
                  <View style={[styles.quickActionIconCircle, { backgroundColor: `${action.color}18` }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={2}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Scheduling</Text>
            <Text style={styles.sectionHeader}>Tanker plans</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.subscriptionDropdown}
              onPress={() => setSubscriptionDropdownOpen(!subscriptionDropdownOpen)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.subscriptionDropdownIcon}>
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.subscriptionDropdownTextWrap}>
                <Text style={styles.subscriptionDropdownTitle}>
                  {subscriptions.length === 0
                    ? "No scheduled plans"
                    : `${subscriptions.length} active plan${subscriptions.length > 1 ? "s" : ""}`}
                </Text>
                <Text style={styles.subscriptionDropdownHint}>
                  {subscriptions.length === 0
                    ? "Schedule recurring tanker deliveries"
                    : "Tap to view scheduled deliveries"}
                </Text>
              </View>
              <Ionicons
                name={subscriptionDropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
            {subscriptionDropdownOpen &&
              subscriptions.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subscriptionItem}
                  onPress={() => {
                    setSelectedSubscription(sub);
                    setShowSubscriptionModal(true);
                    setSubscriptionDropdownOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.subscriptionItemMain}>
                    <Text style={styles.subscriptionItemName}>{sub.planName} – {sub.productLabel}</Text>
                    <Text style={styles.subscriptionItemSupplier}>
                      {sub.frequency} • ₹{sub.totalPrice} • {sub.selectedDates?.length || 0} dates
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            {subscriptions.length === 0 ? (
              <TouchableOpacity
                style={styles.subscriptionEmptyBtn}
                onPress={() => router.push({ pathname: "/plan-subscription", params: { category: "society" } })}
                activeOpacity={0.85}
              >
                <Text style={styles.subscriptionEmptyBtnText}>Schedule tanker plan</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.link} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showSubscriptionModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.planModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubscriptionModal(false)}
        >
          <View style={styles.planModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.planModalHeader}>
              <Text style={styles.planModalTitle}>Scheduled plan</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Ionicons name="close" size={24} color="#1B2B34" />
              </TouchableOpacity>
            </View>
            {selectedSubscription ? (
              <>
                <Text style={styles.subscriptionDetailName}>
                  {selectedSubscription.planName} – {selectedSubscription.productLabel}
                </Text>
                <Text style={styles.subscriptionDetailSupplier}>
                  {selectedSubscription.frequency} • ₹{selectedSubscription.totalPrice}
                </Text>
                <Text style={styles.subscriptionDetailMeta}>
                  {selectedSubscription.selectedDates?.length || 0} scheduled delivery dates
                </Text>
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPointsModal} transparent animationType="fade" onRequestClose={() => setShowPointsModal(false)}>
        <TouchableOpacity style={styles.planModalOverlay} activeOpacity={1} onPress={() => setShowPointsModal(false)}>
          <View style={styles.pointsModal} onStartShouldSetResponder={() => true}>
            <Ionicons name="sparkles" size={36} color="#7C3AED" />
            <Text style={styles.pointsTitle}>{points} points</Text>
            <Text style={styles.pointsSubtitle}>
              Earn points on tanker orders and scheduled deliveries. Redeem on future society orders.
            </Text>
            <TouchableOpacity style={styles.pointsClose} onPress={() => setShowPointsModal(false)}>
              <Text style={styles.pointsCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <WalletModal visible={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  scrollContent: { paddingBottom: 36 },
  headerSection: { minHeight: 300, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 36 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, zIndex: 12 },
  headerLogoLeft: { alignSelf: "flex-start" },
  headerWelcomeBlock: { marginBottom: 14, alignSelf: "stretch" },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcomeAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  welcomeAvatarInitial: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  welcomeTextWrap: { flex: 1, minWidth: 0 },
  profileGreeting: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.82)", textTransform: "capitalize" },
  profileName: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },
  headerStatsRow: { flexDirection: "row", gap: 10 },
  headerStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerStatIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 10 },
  headerStatTextWrap: { flex: 1 },
  headerStatLabel: { fontSize: 10, fontWeight: "600", color: "#456173", textTransform: "uppercase" },
  headerStatValue: { fontSize: 15, fontWeight: "800", color: theme.textPrimary, marginTop: 2 },
  contentSection: {
    marginTop: -18,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  orderBanner: { marginBottom: 16, borderRadius: 20, overflow: "hidden" },
  orderBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  orderBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  orderBannerText: { flex: 1, minWidth: 0 },
  orderBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" },
  orderBannerTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  orderBannerMeta: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3 },
  orderBannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  orderBannerCtaText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  cardHeaderIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1 },
  cardHeaderTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  cardHeaderSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  consumptionTotal: { fontSize: 22, fontWeight: "800", color: theme.textPrimary, marginBottom: 8 },
  trendLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 12, textTransform: "uppercase" },
  barChartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 72 },
  barChartItem: { flex: 1, alignItems: "center", marginHorizontal: 2 },
  barWrapper: {
    width: "76%",
    height: 52,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: { width: "100%", borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 8 },
  barLabel: { fontSize: 11, color: theme.textMuted, marginTop: 8, fontWeight: "600" },
  sectionBlock: { marginBottom: 10, marginTop: 4 },
  sectionEyebrow: { fontSize: 11, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase" },
  sectionHeader: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginTop: 2 },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14, gap: 10 },
  quickActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  quickActionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  quickActionIconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickActionTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  quickActionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 4, lineHeight: 16 },
  subscriptionDropdown: { flexDirection: "row", alignItems: "center", gap: 12 },
  subscriptionDropdownIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subscriptionDropdownTextWrap: { flex: 1 },
  subscriptionDropdownTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  subscriptionDropdownHint: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  subscriptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF2",
    marginTop: 8,
  },
  subscriptionItemMain: { flex: 1 },
  subscriptionItemName: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  subscriptionItemSupplier: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  subscriptionEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  subscriptionEmptyBtnText: { fontSize: 14, fontWeight: "700", color: theme.link },
  planModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  planModalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  planModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  planModalTitle: { fontSize: 18, fontWeight: "800", color: theme.textPrimary },
  subscriptionDetailName: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  subscriptionDetailSupplier: { fontSize: 14, color: theme.textMuted, marginTop: 6 },
  subscriptionDetailMeta: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  pointsModal: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    alignSelf: "center",
    marginTop: "40%",
  },
  pointsTitle: { fontSize: 28, fontWeight: "800", color: theme.textPrimary, marginTop: 12 },
  pointsSubtitle: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  pointsClose: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24 },
  pointsCloseText: { fontSize: 15, fontWeight: "700", color: theme.link },
});
