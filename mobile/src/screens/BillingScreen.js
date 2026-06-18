import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import WalletModal from "@/src/components/WalletModal";
import { useWallet } from "@/src/context/WalletContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
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

function billStatusMeta(status) {
  if (status === "paid") {
    return { label: "Paid", color: "#059669", bg: "rgba(5,150,105,0.12)", icon: "checkmark-circle-outline" };
  }
  if (status === "overdue") {
    return { label: "Overdue", color: "#DC2626", bg: "rgba(220,38,38,0.12)", icon: "alert-circle-outline" };
  }
  return { label: "Pending", color: "#D97706", bg: "rgba(217,119,6,0.12)", icon: "time-outline" };
}

export default function BillingScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { balance, setBalance } = useWallet();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showWallet, setShowWallet] = useState(false);

  const fetchBills = useCallback(() => api.bills.list().then(setBills).catch(() => setBills([])), []);

  useEffect(() => {
    fetchBills().finally(() => setLoading(false));
  }, [fetchBills]);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills().finally(() => setRefreshing(false));
  };

  const stats = useMemo(() => {
    const pending = bills.filter((b) => b.status === "pending" || b.status === "overdue");
    const totalDue = pending.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const overdueCount = bills.filter((b) => b.status === "overdue").length;
    return { totalDue, pendingCount: pending.length, overdueCount, paidCount: bills.filter((b) => b.status === "paid").length };
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (activeFilter === "all") return bills;
    return bills.filter((b) => b.status === activeFilter);
  }, [bills, activeFilter]);

  const handlePay = (bill) => {
    if (balance < bill.amount) {
      Alert.alert("Insufficient balance", "Add money to your wallet to pay this bill.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add money", onPress: () => setShowWallet(true) },
      ]);
      return;
    }
    setPayingId(bill.id);
    api.bills
      .pay(bill.id)
      .then((data) => {
        setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: "paid", paidAt: new Date() } : b)));
        if (data.balance != null) setBalance(data.balance);
      })
      .catch((e) => Alert.alert("Error", e.message || "Payment failed"))
      .finally(() => setPayingId(null));
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

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
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push("/profile")}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
          >
            <View style={styles.summaryBanner}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                <View style={styles.summaryBannerIcon}>
                  <Ionicons name="receipt-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.summaryBannerText}>
                  <Text style={styles.summaryBannerLabel}>Amount due</Text>
                  <Text style={styles.summaryBannerValue}>₹{stats.totalDue.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.summaryStatChip}>
                  <Text style={styles.summaryStatValue}>{stats.pendingCount}</Text>
                  <Text style={styles.summaryStatLabel}>Pending</Text>
                </View>
              </LinearGradient>
            </View>

            <TouchableOpacity style={styles.walletCardWrap} onPress={() => setShowWallet(true)} activeOpacity={0.9}>
              <LinearGradient colors={["#059669", "#047857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
                <View style={styles.walletLeft}>
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.walletLabel}>H2 Wallet balance</Text>
                    <Text style={styles.walletTap}>Tap to add or manage funds</Text>
                  </View>
                </View>
                <Text style={styles.walletBalance}>₹{Number(balance || 0).toLocaleString("en-IN")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
                <Text style={styles.statValue}>{stats.paidCount}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={18} color={theme.accent} />
                <Text style={styles.statValue}>{stats.pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, stats.overdueCount > 0 && styles.statCardAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={stats.overdueCount > 0 ? "#DC2626" : theme.textMuted} />
                <Text style={[styles.statValue, stats.overdueCount > 0 && styles.statValueAlert]}>{stats.overdueCount}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>

            <SectionCard icon="calendar-outline" title="Billing info" subtitle="Monthly cycle and payment window">
              <Text style={styles.infoText}>
                Bills are generated on the 1st of each month. Pay within 5 days using your H2 Wallet balance.
              </Text>
            </SectionCard>

            <SectionCard icon="funnel-outline" title="Subscription bills" subtitle="Filter by payment status">
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

              {loading ? (
                <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
              ) : filteredBills.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="receipt-outline" size={32} color={theme.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>No bills found</Text>
                  <Text style={styles.emptyText}>
                    {activeFilter === "all"
                      ? "When you have active subscriptions, monthly bills will appear here."
                      : "No bills match this filter."}
                  </Text>
                </View>
              ) : (
                <View style={styles.billsList}>
                  {filteredBills.map((b) => {
                    const meta = billStatusMeta(b.status);
                    const isPaying = payingId === b.id;
                    const canPay = b.status === "pending" || b.status === "overdue";
                    const insufficient = balance < b.amount;

                    return (
                      <View key={b.id} style={styles.billCard}>
                        <View style={styles.billCardTop}>
                          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.billIcon}>
                            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.billMain}>
                            <Text style={styles.billLabel} numberOfLines={1}>
                              {b.subscriptionLabel || "Subscription"}
                            </Text>
                            <Text style={styles.billPeriod}>
                              {b.period} · Due {formatDate(b.dueDate)}
                            </Text>
                          </View>
                          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                            <Ionicons name={meta.icon} size={12} color={meta.color} />
                            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                        </View>

                        <View style={styles.billAmountRow}>
                          <Text style={styles.billAmount}>₹{Number(b.amount || 0).toLocaleString("en-IN")}</Text>
                          {b.status === "paid" ? (
                            <Text style={styles.paidText}>Paid {formatDate(b.paidAt)}</Text>
                          ) : null}
                        </View>

                        {canPay ? (
                          <TouchableOpacity
                            onPress={() => handlePay(b)}
                            disabled={isPaying}
                            activeOpacity={0.9}
                            style={styles.payBtnWrap}
                          >
                            <LinearGradient
                              colors={insufficient || isPaying ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
                              style={styles.payBtn}
                            >
                              {isPaying ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Ionicons name="wallet-outline" size={16} color={insufficient ? theme.textMuted : "#FFFFFF"} />
                                  <Text style={[styles.payBtnText, insufficient && styles.payBtnTextMuted]}>
                                    {insufficient ? "Insufficient balance" : "Pay from wallet"}
                                  </Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </SectionCard>
          </ScrollView>
        </View>
      </View>

      <WalletModal visible={showWallet} onClose={() => setShowWallet(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
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
  summaryBannerValue: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
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

  walletCardWrap: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  walletCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  walletTap: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  walletBalance: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  statCardAlert: { borderColor: "rgba(220,38,38,0.2)", backgroundColor: "#FEF2F2" },
  statValue: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginTop: 6 },
  statValueAlert: { color: "#DC2626" },
  statLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginTop: 2 },

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
  infoText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
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

  loader: { marginVertical: 28 },
  emptyWrap: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(30,143,177,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 6, lineHeight: 20 },

  billsList: { gap: 12 },
  billCard: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  billCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  billIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  billMain: { flex: 1, minWidth: 0 },
  billLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  billPeriod: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  billAmountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  billAmount: { fontSize: 22, fontWeight: "800", color: theme.accent },
  paidText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  payBtnWrap: { borderRadius: 14, overflow: "hidden", marginTop: 12 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  payBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  payBtnTextMuted: { color: theme.textMuted },
});
