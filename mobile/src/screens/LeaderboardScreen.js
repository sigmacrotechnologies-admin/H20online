import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

function getInitials(name) {
  const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "U").toUpperCase();
}

function rankStyle(rank) {
  if (rank === 1) return { bg: "#FEF9C3", color: "#CA8A04", icon: "trophy" };
  if (rank === 2) return { bg: "#F3F4F6", color: "#6B7280", icon: "medal-outline" };
  if (rank === 3) return { bg: "#FFEDD5", color: "#C2410C", icon: "medal-outline" };
  return { bg: "rgba(51,175,193,0.1)", color: theme.accent, icon: null };
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuth();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [optIn, setOptIn] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.leaderboard.get();
      setData(res);
      setOptIn(!!res.preferences?.optIn);
      setMonthlyReport(!!res.preferences?.monthlyReport);
    } catch (_) {
      setData(null);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchLeaderboard().finally(() => setLoading(false));
    }, [isAuthenticated, fetchLeaderboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard().finally(() => setRefreshing(false));
  };

  const updatePreference = async (key, value) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const prev = { optIn, monthlyReport };
    if (key === "optIn") setOptIn(value);
    if (key === "monthlyReport") setMonthlyReport(value);
    setSaving(true);
    try {
      const body = key === "optIn" ? { optIn: value } : { monthlyReport: value };
      const res = await api.leaderboard.updatePreferences(body);
      setOptIn(!!res.optIn);
      setMonthlyReport(!!res.monthlyReport);
      if (setUser && user) {
        setUser({ ...user, leaderboardOptIn: !!res.optIn, leaderboardMonthlyReport: !!res.monthlyReport });
      }
      await fetchLeaderboard();
    } catch (_) {
      setOptIn(prev.optIn);
      setMonthlyReport(prev.monthlyReport);
    } finally {
      setSaving(false);
    }
  };

  const rankings = data?.rankings || [];
  const periodLabel = data?.period?.label || "This month";
  const myRank = data?.me?.rank;
  const myLiters = data?.me?.totalLiters ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={theme.gradient} style={[styles.header, { paddingTop: 12 + androidTopInset }]}>
        <DropletOverlay />
        <View style={styles.headerTop}>
          <BackButton onPress={() => router.back()} />
          <AppLogo size="header" />
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.headerTitle}>Hydration leaderboard</Text>
        <Text style={styles.headerSubtitle}>Monthly rankings based on water intake</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient colors={["#FEF9C3", "#FDE68A"]} style={styles.cardIcon}>
              <Ionicons name="trophy" size={20} color="#CA8A04" />
            </LinearGradient>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Your preferences</Text>
              <Text style={styles.cardSubtitle}>Control visibility and monthly reports</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Join leaderboard</Text>
              <Text style={styles.toggleHint}>Include my water intake in monthly rankings</Text>
            </View>
            <Switch
              value={optIn}
              onValueChange={(v) => updatePreference("optIn", v)}
              disabled={saving}
              trackColor={{ false: "#D1D5DB", true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Monthly report</Text>
              <Text style={styles.toggleHint}>Receive a monthly summary of your hydration rank</Text>
            </View>
            <Switch
              value={monthlyReport}
              onValueChange={(v) => updatePreference("monthlyReport", v)}
              disabled={saving}
              trackColor={{ false: "#D1D5DB", true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {optIn ? (
          <View style={styles.myStatsCard}>
            <Text style={styles.myStatsLabel}>Your {periodLabel} stats</Text>
            <View style={styles.myStatsRow}>
              <View style={styles.myStatItem}>
                <Text style={styles.myStatValue}>{myRank ? `#${myRank}` : "—"}</Text>
                <Text style={styles.myStatCaption}>Rank</Text>
              </View>
              <View style={styles.myStatDivider} />
              <View style={styles.myStatItem}>
                <Text style={styles.myStatValue}>{Number(myLiters).toFixed(1)} L</Text>
                <Text style={styles.myStatCaption}>Water intake</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.optOutBanner}>
            <Ionicons name="eye-off-outline" size={18} color={theme.textMuted} />
            <Text style={styles.optOutText}>Turn on "Join leaderboard" to appear in rankings and track your rank.</Text>
          </View>
        )}

        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionEyebrow}>Monthly</Text>
          <Text style={styles.sectionTitle}>{periodLabel}</Text>
          <Text style={styles.sectionHint}>Ranked by total water intake (liters)</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : rankings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="water-outline" size={32} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptySubtitle}>Log your water intake and opt in to start climbing the board.</Text>
          </View>
        ) : (
          rankings.map((entry) => {
            const rs = rankStyle(entry.rank);
            return (
              <View
                key={entry.userId}
                style={[styles.rankRow, entry.isCurrentUser && styles.rankRowHighlight]}
              >
                <View style={[styles.rankBadge, { backgroundColor: rs.bg }]}>
                  {rs.icon ? (
                    <Ionicons name={rs.icon} size={16} color={rs.color} />
                  ) : (
                    <Text style={[styles.rankNumber, { color: rs.color }]}>{entry.rank}</Text>
                  )}
                </View>
                {entry.avatarUrl ? (
                  <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{getInitials(entry.name)}</Text>
                  </LinearGradient>
                )}
                <View style={styles.rankMain}>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {entry.name}{entry.isCurrentUser ? " (You)" : ""}
                  </Text>
                  <Text style={styles.rankMeta}>#{entry.rank} this month</Text>
                </View>
                <Text style={styles.rankLiters}>{Number(entry.totalLiters).toFixed(1)} L</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },
  scrollContent: { padding: 20, paddingBottom: 36 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  cardSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleTextWrap: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  toggleHint: { fontSize: 12, color: theme.textMuted, marginTop: 4, lineHeight: 17 },
  toggleDivider: { height: 1, backgroundColor: "rgba(214,234,242,0.95)", marginVertical: 14 },
  myStatsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  myStatsLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  myStatsRow: { flexDirection: "row", alignItems: "center" },
  myStatItem: { flex: 1, alignItems: "center" },
  myStatValue: { fontSize: 22, fontWeight: "800", color: theme.textPrimary },
  myStatCaption: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  myStatDivider: { width: 1, height: 40, backgroundColor: "rgba(214,234,242,0.95)" },
  optOutBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  optOutText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 19 },
  sectionHeaderWrap: { marginBottom: 12, marginTop: 4 },
  sectionEyebrow: { fontSize: 11, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginTop: 2 },
  sectionHint: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  loader: { marginTop: 24 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: theme.textMuted, textAlign: "center", marginTop: 6, lineHeight: 19 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 10,
  },
  rankRowHighlight: { borderColor: theme.accent, backgroundColor: "rgba(51,175,193,0.06)" },
  rankBadge: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rankNumber: { fontSize: 14, fontWeight: "800" },
  avatar: { width: 40, height: 40, borderRadius: 14 },
  avatarFallback: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  rankMain: { flex: 1, minWidth: 0 },
  rankName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  rankMeta: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  rankLiters: { fontSize: 14, fontWeight: "800", color: theme.accent },
});
