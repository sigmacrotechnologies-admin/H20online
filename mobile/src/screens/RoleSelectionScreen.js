import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, ScrollView, Alert, Platform, StatusBar, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import AppLogo from "@/src/components/AppLogo";
import { theme } from "@/src/theme";

const roles = [
  { id: 1, title: "Customer", subtitle: "Home delivery & tracking", icon: "person-outline" },
  { id: 2, title: "Partner", subtitle: "Manage orders & logistics", icon: "storefront-outline" },
  { id: 4, title: "Corporate", subtitle: "Office supply analytics", icon: "business-outline", comingSoon: true },
  { id: 5, title: "Restaurant", subtitle: "Hospitality solutions", icon: "restaurant-outline", comingSoon: true },
  { id: 6, title: "Event Org", subtitle: "Large volume planning", icon: "calendar-outline", comingSoon: true },
  { id: 7, title: "Society", subtitle: "Tanker orders for residents", icon: "home-outline" },
];

const COMING_SOON_MESSAGES = {
  Corporate: "Corporate feature is coming soon.",
  Restaurant: "Restaurant feature is coming soon.",
  "Event Org": "Event org feature is coming soon.",
};

const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 14, top: 62, width: 16, height: 22, phase: "b" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { left: 88, top: 94, width: 14, height: 20, phase: "a" },
  { left: 124, top: 44, width: 22, height: 30, phase: "b" },
  { left: 164, top: 12, width: 16, height: 22, phase: "c" },
  { left: 206, top: 74, width: 18, height: 24, phase: "a" },
  { left: 34, top: 150, width: 18, height: 24, phase: "c" },
  { right: 146, top: 36, width: 20, height: 28, phase: "c" },
  { right: 110, top: 8, width: 16, height: 22, phase: "a" },
  { right: 76, top: 66, width: 18, height: 24, phase: "b" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: 8, top: 98, width: 16, height: 22, phase: "a" },
  { right: 62, top: 154, width: 18, height: 24, phase: "b" },
  { right: -10, top: 18, width: 18, height: 24, phase: "b" },
  { left: 20, top: 220, width: 16, height: 22, phase: "a" },
  { left: 86, top: 266, width: 18, height: 24, phase: "b" },
  { left: 146, top: 312, width: 16, height: 22, phase: "c" },
  { left: 204, top: 246, width: 18, height: 24, phase: "a" },
  { right: 132, top: 226, width: 16, height: 22, phase: "b" },
  { right: 70, top: 286, width: 18, height: 24, phase: "c" },
  { right: 14, top: 338, width: 16, height: 22, phase: "a" },
  { left: 44, top: 404, width: 18, height: 24, phase: "b" },
  { left: 122, top: 470, width: 16, height: 22, phase: "c" },
  { right: 96, top: 430, width: 18, height: 24, phase: "a" },
  { right: 22, top: 516, width: 16, height: 22, phase: "b" },
  { left: 12, top: 578, width: 18, height: 24, phase: "c" },
  { left: 174, top: 612, width: 16, height: 22, phase: "a" },
  { right: 48, top: 650, width: 18, height: 24, phase: "b" },
];

const RoleSelectionScreen = ({ onReplayLoading }) => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const scrollRef = useRef(null);
  const [actionAnchorY, setActionAnchorY] = useState(0);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400), b = loop(dropletAnimB, 4200), c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => (phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA);

  const handleContinue = () => {
    if (selectedRole.comingSoon) {
      Alert.alert("Coming soon", COMING_SOON_MESSAGES[selectedRole.title] || "This feature is coming soon.");
      return;
    }
    if (selectedRole.title === "Customer") {
      router.push("/create-profile");
    } else if (selectedRole.title === "Partner") {
      router.push("/supplier-onboarding");
    } else if (selectedRole.title === "Society") {
      router.push("/society-onboarding");
    }
  };

  const getSignupButtonText = () => {
    if (selectedRole.comingSoon) return `Continue as ${selectedRole.title}`;
    if (selectedRole.title === "Customer") return "Sign up as customer";
    if (selectedRole.title === "Partner") return "Sign up as partner or supplier";
    if (selectedRole.title === "Society") return "Sign up as society";
    return `Continue as ${selectedRole.title}`;
  };

  const getLoginButtonText = () => {
    if (selectedRole.title === "Customer") return "Login as customer";
    if (selectedRole.title === "Partner") return "Login as supplier";
    if (selectedRole.title === "Society") return "Login as society";
    return `Login as ${selectedRole.title}`;
  };

  const handleLogin = (roleParam) => {
    const roleConfig = roles.find((r) => r.title === roleParam);
    if (roleConfig?.comingSoon) {
      Alert.alert("Coming soon", COMING_SOON_MESSAGES[roleParam] || "This feature is coming soon.");
      return;
    }
    if (roleParam === "Customer") {
      router.push({ pathname: "/login", params: { role: "Customer" } });
      return;
    }
    if (
      roleParam === "Partner" ||
      roleParam === "Supplier" ||
      roleParam === "Delivery partner"
    ) {
      const partnerRole =
        roleParam === "Partner" || roleParam === "Supplier" ? "Supplier" : roleParam;
      router.push({ pathname: "/partner-login", params: { role: partnerRole } });
      return;
    }
    router.push({ pathname: "/login", params: { role: roleParam } });
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    if (scrollRef.current && actionAnchorY > 0) {
      scrollRef.current.scrollTo({ y: Math.max(0, actionAnchorY - 36), animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerSection, { height: (Platform.OS === "android" ? 196 : 184) + androidTopInset }]}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: 12 + androidTopInset }]}
        >
          <View style={styles.headerOverlay} pointerEvents="none">
            {HEADER_DROPLETS.map((drop, idx) => {
              const dropAnim = getDropletAnim(drop.phase);
              return (
                <Animated.View
                  key={`role-drop-${idx}`}
                  style={[
                    styles.dropletWrap,
                    {
                      left: drop.left,
                      right: drop.right,
                      top: drop.top,
                      width: drop.width,
                      height: drop.height,
                      opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.28] }),
                      transform: [
                        { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
                        { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) },
                      ],
                    },
                  ]}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 60 80">
                    <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.28)" />
                  </Svg>
                </Animated.View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.logoHero} onPress={onReplayLoading} activeOpacity={0.9}>
            <AppLogo size="hero" />
            <Text style={styles.brandTagline}>Pure water, delivered smart</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentPanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose your role</Text>
            <Text style={styles.sectionSubtitle}>Select how you want to use H2Online</Text>
          </View>

          <View style={styles.grid}>
            {roles.map((role) => {
              const isSelected = selectedRole.title === role.title;
              return (
                <TouchableOpacity
                  key={role.id}
                  style={styles.cardWrap}
                  onPress={() => handleSelectRole(role)}
                  activeOpacity={0.88}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={[theme.medium, theme.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradientBorder}
                    >
                      <View style={styles.cardInner}>
                        <RoleCardContent role={role} isSelected />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.card, role.comingSoon && styles.cardMuted]}>
                      <RoleCardContent role={role} isSelected={false} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.selectedBanner}>
            <LinearGradient
              colors={["rgba(51,175,193,0.12)", "rgba(30,143,177,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.selectedBannerGradient}
            >
              <View style={styles.selectedBannerIcon}>
                <Ionicons name={selectedRole.icon} size={18} color={theme.accent} />
              </View>
              <View style={styles.selectedBannerText}>
                <Text style={styles.selectedBannerLabel}>Selected profile</Text>
                <Text style={styles.selectedBannerValue}>{selectedRole.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.accent} />
            </LinearGradient>
          </View>

          {selectedRole.title === "Partner" ? (
            <View onLayout={(e) => setActionAnchorY(e.nativeEvent.layout.y)}>
              <TouchableOpacity
                style={styles.partnerSignInCard}
                onPress={() => router.push("/partner-login")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.medium, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.partnerSignInGradient}
                >
                  <View style={styles.partnerSignInIcon}>
                    <Ionicons name="briefcase-outline" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.partnerSignInText}>
                    <Text style={styles.partnerSignInTitle}>Sign in to partner portal</Text>
                    <Text style={styles.partnerSignInDesc}>
                      Supplier or delivery partner — one secure login hub
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.partnerQuickRow}>
                <TouchableOpacity
                  style={styles.partnerQuickChip}
                  onPress={() => handleLogin("Supplier")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="storefront-outline" size={16} color={theme.accent} />
                  <Text style={styles.partnerQuickText}>Supplier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.partnerQuickChip}
                  onPress={() => handleLogin("Delivery partner")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="bicycle-outline" size={16} color={theme.accent} />
                  <Text style={styles.partnerQuickText}>Delivery</Text>
                </TouchableOpacity>
              </View>
              <ActionButton label="Sign up as partner or supplier" onPress={handleContinue} variant="primary" />
            </View>
          ) : (
            <View onLayout={(e) => setActionAnchorY(e.nativeEvent.layout.y)}>
              <ActionButton label={getLoginButtonText()} onPress={() => handleLogin(selectedRole.title)} variant="outline" />
              <ActionButton label={getSignupButtonText()} onPress={handleContinue} variant="primary" />
            </View>
          )}

          <Text style={styles.footer}>
            By continuing, you agree to our{" "}
            <Text style={styles.link}>Terms</Text> &{" "}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function RoleCardContent({ role, isSelected }) {
  return (
    <>
      {isSelected && (
        <LinearGradient
          colors={[theme.medium, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardAccentBar}
        />
      )}
      <View style={styles.cardTopRow}>
        <LinearGradient
          colors={isSelected ? [theme.medium, theme.accent] : ["rgba(51,175,193,0.16)", "rgba(30,143,177,0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardIconCircle}
        >
          <Ionicons name={role.icon} size={24} color={isSelected ? "#FFFFFF" : theme.accent} />
        </LinearGradient>
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
          </View>
        ) : role.comingSoon ? (
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="rgba(107,124,133,0.45)" />
        )}
      </View>
      <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>{role.title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={2}>
        {role.subtitle}
      </Text>
      {!role.comingSoon && (
        <View style={styles.cardFooter}>
          <View style={[styles.statusDot, isSelected && styles.statusDotActive]} />
          <Text style={[styles.cardFooterText, isSelected && styles.cardFooterTextActive]}>
            {isSelected ? "Ready to continue" : "Tap to select"}
          </Text>
        </View>
      )}
    </>
  );
}

function ActionButton({ label, onPress, variant }) {
  if (variant === "primary") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.actionWrap}>
        <LinearGradient
          colors={[theme.medium, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.outlineButton} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.outlineButtonText}>{label}</Text>
      <Ionicons name="log-in-outline" size={18} color={theme.accent} />
    </TouchableOpacity>
  );
}

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
  },
  headerSection: {
    overflow: "hidden",
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
    justifyContent: "center",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dropletWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  logoHero: {
    alignItems: "center",
    zIndex: 2,
  },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
    }),
  },
  logo: {
    width: 210,
    height: 58,
  },
  brandTagline: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.94)",
    letterSpacing: 0.3,
  },
  contentScroll: {
    flex: 1,
    marginTop: -30,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "android" ? 36 : 24,
  },
  contentPanel: {
    backgroundColor: "#F8FCFD",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.textPrimary,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  cardWrap: {
    width: "48%",
    maxWidth: "48%",
    marginBottom: 14,
  },
  cardGradientBorder: {
    borderRadius: 24,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
    }),
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    minHeight: 162,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 0 },
    }),
  },
  cardMuted: {
    opacity: 0.82,
  },
  cardInner: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    minHeight: 158,
    overflow: "hidden",
  },
  cardAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    zIndex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingLeft: 18,
  },
  cardIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    paddingHorizontal: 18,
    marginTop: 14,
    letterSpacing: -0.2,
  },
  cardTitleSelected: {
    color: theme.accent,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    paddingHorizontal: 18,
    marginTop: 5,
    lineHeight: 17,
    minHeight: 34,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(107,124,133,0.35)",
  },
  statusDotActive: {
    backgroundColor: theme.medium,
  },
  cardFooterText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.textMuted,
  },
  cardFooterTextActive: {
    color: theme.accent,
  },
  comingSoonPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(51,175,193,0.12)",
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.2)",
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedBanner: {
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.18)",
  },
  selectedBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectedBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedBannerValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginTop: 2,
  },
  actionWrap: {
    marginTop: 10,
  },
  outlineButton: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(51,175,193,0.35)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.accent,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.24,
        shadowRadius: 10,
      },
      android: { elevation: 0 },
    }),
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    paddingRight: 8,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 18,
    lineHeight: 18,
  },
  link: {
    color: theme.link,
    fontWeight: "600",
  },
  partnerSignInCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: { elevation: 0 },
    }),
  },
  partnerSignInGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  partnerSignInIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerSignInText: { flex: 1 },
  partnerSignInTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  partnerSignInDesc: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4, lineHeight: 17 },
  partnerQuickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  partnerQuickChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.28)",
  },
  partnerQuickText: { fontSize: 13, fontWeight: "700", color: theme.accent },
});
