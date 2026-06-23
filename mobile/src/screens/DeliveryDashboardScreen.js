import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import DeliveryScreenShell from "@/src/components/delivery/DeliveryScreenShell";
import { SectionCard, ui } from "@/src/components/supplier/supplierUi";
import { useDeliveryPartnerOnline } from "@/src/hooks/useDeliveryPartnerOnline";
import { theme } from "@/src/theme";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & deliver", icon: "cart-outline", route: "delivery-incoming-orders", badgeKey: "incoming", accent: "#DC2626" },
  { key: "subscriptions", title: "Subscription orders", subtitle: "Assigned subscription deliveries", icon: "repeat-outline", route: "delivery-subscription-orders", badgeKey: "subscriptions", accent: "#7C3AED" },
  { key: "history", title: "Order history", subtitle: "Past & completed orders", icon: "time-outline", route: "delivery-order-history", accent: theme.accent },
  { key: "summary", title: "Order summary", subtitle: "Total, delivered, in progress", icon: "stats-chart-outline", route: "delivery-summary", accent: "#D97706" },
  { key: "financials", title: "Financials", subtitle: "Wallet & redeem", icon: "wallet-outline", route: "delivery-financials", accent: "#0E7490" },
  { key: "help", title: "Help", subtitle: "Chat support", icon: "help-circle-outline", route: "delivery-help", accent: "#6366F1" },
  { key: "profile", title: "Profile update", subtitle: "Edit your details", icon: "person-outline", route: "delivery-profile", accent: "#059669" },
];

function getInitials(name) {
  const parts = String(name || "P").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DeliveryDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const { isOnline, inFlight, setOnline, toggling: onlineToggling } = useDeliveryPartnerOnline();

  const refreshIncoming = useCallback(() => {
    api.deliveryPartners.ordersIncoming().then((list) => setIncomingCount(list?.length || 0)).catch(() => {});
  }, []);
  const refreshSubscriptionCount = useCallback(() => {
    api.deliveryPartners.subscriptions().then((list) => setSubscriptionCount(list?.length || 0)).catch(() => {});
  }, []);
  const refreshProfile = useCallback(() => {
    api.deliveryPartners.me().then((p) => setProfileImageUrl(p?.profileImageUrl || "")).catch(() => {});
  }, []);

  useEffect(() => {
    refreshIncoming();
    refreshSubscriptionCount();
  }, [refreshIncoming, refreshSubscriptionCount]);
  useFocusEffect(useCallback(() => { refreshIncoming(); refreshSubscriptionCount(); refreshProfile(); }, [refreshIncoming, refreshSubscriptionCount, refreshProfile]));

  const handleTilePress = (tile) => {
    if (tile.route) router.push("/" + tile.route);
  };

  const displayName = user?.name || "Partner";
  const firstName = displayName.split(" ")[0] || displayName;

  const headerHero = (
    <View style={styles.headerHero}>
      <View style={styles.welcomeRow}>
        <TouchableOpacity style={styles.avatarRing} onPress={() => router.push("/delivery-profile")} activeOpacity={0.9}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.12)"]} style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
        <View style={styles.welcomeTextWrap}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.welcomeName}>{firstName}</Text>
          <Text style={styles.welcomeSub}>Delivery hub · orders, routes & earnings</Text>
        </View>
        <View style={styles.partnerBadge}>
          <Ionicons name="bicycle" size={14} color="#FFFFFF" />
          <Text style={styles.partnerBadgeText}>Partner</Text>
        </View>
      </View>

      <View style={styles.headerStatsRow}>
        <View style={[styles.headerStatCard, incomingCount > 0 && styles.headerStatCardAlert]}>
          <View style={[styles.headerStatIcon, incomingCount > 0 && styles.headerStatIconAlert]}>
            <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Incoming</Text>
          <Text style={styles.headerStatValue}>{incomingCount}</Text>
        </View>
        <View style={styles.headerStatCard}>
          <View style={styles.headerStatIcon}>
            <Ionicons name="repeat-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Subscriptions</Text>
          <Text style={styles.headerStatValue}>{subscriptionCount}</Text>
        </View>
        <View style={styles.headerStatCard}>
          <View style={styles.headerStatIcon}>
            <Ionicons name={inFlight ? "airplane-outline" : "navigate-outline"} size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Status</Text>
          <Text style={styles.headerStatValue} numberOfLines={1}>
            {inFlight ? "In flight" : isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <DeliveryScreenShell showBack={false} tallHeader showMenu headerExtra={headerHero}>
      <ScrollView style={styles.scroll} contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        {incomingCount > 0 ? (
          <TouchableOpacity
            style={styles.alertBannerWrap}
            onPress={() => router.push("/delivery-incoming-orders")}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#EF4444", "#DC2626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.alertBanner}>
              <View style={styles.alertBannerIcon}>
                <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.alertBannerText}>
                <Text style={styles.alertBannerTitle}>
                  {incomingCount} incoming order{incomingCount !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.alertBannerSub}>Tap to review and start delivering</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {inFlight ? (
          <View style={styles.inFlightBanner}>
            <Ionicons name="airplane-outline" size={20} color="#B45309" />
            <View style={styles.inFlightTextWrap}>
              <Text style={styles.inFlightTitle}>Delivery in progress</Text>
              <Text style={styles.inFlightSub}>Complete the current order to receive new assignments from suppliers.</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.onlineCard, isOnline && styles.onlineCardActive]}
          onPress={() => setOnline(!isOnline)}
          activeOpacity={0.9}
          disabled={onlineToggling}
        >
          <LinearGradient
            colors={inFlight ? ["#D97706", "#B45309"] : isOnline ? ["#059669", "#047857"] : ["#64748B", "#475569"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.onlineCardGradient}
          >
            <View style={styles.onlineTopRow}>
              <View style={styles.onlineIconWrap}>
                <Ionicons
                  name={inFlight ? "airplane-outline" : isOnline ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.onlineTextWrap}>
                <Text style={styles.onlineTitle}>
                  {inFlight ? "You are in flight" : isOnline ? "You are online" : "You are offline"}
                </Text>
                <Text style={styles.onlineSub}>
                  {inFlight
                    ? "Finish this delivery first. Location sharing stays active while you are online."
                    : isOnline
                      ? "Sharing live location — suppliers can assign you nearby orders"
                      : "Go online to share location and receive assignments"}
                </Text>
              </View>
            </View>
            <Text style={styles.onlineAction}>{onlineToggling ? "…" : isOnline ? "Go offline" : "Go online"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <SectionCard icon="grid-outline" title="Quick actions" subtitle="Everything you need on delivery">
          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const count =
                tile.badgeKey === "incoming"
                  ? incomingCount
                  : tile.badgeKey === "subscriptions"
                    ? subscriptionCount
                    : null;
              const isFeatured = tile.key === "incoming" && count > 0;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tileWrap}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.88}
                >
                  {isFeatured ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileGradientBorder}>
                      <View style={styles.tileInner}>
                        <DashboardTile tile={tile} count={count} featured />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tile}>
                      <DashboardTile tile={tile} count={count} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>
      </ScrollView>
    </DeliveryScreenShell>
  );
}

function DashboardTile({ tile, count, featured = false }) {
  return (
    <>
      <View style={styles.tileTopRow}>
        <LinearGradient
          colors={featured ? [theme.medium, theme.accent] : [`${tile.accent}22`, `${tile.accent}10`]}
          style={styles.tileIconCircle}
        >
          <Ionicons name={tile.icon} size={22} color={featured ? "#FFFFFF" : tile.accent} />
        </LinearGradient>
        {count != null && count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        )}
      </View>
      <Text style={[styles.tileTitle, featured && styles.tileTitleFeatured]}>{tile.title}</Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>{tile.subtitle}</Text>
      <View style={styles.tileFooter}>
        <View style={[styles.tileDot, featured && styles.tileDotActive]} />
        <Text style={[styles.tileFooterText, featured && styles.tileFooterTextActive]}>
          {featured ? "Action needed" : "Open"}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  headerHero: { marginTop: 8 },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.34)",
    overflow: "hidden",
  },
  avatarCircle: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 56, height: 56 },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  welcomeTextWrap: { flex: 1, minWidth: 0 },
  welcomeLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  welcomeName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 2, letterSpacing: -0.4 },
  welcomeSub: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 4, lineHeight: 16 },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    flexShrink: 0,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  headerStatsRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  headerStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  headerStatCardAlert: { backgroundColor: "rgba(239,68,68,0.22)", borderColor: "rgba(255,255,255,0.34)" },
  headerStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerStatIconAlert: { backgroundColor: "rgba(255,255,255,0.24)" },
  headerStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
  headerStatValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginTop: 3 },
  alertBannerWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  alertBanner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  alertBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertBannerText: { flex: 1 },
  alertBannerTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  alertBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  inFlightBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  inFlightTextWrap: { flex: 1, minWidth: 0 },
  inFlightTitle: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  inFlightSub: { fontSize: 12, color: "#B45309", marginTop: 4, lineHeight: 17 },
  onlineCard: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  onlineCardActive: {},
  onlineCardGradient: { padding: 16, gap: 12 },
  onlineTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  onlineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineTextWrap: { flex: 1, minWidth: 0 },
  onlineTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  onlineSub: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4, lineHeight: 17 },
  onlineAction: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", alignSelf: "flex-end" },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tileWrap: { width: "48%", marginBottom: 14 },
  tileGradientBorder: { borderRadius: 22, padding: 2 },
  tileInner: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    minHeight: 158,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    minHeight: 158,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  tileTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  tileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  tileTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginBottom: 4 },
  tileTitleFeatured: { color: theme.accent },
  tileSubtitle: { fontSize: 12, color: theme.textMuted, lineHeight: 16, minHeight: 32 },
  tileFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  tileDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(107,124,133,0.35)" },
  tileDotActive: { backgroundColor: theme.medium },
  tileFooterText: { fontSize: 11, fontWeight: "600", color: theme.textMuted },
  tileFooterTextActive: { color: theme.accent },
});
