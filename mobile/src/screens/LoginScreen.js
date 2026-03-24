import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const LOGIN_ROLES = [
  { id: 1, title: "Customer", icon: "person-outline" },
  { id: 2, title: "Supplier", icon: "cube-outline" },
  { id: 3, title: "Delivery partner", icon: "bicycle-outline" },
  { id: 4, title: "Corporate", icon: "business-outline" },
  { id: 5, title: "Restaurant", icon: "restaurant-outline" },
  { id: 6, title: "Event Org", icon: "calendar-outline" },
  { id: 7, title: "Institute", icon: "school-outline" },
];

const ROLE_TO_DB = {
  Customer: "customer",
  Supplier: "supplier",
  "Delivery partner": "deliveryPartner",
  Corporate: "corporate",
  Restaurant: "restaurant",
  "Event Org": "eventOrg",
  Institute: "institute",
};
const COMING_SOON_ROLES = ["Corporate", "Restaurant", "Event Org", "Institute"];
const HEADER_DROPLETS = [
  { left: -8, top: 18, width: 16, height: 22, phase: "a" },
  { left: 22, top: 58, width: 14, height: 20, phase: "b" },
  { left: 56, top: 20, width: 18, height: 24, phase: "c" },
  { left: 92, top: 86, width: 14, height: 20, phase: "a" },
  { left: 132, top: 38, width: 16, height: 22, phase: "b" },
  { left: 172, top: 102, width: 14, height: 20, phase: "c" },
  { left: 212, top: 60, width: 16, height: 22, phase: "a" },
  { left: 24, top: 156, width: 14, height: 20, phase: "c" },
  { right: 118, top: 68, width: 14, height: 20, phase: "a" },
  { right: 82, top: 30, width: 16, height: 22, phase: "b" },
  { right: 46, top: 94, width: 14, height: 20, phase: "c" },
  { right: 10, top: 54, width: 16, height: 22, phase: "a" },
  { right: -6, top: 124, width: 14, height: 20, phase: "b" },
  { right: 92, top: 160, width: 14, height: 20, phase: "c" },
];

const LoginScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleFromParams = (params?.role && typeof params.role === "string") ? params.role : null;
  const roleForLookup = roleFromParams === "Partner" ? "Delivery partner" : roleFromParams;
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const contentScrollRef = useRef(null);
  const [passwordAnchorY, setPasswordAnchorY] = useState(0);
  const [loginAnchorY, setLoginAnchorY] = useState(0);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;

  const initialRole =
    (roleForLookup && LOGIN_ROLES.find((r) => r.title === roleForLookup)) || LOGIN_ROLES[0];
  const [selectedRole, setSelectedRole] = useState(initialRole);
  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400);
    const b = loop(dropletAnimB, 4200);
    const c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

  const handleLogin = async () => {
    setError("");
    const emailTrim = email.trim();
    const pwd = password.trim();
    if (!emailTrim) {
      setError("Please enter your email");
      return;
    }
    if (!pwd) {
      setError("Please enter your password");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept Terms & Conditions to continue");
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(emailTrim, pwd);
      const requiredRole = ROLE_TO_DB[selectedRole.title];
      if (requiredRole && loggedInUser?.role !== requiredRole) {
        logout();
        if (requiredRole === "supplier" && loggedInUser?.role === "deliveryPartner") {
          setError("This is a delivery partner account. Please select the Delivery partner tab and use your delivery email and password.");
        } else if (requiredRole === "supplier") {
          setError("This is a customer email ID. You are signing in as Supplier — please use your supplier email and password.");
        } else if (requiredRole === "deliveryPartner" && loggedInUser?.role === "supplier") {
          setError("This is a supplier account. Please select the Supplier tab to sign in.");
        } else if (requiredRole === "deliveryPartner") {
          setError("This is a customer email ID. You are signing in as Delivery partner — please use your delivery partner email and password.");
        } else if (requiredRole === "customer") {
          setError("This is a supplier or delivery partner email ID. You are signing in as Customer — please use your customer email and password.");
        } else {
          setError(`This account does not match the selected role (${selectedRole.title}). Please use the correct email and password for this profile type.`);
        }
        return;
      }
      if (loggedInUser?.role === "supplier") {
        const supplierData = await api.suppliers.me().catch(() => null);
        if (supplierData?.onboardingStatus === "approved") {
          router.replace("/supplier-dashboard");
        } else {
          router.replace("/supplier-verification-pending");
        }
      } else if (loggedInUser?.role === "deliveryPartner") {
        const dpData = await api.deliveryPartners.me().catch(() => null);
        if (dpData?.onboardingStatus === "approved") {
          router.replace("/delivery-dashboard");
        } else {
          router.replace("/delivery-verification-pending");
        }
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Optional: not compulsory for now
    setError("Google sign-in coming soon");
  };

  const handleAppleSignIn = () => {
    // Optional: not compulsory for now
    setError("Apple sign-in coming soon");
  };

  const canLogin = email.trim().length > 0 && password.trim().length > 0 && termsAccepted;
  const isComingSoonRole = COMING_SOON_ROLES.includes(selectedRole.title);
  const scrollToY = (y) => {
    if (!contentScrollRef.current || y <= 0) return;
    contentScrollRef.current.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
        >
          <View style={styles.headerOverlay}>
            {HEADER_DROPLETS.map((drop, idx) => {
              const dropAnim = getDropletAnim(drop.phase);
              return (
                <Animated.View
                  key={`login-drop-${idx}`}
                  style={[styles.dropletWrap, {
                    left: drop.left, right: drop.right, top: drop.top, width: drop.width, height: drop.height,
                    opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                    transform: [
                      { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                      { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                    ],
                  }]}
                >
                  <Svg width="100%" height="100%" viewBox="0 0 60 80">
                    <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                  </Svg>
                </Animated.View>
              );
            })}
          </View>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.replace("/")} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.headerInfoRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Login</Text>
                <Text style={styles.headerSubtitle}>Sign in with your profile email and password</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        ref={contentScrollRef}
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentPanel}>
        <Text style={styles.roleLabel}>Sign in as</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleTilesScroll}
          style={styles.roleTilesContainer}
        >
          {LOGIN_ROLES.map((role) => {
            const isSelected = selectedRole.title === role.title;
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleTile, isSelected && styles.roleTileSelected]}
                onPress={() => setSelectedRole(role)}
                activeOpacity={0.8}
              >
                <View style={[styles.roleTileIconWrap, isSelected && styles.roleTileIconWrapSelected]}>
                  <Ionicons
                    name={role.icon}
                    size={24}
                    color={isSelected ? "#FFFFFF" : theme.textMuted}
                  />
                </View>
                <Text style={[styles.roleTileText, isSelected && styles.roleTileTextSelected]} numberOfLines={1}>
                  {role.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.subtitle}>Use your email and password to log in. Enter the email and password for the selected profile type.</Text>

        {isComingSoonRole ? (
          <View style={styles.comingSoonCard}>
            <Ionicons name="time-outline" size={40} color={theme.primary} />
            <Text style={styles.comingSoonTitle}>Feature coming soon</Text>
            <Text style={styles.comingSoonText}>
              {selectedRole.title} login will be available soon.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.inputSection}>
              <Text style={styles.label}>Email ID</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => scrollToY(passwordAnchorY)}
                />
              </View>
            </View>

            <View style={styles.inputSection} onLayout={(e) => setPasswordAnchorY(e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  onFocus={() => scrollToY(loginAnchorY)}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms & Conditions</Text>
                {" "}and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onLayout={(e) => setLoginAnchorY(e.nativeEvent.layout.y)}
              style={[styles.loginButton, (!canLogin || loading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={!canLogin || loading}
              activeOpacity={canLogin && !loading ? 0.9 : 1}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={canLogin && !loading ? styles.loginButtonText : styles.loginButtonTextDisabled}>
                  Log in
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => router.push("/forgot-password")}
              activeOpacity={0.8}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.socialSection}>
              <Text style={styles.socialLabel}>Or continue with</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} activeOpacity={0.8}>
                  <Ionicons name="logo-google" size={24} color="#1B2B34" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn} activeOpacity={0.8}>
                  <Ionicons name="logo-apple" size={24} color="#1B2B34" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => {
                if (selectedRole.title === "Supplier") router.replace("/supplier-onboarding");
                else if (selectedRole.title === "Delivery partner") router.replace("/delivery-onboarding");
                else router.replace("/create-profile");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpLinkText}>{"Don't have an account? Sign up"}</Text>
            </TouchableOpacity>
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerSection: { height: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 34 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerCenter: { alignItems: "flex-start", justifyContent: "center", marginTop: 2, width: "100%" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentScroll: { flex: 1, marginTop: -16 },
  contentScrollInner: { paddingBottom: Platform.OS === "android" ? 40 : 24 },
  contentPanel: {
    marginTop: 0,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 34 : 20,
  },
  roleLabel: { fontSize: 14, fontWeight: "600", color: theme.textPrimary, marginBottom: 10 },
  roleTilesContainer: { marginHorizontal: -4, marginBottom: 4 },
  roleTilesScroll: { paddingHorizontal: 4, paddingVertical: 4, flexDirection: "row" },
  roleTile: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 10,
  },
  roleTileSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  roleTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  roleTileIconWrapSelected: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  roleTileText: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textAlign: "center" },
  roleTileTextSelected: { color: "#FFFFFF" },
  subtitle: { fontSize: 14, color: theme.textMuted, marginBottom: 24, marginTop: 4 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginBottom: 10 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: "rgba(214,234,242,0.95)",
    shadowColor: "#0B3A4A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: theme.textPrimary, padding: 0, margin: 0, borderWidth: 0, backgroundColor: "transparent", includeFontPadding: false },
  termsRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.primaryLight, marginRight: 12, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  termsText: { flex: 1, fontSize: 14, color: theme.textMuted },
  termsLink: { color: theme.link, fontWeight: "600" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  loginButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  loginButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: theme.white },
  loginButtonTextDisabled: { fontSize: 16, fontWeight: "600", color: "#8A9AA3" },
  socialSection: { marginTop: 24, marginBottom: 20 },
  socialLabel: { fontSize: 13, color: theme.textMuted, textAlign: "center", marginBottom: 12 },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.85)", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  socialButtonText: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
  forgotPasswordLink: { marginTop: 8, alignItems: "center" },
  forgotPasswordText: { fontSize: 13, fontWeight: "600", color: theme.link, textDecorationLine: "underline" },
  signUpLink: { alignItems: "center", paddingVertical: 12 },
  signUpLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  comingSoonCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    marginTop: 8,
    marginBottom: 18,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2B34",
    marginTop: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#6B7C85",
    marginTop: 6,
    textAlign: "center",
  },
});
