import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useCart } from "@/src/context/CartContext";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import WalletModal from "@/src/components/WalletModal";
import { theme } from "@/src/theme";

function MenuRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={item.icon} size={20} color={theme.accent} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.desc ? <Text style={styles.menuDesc}>{item.desc}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const MENU = [
  { id: "orders", label: "Order history", desc: "Past tanker orders", icon: "receipt-outline", route: "/order-history" },
  { id: "track", label: "Track order", desc: "Live delivery status", icon: "navigate-outline", route: "/track-order" },
  { id: "plan", label: "My plan", desc: "Scheduled tanker deliveries", icon: "calendar-outline", action: "societyPlan" },
  { id: "billing", label: "Billing", desc: "Society invoices", icon: "receipt-outline", route: "/billing" },
  { id: "addresses", label: "Saved addresses", desc: "Delivery locations", icon: "location-outline", route: "/saved-addresses" },
  { id: "support", label: "Help & support", desc: "Raise a ticket", icon: "help-circle-outline", route: "/customer-support" },
  { id: "privacy", label: "Privacy policy", desc: "Data protection", icon: "shield-checkmark-outline", route: "/privacy-policy" },
];

export default function SocietyProfileScreen() {
  const router = useRouter();
  const portal = useCustomerPortal();
  const { user, logout } = useAuth();
  const { orders } = useCart();
  const [society, setSociety] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWallet, setShowWallet] = useState(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const societyOrders = orders.filter((o) => o.orderChannel === "society");
  const points = 1250;

  const load = useCallback(async () => {
    try {
      const [soc, wallet] = await Promise.all([
        api.societies.me(),
        api.wallet.get(),
      ]);
      setSociety(soc);
      setWalletBalance(Number(wallet?.balance || 0));
    } catch (_) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const displayName = society?.societyName || user?.name || "Society";
  const initials = displayName.slice(0, 2).toUpperCase();

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
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.headerTitle}>Society profile</Text>
            <Text style={styles.headerSubtitle}>Manage society account & preferences</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.profileHero}>
              <View style={styles.profileHeroTop}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
                <View style={styles.profileHeroInfo}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userEmail}>{society?.pocEmail || user?.email}</Text>
                  {society?.registrationNo ? (
                    <Text style={styles.userMeta}>Reg. {society.registrationNo}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.memberBadge}>
                <Ionicons name="people-outline" size={14} color="#FFFFFF" />
                <Text style={styles.memberBadgeText}>{society?.memberCount ?? 0} linked members</Text>
              </View>
            </LinearGradient>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push("/order-history")}>
                <View style={styles.statCard}>
                  <Ionicons name="bag-check-outline" size={18} color={theme.accent} />
                  <Text style={styles.statValue}>{societyOrders.length}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.statCardWrap}>
                <View style={styles.statCard}>
                  <Ionicons name="trophy-outline" size={18} color={theme.accent} />
                  <Text style={styles.statValue}>{points}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.statCardWrap} onPress={() => setShowWallet(true)}>
                <View style={styles.statCard}>
                  <Ionicons name="wallet-outline" size={18} color="#059669" />
                  <Text style={styles.statValue}>₹{walletBalance.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Wallet</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.menuCard}>
              <Text style={styles.menuSectionTitle}>Society menu</Text>
              {MENU.map((item, idx) => (
                <View key={item.id}>
                  <MenuRow
                    item={item}
                    onPress={() => {
                      if (item.action === "societyPlan") {
                        router.push({ pathname: "/plan-subscription", params: { category: "society" } });
                      } else if (item.route) {
                        router.push(item.route);
                      }
                    }}
                  />
                  {idx < MENU.length - 1 ? <View style={styles.menuDivider} /> : null}
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.homeBtn} onPress={() => router.push(portal.home)} activeOpacity={0.9}>
              <Ionicons name="home-outline" size={18} color={theme.accent} />
              <Text style={styles.homeBtnText}>Back to society dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.9}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
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
  headerSection: { flexShrink: 0 },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 6 },
  contentSection: {
    flex: 1,
    marginTop: -18,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  profileHero: { borderRadius: 20, padding: 18, marginBottom: 16 },
  profileHeroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  profileHeroInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  userMeta: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCardWrap: { flex: 1 },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    gap: 4,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: theme.textPrimary },
  statLabel: { fontSize: 11, color: theme.textMuted, fontWeight: "600" },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E8EDF2",
    marginBottom: 16,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textMuted,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  menuRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
  menuDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 12 },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    marginBottom: 12,
  },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: theme.accent },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#DC2626" },
});
