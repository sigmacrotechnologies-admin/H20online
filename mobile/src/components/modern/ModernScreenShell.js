import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AppLogo from "@/src/components/AppLogo";
import BackButton from "@/src/components/BackButton";
import DropletOverlay from "./DropletOverlay";
import { useAppBack } from "@/src/utils/navigation";
import { modern } from "./modernStyles";
import { theme } from "@/src/theme";

/**
 * Shared modern screen layout: gradient header + logo + curved content panel.
 */
export default function ModernScreenShell({
  title,
  subtitle,
  icon,
  showLogo = true,
  onBack,
  headerRight,
  headerExtra,
  headerHeight,
  scrollRef,
  scrollContentStyle,
  keyboardShouldPersistTaps = "handled",
  children,
}) {
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const resolvedHeaderHeight = (headerHeight ?? (icon ? 220 : 196)) + androidTopInset;
  const smartBack = useAppBack();

  return (
    <SafeAreaView style={modern.container}>
      <View style={[styles.headerSection, { height: resolvedHeaderHeight }]}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: 14 + androidTopInset }]}
        >
          <DropletOverlay />

          <View style={styles.headerTopRow}>
            {onBack !== false ? <BackButton onPress={onBack ?? smartBack} /> : <View style={styles.headerSpacer} />}
            {showLogo ? (
              <AppLogo size="header" />
            ) : (
              <View style={styles.headerSpacer} />
            )}
            {headerRight || <View style={styles.headerSpacer} />}
          </View>

          {(title || subtitle || icon) && (
            <View style={styles.headerCenter}>
              <View style={styles.headerInfoRow}>
                {icon ? (
                  <View style={styles.headerIconCircle}>
                    <Ionicons name={icon} size={24} color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={styles.headerTextWrap}>
                  {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
                  {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
                </View>
              </View>
            </View>
          )}

          {headerExtra}
        </LinearGradient>
      </View>

      <ScrollView
        ref={scrollRef}
        style={modern.contentScroll}
        contentContainerStyle={[modern.scrollContent, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        <View style={modern.contentPanel}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSection: { overflow: "hidden" },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerSpacer: { width: 40, height: 40 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: { elevation: 0 },
    }),
  },
  logo: { width: 148, height: 40 },
  headerCenter: { marginTop: 4 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.94)", marginTop: 3, lineHeight: 18 },
});
