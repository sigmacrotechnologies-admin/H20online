import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const headerStyles = StyleSheet.create({
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.95)" },
  contentPanel: { flex: 1, marginTop: -16, marginLeft: 2, marginRight: 2, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  menuModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingRight: 20, alignItems: "flex-end" },
  menuModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, minWidth: 220, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuModalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  menuModalItemText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },
  menuModalItemLogout: { borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 4 },
  menuModalItemTextLogout: { flex: 1, fontSize: 16, fontWeight: "600", color: "#EF4444", marginLeft: 12 },
});

export default function DeliveryPartnerLayout({ title, subtitle = "", icon = "bicycle-outline", children }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const closeAnd = (fn) => {
    setMenuVisible(false);
    fn();
  };

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    router.replace("/login");
  };

  return (
    <>
      <View style={headerStyles.headerSection}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={headerStyles.gradientBackground}>
          <View style={headerStyles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <TouchableOpacity style={headerStyles.headerMenuBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={headerStyles.headerCenter}>
            <View style={headerStyles.headerIconCircle}>
              <Ionicons name={icon} size={36} color="#FFFFFF" />
            </View>
            <Text style={headerStyles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={headerStyles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </LinearGradient>
      </View>
      <View style={headerStyles.contentPanel}>{children}</View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={headerStyles.menuModalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={headerStyles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={headerStyles.menuModalItem} onPress={() => closeAnd(() => router.push("/delivery-dashboard"))} activeOpacity={0.8}>
              <Ionicons name="home-outline" size={22} color="#1B2B34" />
              <Text style={headerStyles.menuModalItemText}>Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.menuModalItem} onPress={() => closeAnd(() => router.push("/delivery-profile"))} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={headerStyles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.menuModalItem} onPress={() => closeAnd(() => router.push("/delivery-order-history"))} activeOpacity={0.8}>
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={headerStyles.menuModalItemText}>Order history</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.menuModalItem} onPress={() => closeAnd(() => router.push("/delivery-financials"))} activeOpacity={0.8}>
              <Ionicons name="wallet-outline" size={22} color="#1B2B34" />
              <Text style={headerStyles.menuModalItemText}>Financials</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={headerStyles.menuModalItem} onPress={() => closeAnd(() => router.push("/delivery-help"))} activeOpacity={0.8}>
              <Ionicons name="help-circle-outline" size={22} color="#1B2B34" />
              <Text style={headerStyles.menuModalItemText}>Help</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity style={[headerStyles.menuModalItem, headerStyles.menuModalItemLogout]} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={headerStyles.menuModalItemTextLogout}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export { headerStyles as deliveryPartnerHeaderStyles };
