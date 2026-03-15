import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & deliver", icon: "cart-outline", route: "delivery-incoming-orders", badge: true },
  { key: "summary", title: "Order summary", subtitle: "Total orders & stats", icon: "stats-chart-outline", route: "delivery-summary" },
  { key: "financials", title: "Financials", subtitle: "Earnings & payouts", icon: "wallet-outline", route: "delivery-financials" },
  { key: "help", title: "Help", subtitle: "Support & FAQs", icon: "help-circle-outline", route: "delivery-help" },
  { key: "profile", title: "Profile update", subtitle: "Edit your details", icon: "person-outline", route: "delivery-profile" },
];

export default function DeliveryDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    api.deliveryPartners.ordersIncoming().then((list) => setIncomingCount(list?.length || 0)).catch(() => {});
  }, []);

  const handleTilePress = (tile) => {
    if (tile.route) router.push("/" + tile.route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPanel}>
          <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
            <View style={styles.headerRow}>
              <BackButton onPress={() => router.back()} />
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Delivery partner</Text>
                <Text style={styles.welcomeText}>{user?.name || "Partner"}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const count = tile.badge ? incomingCount : null;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tile}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tileIconWrap}>
                    <Ionicons name={tile.icon} size={32} color="#1EA7FD" />
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

          <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace("/login"); }}>
            <Text style={styles.logoutBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  welcomeText: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  contentPanel: { marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 16 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  tile: { width: "50%", paddingHorizontal: 6, marginBottom: 20, alignItems: "center" },
  tileIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center", marginBottom: 10, position: "relative" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#EF4444", justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  tileTitle: { fontSize: 15, fontWeight: "600", color: "#1B2B34", textAlign: "center" },
  tileSubtitle: { fontSize: 12, color: "#6B7C85", marginTop: 2, textAlign: "center" },
  logoutBtn: { marginTop: 24, alignSelf: "flex-start" },
  logoutBtnText: { fontSize: 15, color: "#1EA7FD", fontWeight: "600" },
});
