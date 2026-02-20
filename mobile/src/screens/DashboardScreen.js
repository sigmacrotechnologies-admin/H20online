import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const HEADER_HEIGHT = 220;

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

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
  const userName = "Sarah";
  const weekData = useMemo(() => getRandomTrend(), []);
  const hydration = useMemo(() => getRandomHydration(), []);

  const quickActions = [
    { id: 1, title: "Order Jar", subtitle: "Repeat last order", icon: "water-outline" },
    { id: 2, title: "My Plan", subtitle: "Family Pack + Active", icon: "document-text-outline" },
    { id: 3, title: "Track", subtitle: "Arriving 2:30 PM", icon: "car-outline" },
    { id: 4, title: "$45.50", subtitle: "Auto-pay on", icon: "pricetag-outline" },
  ];

  const devices = [
    { id: 1, name: "Apple Watch", icon: "watch-outline", connected: true },
    { id: 2, name: "Smart Bottle", icon: "water-outline", connected: true },
    { id: 3, name: "TV Hub", icon: "tv-outline", connected: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top gradient panel - keep as is, margins aligned with RoleSelection */}
        <View style={styles.headerPanel}>
          <LinearGradient
            colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.decorCircle3} />

            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInPanel}>
              <View style={styles.avatarSmall}>
                <Ionicons name="person" size={32} color="#60A5FA" />
              </View>
              <Text style={styles.helloText}>Hello, {userName}</Text>
              <Text style={styles.welcomeText}></Text>
              <View style={styles.welcomePadding} />
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View style={styles.progressBarFill} />
                </View>
                <Text style={styles.progressText}>1/5 completed</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content panel with curved top radius */}
        <View style={styles.contentSection}>
          {/* Hydration Progress Card - pie chart with % and consumption centered, 7-day trend random */}
          <View style={styles.card}>
            <View style={styles.hydrationCenterWrap}>
              <View style={styles.pieChartOuter}>
                <View style={[styles.pieChartFillWrap, { transform: [{ rotate: `${(hydration.pct / 100) * 360}deg` }] }]}>
                  <View style={styles.pieChartHalf} />
                  <View style={styles.pieChartHalfHole} />
                </View>
                <View style={styles.pieChartInner}>
                  <Text style={styles.hydrationPercent}>{hydration.pct}%</Text>
                  <Text style={styles.hydrationVolume}>{hydration.current}L / {hydration.goal}L</Text>
                  <Text style={styles.hydrationLabel}>Daily Goal</Text>
                </View>
              </View>
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
              <TouchableOpacity key={action.id} style={styles.quickActionCard} activeOpacity={0.8}>
                <View style={styles.quickActionIconCircle}>
                  <Ionicons name={action.icon} size={24} color="#0EA5E9" />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
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
                    <Ionicons name={device.icon} size={28} color="#0EA5E9" />
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
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  scrollContent: { paddingBottom: 30 },
  headerPanel: { height: HEADER_HEIGHT, marginLeft: -20, marginRight: -20, overflow: "hidden" },
  headerGradient: { flex: 1, paddingTop: 14, paddingBottom: 20, paddingHorizontal: 28, position: "relative" },
  decorCircle1: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  decorCircle2: { position: "absolute", bottom: -20, left: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255, 255, 255, 0.08)" },
  decorCircle3: { position: "absolute", top: 60, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.06)" },
  headerNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center" },
  profileInPanel: { alignItems: "center", paddingVertical: 8 },
  avatarSmall: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255, 255, 255, 0.9)", justifyContent: "center", alignItems: "center", marginBottom: 5 },
  helloText: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  welcomeText: { fontSize: 14, color: "rgba(255, 255, 255, 0.9)", marginBottom: 0, paddingBottom:20 },
  welcomePadding: { height: 16 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressBarBg: { width: 120, height: 6, borderRadius: 3, backgroundColor: "rgba(255, 255, 255, 0.3)", overflow: "hidden" },
  progressBarFill: { width: "20%", height: "100%", backgroundColor: "#FFFFFF", borderRadius: 3 },
  progressText: { fontSize: 12, color: "rgba(255, 255, 255, 0.9)", fontWeight: "600" },

  contentSection: { paddingHorizontal: 20, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, overflow: "hidden" },
  card: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2, borderWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },

  hydrationCenterWrap: { alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pieChartOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 10, borderColor: "#A5D6FA", alignItems: "center", justifyContent: "center" },
  pieChartFillWrap: { position: "absolute", width: 140, height: 140, borderRadius: 70, overflow: "hidden" },
  pieChartHalf: { position: "absolute", left: 0, top: 0, width: 70, height: 140, borderTopLeftRadius: 70, borderBottomLeftRadius: 70, backgroundColor: "#0EA5E9" },
  pieChartHalfHole: { position: "absolute", left: 10, top: 10, width: 60, height: 120, borderTopLeftRadius: 60, borderBottomLeftRadius: 60, backgroundColor: "#f0f7fcd7" },
  pieChartInner: { alignItems: "center", justifyContent: "center", zIndex: 1 },
  hydrationPercent: { fontSize: 28, fontWeight: "800", color: "#0EA5E9", marginBottom: 2 },
  hydrationVolume: { fontSize: 14, color: "#1B2B34", marginBottom: 2 },
  hydrationLabel: { fontSize: 12, color: "#6B7C85" },
  trendLabel: { fontSize: 13, color: "#1B2B34", marginBottom: 12, fontWeight: "600" },
  barChartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 56 },
  barChartItem: { flex: 1, alignItems: "center", marginHorizontal: 2 },
  barWrapper: { flex: 1, width: "80%", justifyContent: "flex-end", alignItems: "center", minHeight: 36 },
  barSolid: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#21ba9e", borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 12, color: "#1B2B34", marginTop: 8, fontWeight: "500" },

  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  quickActionCard: { width: "47%", backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 16, elevation: 2 },
  quickActionIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  quickActionTitle: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  quickActionSubtitle: { fontSize: 12, color: "#6B7C85" },

  aiCard: { backgroundColor: "#312E81", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2 },
  aiCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  aiTitleRow: { flexDirection: "row", alignItems: "center" },
  aiSparkle: { marginRight: 8 },
  aiCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  newBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  newBadgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  aiCardBody: { fontSize: 14, color: "rgba(255,255,255,0.95)", lineHeight: 22, marginBottom: 16 },
  viewDetailsButton: { backgroundColor: "#38BDF8", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignSelf: "flex-start" },
  viewDetailsText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  sectionHeader: { fontSize: 17, fontWeight: "700", color: "#1B2B34", marginBottom: 12 },
  devicesScrollContent: { paddingBottom: 8, gap: 12 },
  deviceCard: { width: 120, backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 16, marginRight: 12, elevation: 2, marginBottom:10 },
  deviceCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  deviceIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  connectedDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center" },
  connectedDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  deviceName: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },

  challengeRow: { flexDirection: "row", alignItems: "center" },
  trophyCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FEF9C3", justifyContent: "center", alignItems: "center", marginRight: 14 },
  challengeTextWrap: { flex: 1 },
  challengeSubtitle: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  chevronCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center" },

  inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inviteTextWrap: { flex: 1, marginRight: 12 },
  inviteSubtitle: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  inviteButton: { backgroundColor: "#1E40AF", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  inviteButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
