import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import AppLogo from "@/src/components/AppLogo";
import SupplierMenuSheet from "@/src/components/supplier/SupplierMenuSheet";
import { useAppBack } from "@/src/utils/navigation";
import { theme } from "@/src/theme";

export default function SupplierScreenShell({
  children,
  onBack,
  showBack = true,
  showMenu = false,
  onMenu,
  headerExtra,
  footer,
  tallHeader = false,
}) {
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [menuVisible, setMenuVisible] = useState(false);
  const defaultBack = useAppBack("/supplier-dashboard");

  const handleMenuPress = () => {
    if (onMenu) {
      onMenu();
      return;
    }
    if (showMenu) setMenuVisible(true);
  };

  const showMenuButton = showMenu || !!onMenu;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={[styles.headerSection, tallHeader && styles.headerSectionTall]}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientBackground,
              tallHeader && styles.gradientBackgroundTall,
              { paddingTop: 12 + androidTopInset },
            ]}
          >
            <DropletOverlay />
            <View style={[styles.headerTopRow, tallHeader && styles.headerTopRowTall]}>
              {showBack ? <BackButton onPress={onBack ?? defaultBack} /> : <View style={styles.headerSpacer} />}
              <AppLogo size="header" />
              {showMenuButton ? (
                <TouchableOpacity style={styles.headerMenuBtn} onPress={handleMenuPress} activeOpacity={0.85}>
                  <Ionicons name="menu" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerSpacer} />
              )}
            </View>
            {headerExtra}
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>{children}</View>
      </View>
      {footer}
      <SupplierMenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  headerSectionTall: { minHeight: 320 },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 28 },
  gradientBackgroundTall: { paddingBottom: 40 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  headerTopRowTall: { marginBottom: 18 },
  headerSpacer: { width: 40, height: 40 },
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
    marginTop: -28,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
});
