import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, ScrollView, Alert, Platform, StatusBar, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { theme } from "@/src/theme";

const roles = [
  { id: 1, title: "Customer", subtitle: "Home delivery & tracking", icon: "👤" },
  { id: 2, title: "Partner", subtitle: "Manage orders & logistics", icon: "🚚" },
  { id: 4, title: "Corporate", subtitle: "Office supply analytics", icon: "🏢", comingSoon: true },
  { id: 5, title: "Restaurant", subtitle: "Hospitality solutions", icon: "🍽️", comingSoon: true },
  { id: 6, title: "Event Org", subtitle: "Large volume planning", icon: "📅", comingSoon: true },
  { id: 7, title: "Institute", subtitle: "Campus monitoring", icon: "🎓", comingSoon: true },
];

const COMING_SOON_MESSAGES = {
  Corporate: "Corporate feature is coming soon.",
  Restaurant: "Restaurant feature is coming soon.",
  "Event Org": "Event org feature is coming soon.",
  Institute: "Institute feature is coming soon.",
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
    }
  };

  const getSignupButtonText = () => {
    if (selectedRole.comingSoon) return `Continue as ${selectedRole.title}`;
    if (selectedRole.title === "Customer") return "Sign up as customer";
    if (selectedRole.title === "Partner") return "Sign up as partner or supplier";
    return `Continue as ${selectedRole.title}`;
  };

  const getLoginButtonText = () => {
    if (selectedRole.title === "Customer") return "Login as customer";
    if (selectedRole.title === "Partner") return "Login as supplier";
    return `Login as ${selectedRole.title}`;
  };

  const handleLogin = (roleParam) => {
    const roleConfig = roles.find((r) => r.title === roleParam);
    if (roleConfig?.comingSoon) {
      Alert.alert("Coming soon", COMING_SOON_MESSAGES[roleParam] || "This feature is coming soon.");
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
      <LinearGradient
        colors={["#33AFC1", "#63CDE3", "#A9E9F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <View style={styles.headerOverlay}>
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
                    opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                    transform: [
                      { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                      { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                    ],
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 60 80">
                  <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                </Svg>
              </Animated.View>
            );
          })}
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 26 + androidTopInset }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Icon - tap to replay loading screen */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onReplayLoading}
            activeOpacity={0.9}
          >
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.logo} resizeMode="contain" />
          </TouchableOpacity>

          {/* Role Grid (tiles) */}
          <View style={styles.grid}>
            {roles.map((role) => {
              const isSelected = selectedRole.title === role.title;
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.card, isSelected && styles.selectedCard]}
                  onPress={() => handleSelectRole(role)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardIconCircle}>
                    <Text style={styles.cardIcon}>{role.icon}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                  {isSelected && <View style={styles.tick} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Partner tile: three options; others: login + signup */}
          {selectedRole.title === "Partner" ? (
            <View onLayout={(e) => setActionAnchorY(e.nativeEvent.layout.y)}>
              <TouchableOpacity
                style={[styles.actionButton, styles.loginButton]}
                onPress={() => handleLogin("Supplier")}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Login as supplier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.loginButton]}
                onPress={() => handleLogin("Delivery partner")}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Login as partner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.signupButton]}
                activeOpacity={0.9}
                onPress={handleContinue}
              >
                <Text style={styles.signupButtonText}>Sign up as partner or supplier →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View onLayout={(e) => setActionAnchorY(e.nativeEvent.layout.y)}>
              <TouchableOpacity
                style={[styles.actionButton, styles.loginButton]}
                onPress={() => handleLogin(selectedRole.title)}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>{getLoginButtonText()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.signupButton]}
                activeOpacity={0.9}
                onPress={handleContinue}
              >
                <Text style={styles.signupButtonText}>{getSignupButtonText()} →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer}>
            By continuing, you agree to our{" "}
            <Text style={styles.link}>Terms</Text> &{" "}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  backgroundGradient: {
    flex: 1,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dropletWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 14,
  },

  logo: {
    width: 238,
    height: 68,
    marginBottom: 14,
  },

  icon: {
    fontSize: 28,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: theme.textPrimary,
    marginTop: 10,
  },

  subtitle: {
    textAlign: "center",
    color: theme.textSecondary,
    marginTop: 6,
    marginBottom: 25,
    fontSize: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    // Keep 2 columns even on smaller phones by sizing relative to available width
    // (ScrollView already applies `paddingHorizontal: 20`, so two ~48% cards fit).
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    alignItems: "center",
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: theme.medium,
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  cardIconCircle: {
    backgroundColor: "rgba(51,175,193,0.2)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  cardIcon: {
    fontSize: 20,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
  },

  cardSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 4,
  },

  tick: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.medium,
  },

  actionButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 0,
    marginLeft: 11,
    marginRight: 11,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  loginButton: {
    backgroundColor: theme.medium,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  signupButton: {
    backgroundColor: theme.accent,
  },

  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 15,
  },

  link: {
    color: theme.link,
    fontWeight: "500",
  },
});
