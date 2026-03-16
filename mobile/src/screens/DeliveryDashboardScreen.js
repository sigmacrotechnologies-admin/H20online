import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & deliver", icon: "cart-outline", route: "delivery-incoming-orders", badgeKey: "incoming" },
  { key: "subscriptions", title: "Subscription orders", subtitle: "Assigned subscription deliveries", icon: "repeat-outline", route: "delivery-subscription-orders", badgeKey: "subscriptions" },
  { key: "history", title: "Order history", subtitle: "Past & completed orders", icon: "time-outline", route: "delivery-order-history" },
  { key: "summary", title: "Order summary", subtitle: "Total, delivered, in progress", icon: "stats-chart-outline", route: "delivery-summary" },
  { key: "financials", title: "Financials", subtitle: "Wallet & redeem", icon: "wallet-outline", route: "delivery-financials" },
  { key: "help", title: "Help", subtitle: "Chat support", icon: "help-circle-outline", route: "delivery-help" },
  { key: "profile", title: "Profile update", subtitle: "Edit your details", icon: "person-outline", route: "delivery-profile" },
];

export default function DeliveryDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const refreshIncoming = useCallback(() => {
    api.deliveryPartners.ordersIncoming().then((list) => setIncomingCount(list?.length || 0)).catch(() => {});
  }, []);
  const refreshSubscriptionCount = useCallback(() => {
    api.deliveryPartners.subscriptions().then((list) => setSubscriptionCount(list?.length || 0)).catch(() => {});
  }, []);

  const refreshProfile = useCallback(() => {
    api.deliveryPartners.me().then((p) => setProfileImageUrl(p?.profileImageUrl || "")).catch(() => {});
  }, []);

  useEffect(() => { refreshIncoming(); refreshSubscriptionCount(); }, [refreshIncoming, refreshSubscriptionCount]);
  useFocusEffect(refreshIncoming);
  useFocusEffect(refreshSubscriptionCount);
  useFocusEffect(refreshProfile);

  const handleTilePress = (tile) => {
    if (tile.route) router.push("/" + tile.route);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    router.replace("/login");
  };

  const partnerName = user?.name || "Partner";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerTopRow}>
              <BackButton onPress={() => router.back()} />
              <TouchableOpacity style={styles.headerMenuBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <TouchableOpacity style={styles.headerIconCircle} onPress={() => router.push("/delivery-profile")} activeOpacity={0.9}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.headerAvatar} />
                ) : (
                  <Ionicons name="bicycle-outline" size={36} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Delivery partner</Text>
              <Text style={styles.headerSubtitle}>{partnerName}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const count = tile.badgeKey === "incoming" ? incomingCount : tile.badgeKey === "subscriptions" ? subscriptionCount : null;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tile}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tileIconWrap}>
                    <Ionicons name={tile.icon} size={32} color={theme.primary} />
                    {count != null && count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setMenuVisible(false); router.push("/delivery-profile"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setMenuVisible(false); router.push("/delivery-order-history"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Order history</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setMenuVisible(false); router.push("/delivery-financials"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Financials</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setMenuVisible(false); router.push("/delivery-help"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Help</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuModalItem, styles.menuModalItemLogout]} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.menuModalItemTextLogout}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 200, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 24, paddingHorizontal: 36, paddingBottom: 36 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  headerMenuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -14, width: "100%" },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerAvatar: { width: 72, height: 72, borderRadius: 36 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.95)" },
  contentPanel: { marginTop: -16, marginLeft: 2, marginRight: 2, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    elevation: 2,
  },
  tileIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 10, position: "relative" },
  badge: { position: "absolute", top: -6, right: -6, backgroundColor: "#EF4444", borderRadius: 12, minWidth: 22, height: 22, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  tileTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 2 },
  tileSubtitle: { fontSize: 12, color: "#6B7C85" },
  menuModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingRight: 20, alignItems: "flex-end" },
  menuModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, minWidth: 220, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuModalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  menuModalItemText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },
  menuModalItemLogout: { borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 4 },
  menuModalItemTextLogout: { flex: 1, fontSize: 16, fontWeight: "600", color: "#EF4444", marginLeft: 12 },
});
