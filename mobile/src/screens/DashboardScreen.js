import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
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
import WaterDroplet from "@/src/components/WaterDroplet";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MAX_GRAPH_LITERS = 5;
const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 14, top: 62, width: 16, height: 22, phase: "b" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { left: 88, top: 94, width: 14, height: 20, phase: "a" },
  { left: 124, top: 44, width: 22, height: 30, phase: "b" },
  { left: 164, top: 12, width: 16, height: 22, phase: "c" },
  { left: 206, top: 74, width: 18, height: 24, phase: "a" },
  { left: 34, top: 150, width: 18, height: 24, phase: "c" },
  { right: 146, top: 36, width: 20, height: 28, phase: "c" },
  { right: 110, top: 8, width: 16, height: 22, phase: "a" },
  { right: 76, top: 66, width: 18, height: 24, phase: "b" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: 8, top: 98, width: 16, height: 22, phase: "a" },
  { right: 62, top: 154, width: 18, height: 24, phase: "b" },
  { right: -10, top: 18, width: 18, height: 24, phase: "b" },
];

const getRandomTrend = () =>
  Array.from({ length: 7 }, () => 0.15 + Math.random() * 0.85);

const getRandomHydration = () => {
  const pct = Math.round(55 + Math.random() * 40);
  const goal = 2.4;
  const current = Math.round((goal * pct) / 100 * 10) / 10;
  return { pct, current, goal };
};

const DashboardScreen = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getLatestOrder, refreshOrders } = useCart();
  const latestOrder = getLatestOrder();
  const ongoingOrder = latestOrder && latestOrder.status !== "delivered" && latestOrder.status !== "cancelled" ? latestOrder : null;
  const trackSubtitle = ongoingOrder ? (ongoingOrder.supplierResponses?.[0]?.eta || "In progress") : "No ongoing orders";
  const { balance } = useWallet();
  const userName = user?.name || "Guest";
  const [hydrationSummary, setHydrationSummary] = useState(null);
  const weekData = useMemo(() => {
    if (hydrationSummary?.summary?.length) {
      return hydrationSummary.summary.map((d) =>
        Math.min(1, (d.totalLiters || 0) / MAX_GRAPH_LITERS)
      );
    }
    return getRandomTrend();
  }, [hydrationSummary]);
  const hydration = useMemo(() => {
    if (hydrationSummary?.today) {
      const t = hydrationSummary.today;
      return {
        pct: t.percentage ?? 0,
        current: t.totalLiters ?? 0,
        goal: t.goalLiters ?? 2.4,
      };
    }
    return getRandomHydration();
  }, [hydrationSummary]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionDropdownOpen, setSubscriptionDropdownOpen] = useState(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const points = 1250;
  const totalWaterIntakeLiters = useMemo(() => {
    if (hydrationSummary?.summary?.length) {
      return hydrationSummary.summary.reduce((sum, d) => sum + Number(d?.totalLiters || 0), 0);
    }
    return Number(hydration?.current || 0);
  }, [hydrationSummary, hydration]);
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
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

  const fetchHydrationSummary = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.waterIntake.summary();
      setHydrationSummary(data);
    } catch (_) {
      setHydrationSummary(null);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchHydrationSummary();
      refreshOrders();
    }, [fetchHydrationSummary, refreshOrders])
  );

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
      fetchSubscriptions();
    }, [fetchSubscriptions])
  );

  const quickActions = [
    { id: 1, title: "Order Jar", subtitle: "Repeat last order", icon: "water-outline", onPress: () => router.push("/order") },
    { id: 2, title: "My Plan", subtitle: subscriptions.length ? `${subscriptions.length} plan(s)` : "Add or update plan", icon: "document-text-outline", onPress: () => router.push("/plan-subscription") },
    { id: 3, title: "Track", subtitle: trackSubtitle, icon: "car-outline", onPress: () => router.push("/track-order") },
    { id: 4, title: `₹${balance}`, subtitle: "Wallet", icon: "wallet-outline", onPress: () => setShowWalletModal(true) },
    { id: 5, title: "Water Intake", subtitle: "Log today's intake", icon: "water", onPress: () => router.push("/water-intake") },
    { id: 6, title: "Billing", subtitle: "Subscription bills", icon: "receipt-outline", onPress: () => router.push("/billing") },
  ];

  const devices = [
    { id: 1, name: "Apple Watch", icon: "watch-outline", connected: true },
    { id: 2, name: "Smart Bottle", icon: "water-outline", connected: true },
    { id: 3, name: "TV Hub", icon: "tv-outline", connected: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top panel - aligned with supplier onboarding */}
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
                    key={`dashboard-drop-${idx}`}
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
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>Hello, {userName}</Text>
                  <Text style={styles.headerSubtitle}>Start your water intake journey and start ordering now</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerStatsRow}>
              <View style={styles.headerStatCard}>
                <View style={styles.headerStatIconWrap}>
                  <Ionicons name="sparkles-outline" size={14} color="#7C3AED" />
                </View>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Points</Text>
                  <Text style={styles.headerStatValue}>{points}</Text>
                </View>
              </View>
              <View style={styles.headerStatCard}>
                <View style={styles.headerStatIconWrap}>
                  <Ionicons name="water-outline" size={14} color="#0E7490" />
                </View>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Total intake (L)</Text>
                  <Text style={styles.headerStatValue}>{Number(totalWaterIntakeLiters).toFixed(1)}L</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content panel with curved top radius */}
        <View style={styles.contentSection}>
          {/* Hydration Progress Card - water droplet with % and consumption, 7-day trend */}
          <View style={styles.card}>
            <View style={styles.hydrationCenterWrap}>
              <WaterDroplet
                percentage={hydration.pct}
                volumeText={`${hydration.current}L / ${hydration.goal}L`}
                goalText="Daily Goal"
              />
            </View>
            <Text style={styles.trendLabel}>Last 7 days hydration trend</Text>
            <View style={styles.barChartRow}>
              {DAYS.map((day, index) => (
                <View key={day + index} style={styles.barChartItem}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barSolid, { height: `${weekData[index] * 100}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quick Action Grid - 2x2 with icon, title, subtitle */}
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed, hovered }) => [
                  styles.quickActionCard,
                  (pressed || hovered) && styles.quickActionCardActive,
                ]}
                onPress={action.onPress}
              >
                {({ pressed, hovered }) => {
                  const isActive = pressed || hovered;
                  return (
                    <>
                      <View style={[styles.quickActionIconCircle, isActive && styles.quickActionIconCircleActive]}>
                        <Ionicons name={action.icon} size={24} color={isActive ? "#FFFFFF" : theme.primary} />
                      </View>
                      <Text style={[styles.quickActionTitle, isActive && styles.quickActionTitleActive]}>{action.title}</Text>
                      <Text style={[styles.quickActionSubtitle, isActive && styles.quickActionSubtitleActive]}>{action.subtitle}</Text>
                    </>
                  );
                }}
              </Pressable>
            ))}
          </View>

          {/* AI Hydration Insight - dark blue card, sparkle, New badge, View Details */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <View style={styles.aiTitleRow}>
                <Ionicons name="sparkles" size={20} color="#FBBF24" style={styles.aiSparkle} />
                <Text style={styles.aiCardTitle}>AI Hydration Insight</Text>
              </View>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            </View>
            <Text style={styles.aiCardBody}>
              Your intake drops by 20% on weekends. Try setting a reminder for Saturday morning!
            </Text>
            <TouchableOpacity style={styles.viewDetailsButton} activeOpacity={0.8}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Subscribed plans */}
          <Text style={styles.sectionHeader}>Subscribed plans</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.subscriptionDropdown}
              onPress={() => setSubscriptionDropdownOpen(!subscriptionDropdownOpen)}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
              <Text style={styles.subscriptionDropdownText} numberOfLines={1}>
                {subscriptions.length === 0 ? "No subscriptions yet" : `${subscriptions.length} plan${subscriptions.length > 1 ? "s" : ""} (tap to view)`}
              </Text>
              <Ionicons name={subscriptionDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#6B7C85" />
            </TouchableOpacity>
            {subscriptionDropdownOpen && subscriptions.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subscriptionItem}
                onPress={() => { setSelectedSubscription(sub); setShowSubscriptionModal(true); setSubscriptionDropdownOpen(false); }}
              >
                <Text style={styles.subscriptionItemName}>{sub.planName} – {sub.productLabel}</Text>
                <Text style={styles.subscriptionItemSupplier}>{sub.subscriptionId ? `ID: ${sub.subscriptionId} · ` : ""}{sub.frequency} • ₹{sub.totalPrice} • {sub.selectedDates?.length || 0} dates</Text>
                <Ionicons name="chevron-forward" size={18} color="#6B7C85" style={{ position: "absolute", right: 12, top: 18 }} />
              </TouchableOpacity>
            ))}
          </View>

          {/* My Devices - header + horizontal separate boxes */}
          <Text style={styles.sectionHeader}>My Devices</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.devicesScrollContent}
          >
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceCardTop}>
                  <View style={styles.deviceIconCircle}>
                    <Ionicons name={device.icon} size={28} color={theme.primary} />
                  </View>
                  <View style={styles.connectedDot}>
                    <View style={styles.connectedDotInner} />
                  </View>
                </View>
                <Text style={styles.deviceName}>{device.name}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Summer Hydration Challenge */}
          <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <View style={styles.challengeRow}>
              <View style={styles.trophyCircle}>
                <Ionicons name="trophy" size={28} color="#EAB308" />
              </View>
              <View style={styles.challengeTextWrap}>
                <Text style={styles.cardTitle}>Summer Hydration Challenge</Text>
                <Text style={styles.challengeSubtitle}>{"Day 12 of 30 • You're in top 5%!"}</Text>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Invite Friends & Earn */}
          <View style={styles.card}>
            <View style={styles.inviteRow}>
              <View style={styles.inviteTextWrap}>
                <Text style={styles.cardTitle}>Invite Friends & Earn</Text>
                <Text style={styles.inviteSubtitle}>Get 2 free jars for every referral</Text>
              </View>
              <TouchableOpacity style={styles.inviteButton} activeOpacity={0.8}>
                <Text style={styles.inviteButtonText}>Invite Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Subscription detail modal - Edit / Cancel */}
      <Modal visible={showSubscriptionModal} transparent animationType="slide">
        <TouchableOpacity style={styles.planModalOverlay} activeOpacity={1} onPress={() => setShowSubscriptionModal(false)}>
          <View style={styles.planModalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.planModalHeader}>
                <Text style={styles.planModalTitle}>Subscription</Text>
                <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                  <Ionicons name="close" size={24} color="#1B2B34" />
                </TouchableOpacity>
              </View>
              {selectedSubscription && (
                <>
                  <Text style={styles.subscriptionDetailName}>{selectedSubscription.planName} – {selectedSubscription.productLabel}</Text>
                  {selectedSubscription.subscriptionId ? (
                    <Text style={[styles.subscriptionDetailMeta, { marginBottom: 6 }]}>Subscription ID: {selectedSubscription.subscriptionId}</Text>
                  ) : null}
                  <Text style={styles.subscriptionDetailSupplier}>{selectedSubscription.frequency} • ₹{selectedSubscription.totalPrice}</Text>
                  <Text style={styles.subscriptionDetailMeta}>Delivery dates: {selectedSubscription.selectedDates?.length || 0} scheduled{selectedSubscription.preferredDeliveryTime ? ` · Preferred time: ${selectedSubscription.preferredDeliveryTime}` : ""}</Text>
                  <TouchableOpacity style={styles.subscriptionEditBtn} onPress={() => setShowSubscriptionModal(false)} activeOpacity={0.8}>
                    <Text style={styles.subscriptionEditBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subscriptionCancelBtn}
                    onPress={async () => {
                      try {
                        await api.subscriptions.cancel(selectedSubscription.id);
                        setSubscriptions((prev) => prev.filter((s) => s.id !== selectedSubscription.id));
                        setShowSubscriptionModal(false);
                        setSelectedSubscription(null);
                      } catch (_) {}
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subscriptionCancelBtnText}>Cancel subscription</Text>
                  </TouchableOpacity>
                </>
              )}
          </View>
        </TouchableOpacity>
      </Modal>

      <WalletModal visible={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  scrollContent: { paddingBottom: 30 },
  headerSection: { minHeight: 278, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerMenuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerCenter: { alignItems: "flex-start", justifyContent: "center", marginTop: 2, width: "100%" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  headerStatsRow: { marginTop: 14, flexDirection: "row", gap: 8 },
  headerStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.64)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerStatIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerStatTextWrap: { flex: 1 },
  headerStatLabel: { fontSize: 11, color: "#456173" },
  headerStatValue: { fontSize: 14, fontWeight: "800", color: "#1B2B34", marginTop: 1 },

  contentSection: {
    marginTop: -24,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 0,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },

  hydrationCenterWrap: { alignItems: "center", justifyContent: "center", marginBottom: 20 },
  trendLabel: { fontSize: 13, color: "#1B2B34", marginBottom: 12, fontWeight: "600" },
  barChartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 56 },
  barChartItem: { flex: 1, alignItems: "center", marginHorizontal: 2 },
  barWrapper: { flex: 1, width: "80%", justifyContent: "flex-end", alignItems: "center", minHeight: 36 },
  barSolid: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 12, color: "#1B2B34", marginTop: 8, fontWeight: "500" },

  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  quickActionCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  quickActionCardActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.selectedTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionIconCircleActive: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  quickActionTitle: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  quickActionTitleActive: { color: "#FFFFFF" },
  quickActionSubtitle: { fontSize: 12, color: "#6B7C85" },
  quickActionSubtitleActive: { color: "rgba(255,255,255,0.9)" },

  aiCard: {
    backgroundColor: theme.accent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  aiCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  aiTitleRow: { flexDirection: "row", alignItems: "center" },
  aiSparkle: { marginRight: 8 },
  aiCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  newBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  newBadgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  aiCardBody: { fontSize: 14, color: "rgba(255,255,255,0.95)", lineHeight: 22, marginBottom: 16 },
  viewDetailsButton: {
    backgroundColor: theme.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  viewDetailsText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  sectionHeader: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 12 },
  devicesScrollContent: { paddingBottom: 8, gap: 12 },
  deviceCard: {
    width: 120,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  deviceCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  deviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.selectedTint,
    justifyContent: "center",
    alignItems: "center",
  },
  connectedDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center" },
  connectedDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  deviceName: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },

  challengeRow: { flexDirection: "row", alignItems: "center" },
  trophyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF9C3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  challengeTextWrap: { flex: 1 },
  challengeSubtitle: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f7fcd7",
    justifyContent: "center",
    alignItems: "center",
  },

  inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inviteTextWrap: { flex: 1, marginRight: 12 },
  inviteSubtitle: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  inviteButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  inviteButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  planModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  planModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  planModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  planModalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  planModalClose: { fontSize: 16, fontWeight: "600", color: theme.primary },
  planModalHint: { fontSize: 13, color: "#6B7C85", marginBottom: 16 },
  planModalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f0f7fcd7",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  planModalOptionSelected: { backgroundColor: theme.selectedTint, borderWidth: 2, borderColor: theme.primaryLight },
  planModalOptionName: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34" },

  subscriptionDropdown: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  subscriptionDropdownText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  subscriptionItem: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingVertical: 14, paddingHorizontal: 4, paddingRight: 36 },
  subscriptionItemName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  subscriptionItemSupplier: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  subscriptionDetailName: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 6 },
  subscriptionDetailSupplier: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  subscriptionDetailMeta: { fontSize: 14, color: "#1B2B34", marginBottom: 20 },
  subscriptionEditBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginBottom: 10 },
  subscriptionEditBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  subscriptionCancelBtn: { paddingVertical: 14, alignItems: "center" },
  subscriptionCancelBtnText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },

  menuModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingRight: 20, alignItems: "flex-end" },
  menuModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, minWidth: 220, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuModalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  menuModalItemText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },
});
