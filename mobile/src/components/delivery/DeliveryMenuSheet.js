import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { theme } from "@/src/theme";

const MENU_SECTIONS = [
  {
    title: "Deliveries",
    items: [
      { id: "dashboard", label: "Partner dashboard", desc: "Home & quick actions", icon: "grid-outline", route: "/delivery-dashboard" },
      { id: "incoming", label: "Incoming orders", desc: "Accept & deliver", icon: "cart-outline", route: "/delivery-incoming-orders" },
      { id: "subscriptions", label: "Subscription orders", desc: "Recurring deliveries", icon: "repeat-outline", route: "/delivery-subscription-orders" },
      { id: "history", label: "Order history", desc: "Past & completed orders", icon: "time-outline", route: "/delivery-order-history" },
    ],
  },
  {
    title: "Insights & money",
    items: [
      { id: "summary", label: "Order summary", desc: "Totals & progress", icon: "stats-chart-outline", route: "/delivery-summary" },
      { id: "financials", label: "Financials", desc: "Wallet & redeem", icon: "wallet-outline", route: "/delivery-financials" },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", desc: "Update your details", icon: "person-outline", route: "/delivery-profile" },
      { id: "help", label: "Help & support", desc: "Chat with admin", icon: "help-circle-outline", route: "/delivery-help" },
    ],
  },
];

function getInitials(name) {
  const parts = String(name || "P").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DeliveryMenuSheet({ visible, onClose }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const displayName = user?.name || "Partner";

  const navigate = (route) => {
    onClose();
    router.push(route);
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          onClose();
          logout();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.panel}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.handle} />
            <View style={styles.heroTop}>
              <View style={styles.heroLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroLabel}>Delivery partner</Text>
                  <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.heroEmail} numberOfLines={1}>{user?.email || ""}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="bicycle-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Partner portal</Text>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {MENU_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuRow}
                    onPress={() => navigate(item.route)}
                    activeOpacity={0.88}
                  >
                    <LinearGradient colors={[`${theme.accent}18`, `${theme.medium}10`]} style={styles.menuIcon}>
                      <Ionicons name={item.icon} size={20} color={theme.accent} />
                    </LinearGradient>
                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuDesc}>{item.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.9}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  panel: {
    maxHeight: "92%",
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  hero: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginBottom: 14,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  heroText: { flex: 1, minWidth: 0 },
  heroLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  heroName: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  heroEmail: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  heroBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  menuDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
});
