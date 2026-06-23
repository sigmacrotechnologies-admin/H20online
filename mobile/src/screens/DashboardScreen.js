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
import WaterDroplet from "@/src/components/WaterDroplet";
import AppLogo from "@/src/components/AppLogo";
import WaterAiSenseBanner from "@/src/components/ai/WaterAiSenseBanner";
import WaterAiReportModal from "@/src/components/ai/WaterAiReportModal";
import WaterAiAskModal from "@/src/components/ai/WaterAiAskModal";
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

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  return "good evening";
};

const getInitials = (name) => {
  const parts = String(name || "Guest").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "G").toUpperCase();
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
  const userInitials = useMemo(() => getInitials(userName), [userName]);
  const avatarUrl = user?.avatarUrl || "";
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
  const [aiInsight, setAiInsight] = useState("");
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightRefreshing, setAiInsightRefreshing] = useState(false);
  const [aiInsightError, setAiInsightError] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [showAiReport, setShowAiReport] = useState(false);
  const [showAiAsk, setShowAiAsk] = useState(false);
  const aiFetchInFlight = useRef(false);
  const aiHasLoaded = useRef(false);
  const aiInsightRef = useRef("");
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

  const fetchAiInsight = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    if (aiFetchInFlight.current) return;
    if (!force && aiHasLoaded.current) return;

    aiFetchInFlight.current = true;
    const hasExisting = !!aiInsightRef.current;
    if (hasExisting) {
      setAiInsightRefreshing(true);
    } else {
      setAiInsightLoading(true);
    }
    if (!hasExisting) setAiInsightError("");

    try {
      const data = await api.ai.waterInsight();
      const text = data.insight || "";
      aiInsightRef.current = text;
      setAiInsight(text);
      aiHasLoaded.current = true;
    } catch (e) {
      if (!hasExisting) {
        aiInsightRef.current = "";
        setAiInsight("");
        setAiInsightError(e.message || "AI insight unavailable. Please try again.");
      }
    } finally {
      setAiInsightLoading(false);
      setAiInsightRefreshing(false);
      aiFetchInFlight.current = false;
    }
  }, [isAuthenticated]);

  const handleAiBannerToggle = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setAiExpanded((prev) => {
      const next = !prev;
      if (next && !aiHasLoaded.current && !aiFetchInFlight.current) {
        fetchAiInsight(true);
      }
      return next;
    });
  }, [isAuthenticated, fetchAiInsight, router]);

  const handleAiRefresh = useCallback(() => {
    fetchAiInsight(true);
  }, [fetchAiInsight]);

  const handleOpenAiReport = useCallback(() => setShowAiReport(true), []);
  const handleOpenAiAsk = useCallback(() => setShowAiAsk(true), []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      fetchHydrationSummary();
      refreshOrders();
    }, [isAuthenticated, fetchHydrationSummary, refreshOrders])
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
    { id: 1, title: "Order Jar", subtitle: "Repeat last order", icon: "water-outline", color: theme.accent, onPress: () => router.push("/order") },
    { id: 2, title: "My Plan", subtitle: subscriptions.length ? `${subscriptions.length} active` : "Add a plan", icon: "document-text-outline", color: "#7C3AED", onPress: () => router.push("/plan-subscription") },
    { id: 3, title: "Track", subtitle: trackSubtitle, icon: "navigate-outline", color: "#0E7490", onPress: () => router.push("/track-order") },
    { id: 4, title: `₹${balance}`, subtitle: "Wallet balance", icon: "wallet-outline", color: "#059669", onPress: () => setShowWalletModal(true) },
    { id: 5, title: "Water Intake", subtitle: "Log today", icon: "water", color: theme.primaryLight, onPress: () => router.push("/water-intake") },
    { id: 6, title: "Billing", subtitle: "View bills", icon: "receipt-outline", color: "#D97706", onPress: () => router.push("/billing") },
  ];

  const devices = [
    { id: 1, name: "Apple Watch", icon: "watch-outline" },
    { id: 2, name: "Smart Bottle", icon: "water-outline" },
    { id: 3, name: "TV Hub", icon: "tv-outline" },
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
            <View style={styles.headerOverlay} pointerEvents="none">
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
              <AppLogo size="header" style={styles.headerLogoLeft} />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push("/profile")}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.headerWelcomeBlock} onPress={() => router.push("/profile")} activeOpacity={0.85}>
              <View style={styles.welcomeRow}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.welcomeAvatar} />
                ) : (
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.welcomeAvatarFallback}>
                    <Text style={styles.welcomeAvatarInitial}>{userInitials}</Text>
                  </LinearGradient>
                )}
                <View style={styles.welcomeTextWrap}>
                  <Text style={styles.profileGreeting}>Welcome back, {getTimeGreeting()}</Text>
                  <Text style={styles.profileName} numberOfLines={1}>{userName}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Your hydration hub</Text>
              <Text style={styles.headerSubtitle}>Track intake, manage orders, and stay refreshed every day</Text>
            </View>
            <View style={styles.headerStatsRow}>
              <View style={styles.headerStatCard}>
                <LinearGradient colors={["#EDE9FE", "#DDD6FE"]} style={styles.headerStatIconWrap}>
                  <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
                </LinearGradient>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Reward points</Text>
                  <Text style={styles.headerStatValue}>{points}</Text>
                </View>
              </View>
              <View style={styles.headerStatCard}>
                <LinearGradient colors={["#CFFAFE", "#A5F3FC"]} style={styles.headerStatIconWrap}>
                  <Ionicons name="water-outline" size={16} color="#0E7490" />
                </LinearGradient>
                <View style={styles.headerStatTextWrap}>
                  <Text style={styles.headerStatLabel}>Total intake</Text>
                  <Text style={styles.headerStatValue}>{Number(totalWaterIntakeLiters).toFixed(1)} L</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content panel with curved top radius */}
        <View style={styles.contentSection}>
          {ongoingOrder ? (
            <TouchableOpacity style={styles.orderBanner} onPress={() => router.push("/track-order")} activeOpacity={0.9}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orderBannerGradient}>
                <View style={styles.orderBannerIcon}>
                  <Ionicons name="bicycle-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.orderBannerText}>
                  <Text style={styles.orderBannerLabel}>Order in progress</Text>
                  <Text style={styles.orderBannerTitle} numberOfLines={1}>{ongoingOrder.productLabel || "Water delivery"}</Text>
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
                <Text style={styles.cardHeaderTitle}>Today's hydration</Text>
                <Text style={styles.cardHeaderSubtitle}>{hydration.pct}% of your daily goal</Text>
              </View>
              <TouchableOpacity style={styles.cardHeaderAction} onPress={() => router.push("/water-intake")} activeOpacity={0.8}>
                <Text style={styles.cardHeaderActionText}>Log</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hydrationCenterWrap}>
              <WaterDroplet
                percentage={hydration.pct}
                volumeText={`${hydration.current}L / ${hydration.goal}L`}
                goalText="Daily Goal"
              />
            </View>
            <Text style={styles.trendLabel}>Last 7 days</Text>
            <View style={styles.barChartRow}>
              {DAYS.map((day, index) => (
                <View key={day + index} style={styles.barChartItem}>
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={[theme.light, theme.accent]}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[styles.barFill, { height: `${Math.max(8, weekData[index] * 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Quick actions</Text>
            <Text style={styles.sectionHeader}>Everything you need</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.quickActionCard} onPress={action.onPress} activeOpacity={0.88}>
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

          <WaterAiSenseBanner
            expanded={aiExpanded}
            insight={aiInsight}
            loading={aiInsightLoading}
            refreshing={aiInsightRefreshing}
            error={aiInsightError}
            onToggle={handleAiBannerToggle}
            onRefresh={handleAiRefresh}
            onViewReport={handleOpenAiReport}
            onAsk={handleOpenAiAsk}
          />

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Subscriptions</Text>
            <Text style={styles.sectionHeader}>Your plans</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.subscriptionDropdown}
              onPress={() => setSubscriptionDropdownOpen(!subscriptionDropdownOpen)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.subscriptionDropdownIcon}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.subscriptionDropdownTextWrap}>
                <Text style={styles.subscriptionDropdownTitle}>
                  {subscriptions.length === 0 ? "No active plans" : `${subscriptions.length} active plan${subscriptions.length > 1 ? "s" : ""}`}
                </Text>
                <Text style={styles.subscriptionDropdownHint}>
                  {subscriptions.length === 0 ? "Tap to explore subscription options" : "Tap to view details"}
                </Text>
              </View>
              <Ionicons name={subscriptionDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
            </TouchableOpacity>
            {subscriptionDropdownOpen && subscriptions.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.subscriptionItem}
                onPress={() => { setSelectedSubscription(sub); setShowSubscriptionModal(true); setSubscriptionDropdownOpen(false); }}
                activeOpacity={0.85}
              >
                <View style={styles.subscriptionItemMain}>
                  <Text style={styles.subscriptionItemName}>{sub.planName} – {sub.productLabel}</Text>
                  <Text style={styles.subscriptionItemSupplier}>
                    {sub.subscriptionId ? `ID: ${sub.subscriptionId} · ` : ""}{sub.frequency} • ₹{sub.totalPrice} • {sub.selectedDates?.length || 0} dates
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
            {subscriptions.length === 0 ? (
              <TouchableOpacity style={styles.subscriptionEmptyBtn} onPress={() => router.push("/plan-subscription")} activeOpacity={0.85}>
                <Text style={styles.subscriptionEmptyBtnText}>Browse plans</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.link} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Connected</Text>
            <Text style={styles.sectionHeader}>My devices</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.devicesScrollContent}
          >
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceCardTop}>
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.deviceIconCircle}>
                    <Ionicons name={device.icon} size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>Soon</Text>
                  </View>
                </View>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceStatus}>Coming soon</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.challengeCard} activeOpacity={0.88} onPress={() => router.push("/leaderboard")}>
            <LinearGradient colors={["#FEF9C3", "#FDE68A"]} style={styles.challengeIconWrap}>
              <Ionicons name="trophy" size={26} color="#CA8A04" />
            </LinearGradient>
            <View style={styles.challengeTextWrap}>
              <Text style={styles.cardTitle}>Monthly Hydration Leaderboard</Text>
              <Text style={styles.challengeSubtitle}>Ranked by water intake • Tap to view & manage</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={18} color={theme.accent} />
            </View>
          </TouchableOpacity>

          <View style={styles.inviteCard}>
            <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inviteGradient}>
              <View style={styles.inviteTextWrap}>
                <Text style={styles.inviteTitle}>Invite friends & earn</Text>
                <Text style={styles.inviteSubtitle}>Get 2 free jars for every referral</Text>
              </View>
              <TouchableOpacity style={styles.inviteButton} activeOpacity={0.85}>
                <Text style={styles.inviteButtonText}>Invite now</Text>
              </TouchableOpacity>
            </LinearGradient>
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
      <WaterAiReportModal
        visible={showAiReport}
        onClose={() => setShowAiReport(false)}
        onGenerate={() => api.ai.waterReport()}
      />
      <WaterAiAskModal
        visible={showAiAsk}
        onClose={() => setShowAiAsk(false)}
        onAsk={async (question) => {
          const data = await api.ai.ask(question);
          return data.answer;
        }}
      />
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  scrollContent: { paddingBottom: 36 },
  headerSection: { minHeight: 300, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 36 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    zIndex: 12,
  },
  headerLogoLeft: { alignSelf: "flex-start" },
  headerWelcomeBlock: { marginBottom: 14, alignSelf: "stretch" },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcomeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
  },
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
  profileGreeting: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.82)", textTransform: "capitalize", letterSpacing: 0.3 },
  profileName: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 4, letterSpacing: -0.2 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerCenter: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18, maxWidth: "92%" },
  headerStatsRow: { flexDirection: "row", gap: 10 },
  headerStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  headerStatIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerStatTextWrap: { flex: 1 },
  headerStatLabel: { fontSize: 10, fontWeight: "600", color: "#456173", textTransform: "uppercase", letterSpacing: 0.3 },
  headerStatValue: { fontSize: 15, fontWeight: "800", color: theme.textPrimary, marginTop: 2 },

  contentSection: {
    marginTop: -18,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
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
  orderBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  orderBannerTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  orderBannerMeta: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3 },
  orderBannerCta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  orderBannerCtaText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  cardHeaderIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1 },
  cardHeaderTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  cardHeaderSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  cardHeaderAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.12)",
  },
  cardHeaderActionText: { fontSize: 13, fontWeight: "700", color: theme.link },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginBottom: 4 },

  hydrationCenterWrap: { alignItems: "center", justifyContent: "center", marginBottom: 16, marginTop: 4 },
  trendLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
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
  sectionEyebrow: { fontSize: 11, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeader: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginTop: 2, letterSpacing: -0.2 },

  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14, gap: 10 },
  quickActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  quickActionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 3 },
  quickActionSubtitle: { fontSize: 12, color: theme.textMuted, lineHeight: 16 },

  aiCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14 },
      android: { elevation: 0 },
    }),
  },
  aiCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  aiTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiSparkleWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  newBadge: { backgroundColor: "rgba(251,191,36,0.22)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  newBadgeText: { fontSize: 10, fontWeight: "800", color: "#FDE68A", textTransform: "uppercase", letterSpacing: 0.3 },
  aiCardBody: { fontSize: 14, color: "rgba(255,255,255,0.94)", lineHeight: 21, marginBottom: 14 },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  viewDetailsText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  subscriptionDropdown: { flexDirection: "row", alignItems: "center", gap: 12 },
  subscriptionDropdownIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subscriptionDropdownTextWrap: { flex: 1 },
  subscriptionDropdownTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  subscriptionDropdownHint: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  subscriptionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    paddingTop: 14,
    marginTop: 14,
    gap: 10,
  },
  subscriptionItemMain: { flex: 1 },
  subscriptionItemName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  subscriptionItemSupplier: { fontSize: 12, color: theme.textMuted, marginTop: 4, lineHeight: 17 },
  subscriptionEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.08)",
  },
  subscriptionEmptyBtnText: { fontSize: 14, fontWeight: "700", color: theme.link },

  devicesScrollContent: { paddingBottom: 8, gap: 10 },
  deviceCard: {
    width: 132,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  deviceCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  deviceIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  comingSoonBadgeText: { fontSize: 10, fontWeight: "800", color: "#D97706", textTransform: "uppercase", letterSpacing: 0.3 },
  deviceName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  deviceStatus: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginTop: 4 },

  challengeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  challengeIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  challengeTextWrap: { flex: 1 },
  challengeSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  chevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  inviteCard: { marginBottom: 16, borderRadius: 22, overflow: "hidden" },
  inviteGradient: { flexDirection: "row", alignItems: "center", padding: 18, gap: 12 },
  inviteTextWrap: { flex: 1 },
  inviteTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  inviteSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 4 },
  inviteButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  inviteButtonText: { fontSize: 13, fontWeight: "800", color: theme.accent },

  planModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  planModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "70%",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 0 },
    }),
  },
  planModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  planModalTitle: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
  subscriptionDetailName: { fontSize: 17, fontWeight: "700", color: theme.textPrimary, marginBottom: 6 },
  subscriptionDetailSupplier: { fontSize: 14, color: theme.textMuted, marginBottom: 4 },
  subscriptionDetailMeta: { fontSize: 14, color: theme.textPrimary, marginBottom: 20 },
  subscriptionEditBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 16, alignItems: "center", marginBottom: 10 },
  subscriptionEditBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  subscriptionCancelBtn: { paddingVertical: 14, alignItems: "center" },
  subscriptionCancelBtnText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
});
