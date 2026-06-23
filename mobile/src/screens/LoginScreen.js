import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { resolveHomeRoute } from "@/src/utils/authRouting";
import {
  ModernScreenShell,
  ModernInput,
  ModernPrimaryButton,
  modern,
} from "@/src/components/modern";
import { theme } from "@/src/theme";

const PRIMARY_ROLES = [
  { id: 1, title: "Customer", icon: "person-outline", desc: "Order & track water" },
  { id: 2, title: "Supplier", icon: "storefront-outline", desc: "Manage inventory" },
  { id: 3, title: "Delivery partner", icon: "bicycle-outline", desc: "Deliver orders" },
];

const SECONDARY_ROLES = [
  { id: 4, title: "Corporate", icon: "business-outline", comingSoon: true },
  { id: 5, title: "Restaurant", icon: "restaurant-outline", comingSoon: true },
  { id: 6, title: "Event Org", icon: "calendar-outline", comingSoon: true },
  { id: 7, title: "Society", icon: "home-outline" },
];

const LOGIN_ROLES = [...PRIMARY_ROLES, ...SECONDARY_ROLES];

const ROLE_TO_DB = {
  Customer: "customer",
  Supplier: "supplier",
  "Delivery partner": "deliveryPartner",
  Corporate: "corporate",
  Restaurant: "restaurant",
  "Event Org": "eventOrg",
  Society: "society",
};

const FOCUSED_ROLE_HERO = {
  Customer: {
    icon: "person",
    title: "Customer",
    desc: "Order water, track deliveries & manage your plan",
    signInLabel: "Signing in as",
  },
  Society: {
    icon: "home",
    title: "Society",
    desc: "Order water tankers for your residential society",
    signInLabel: "Signing in as",
  },
};

const LoginScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleFromParams = params?.role && typeof params.role === "string" ? params.role : null;
  const roleForLookup =
    roleFromParams === "Partner" ? "Supplier" : roleFromParams;
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const contentScrollRef = useRef(null);
  const [formAnchorY, setFormAnchorY] = useState(0);

  const initialRole =
    (roleForLookup && LOGIN_ROLES.find((r) => r.title === roleForLookup)) || PRIMARY_ROLES[0];
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const isCustomerFlow = roleFromParams === "Customer";
  const isSocietyFlow = roleFromParams === "Society";
  const isFocusedFlow = isCustomerFlow || isSocietyFlow;
  const focusedHero = FOCUSED_ROLE_HERO[roleFromParams] || null;
  const [showRolePicker, setShowRolePicker] = useState(!isFocusedFlow);

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
          setError("This is a delivery partner account. Select Delivery partner and use your delivery credentials.");
        } else if (requiredRole === "supplier") {
          setError("This email is for a customer account. Use your supplier email and password.");
        } else if (requiredRole === "deliveryPartner" && loggedInUser?.role === "supplier") {
          setError("This is a supplier account. Select Supplier to sign in.");
        } else if (requiredRole === "deliveryPartner") {
          setError("This email is for a customer account. Use your delivery partner credentials.");
        } else if (requiredRole === "customer") {
          setError("This email belongs to a supplier or partner. Use your customer credentials.");
        } else {
          setError(`Account does not match ${selectedRole.title}. Use the correct profile credentials.`);
        }
        return;
      }
      if (loggedInUser?.role === "supplier" || loggedInUser?.role === "deliveryPartner") {
        router.replace(await resolveHomeRoute(loggedInUser));
      } else {
        router.replace(await resolveHomeRoute(loggedInUser));
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const canLogin = email.trim().length > 0 && password.trim().length > 0 && termsAccepted;
  const isComingSoonRole = selectedRole.comingSoon;
  const scrollToForm = () => {
    if (contentScrollRef.current && formAnchorY > 0) {
      contentScrollRef.current.scrollTo({ y: Math.max(0, formAnchorY - 20), animated: true });
    }
  };

  const goToSignup = () => {
    if (selectedRole.title === "Supplier") router.replace("/supplier-onboarding");
    else if (selectedRole.title === "Delivery partner") router.replace("/delivery-onboarding");
    else router.replace("/create-profile");
  };

  const handleRoleSelect = (role) => {
    if (role.title === "Supplier" || role.title === "Delivery partner") {
      router.replace({ pathname: "/partner-login", params: { role: role.title } });
      return;
    }
    setSelectedRole(role);
  };

  return (
    <ModernScreenShell
      title={isCustomerFlow ? "Customer sign in" : "Welcome back"}
      subtitle={isCustomerFlow ? "Access orders, tracking & hydration goals" : "Sign in to your H2Online account"}
      icon={isCustomerFlow ? "person-outline" : "water-outline"}
      onBack={() => router.replace("/")}
      scrollRef={contentScrollRef}
      headerHeight={isCustomerFlow ? 200 : 210}
    >
      {isFocusedFlow && !showRolePicker && focusedHero ? (
        <View style={styles.customerHero}>
          <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.customerHeroGradient}>
            <View style={styles.customerHeroIcon}>
              <Ionicons name={focusedHero.icon} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.customerHeroText}>
              <Text style={styles.customerHeroLabel}>{focusedHero.signInLabel}</Text>
              <Text style={styles.customerHeroTitle}>{focusedHero.title}</Text>
              <Text style={styles.customerHeroDesc}>{focusedHero.desc}</Text>
            </View>
            <Ionicons name="shield-checkmark" size={22} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
          <TouchableOpacity style={styles.changeProfileLink} onPress={() => setShowRolePicker(true)} activeOpacity={0.8}>
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.link} />
            <Text style={styles.changeProfileText}>Sign in with a different profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
      <Text style={styles.pageTitle}>Sign in as</Text>
      <Text style={styles.pageSubtitle}>Pick your profile to continue</Text>

      <View style={styles.primaryRoleGrid}>
        {PRIMARY_ROLES.map((role) => {
          const isSelected = selectedRole.title === role.title;
          return (
            <TouchableOpacity
              key={role.id}
              style={styles.primaryRoleWrap}
              onPress={() => handleRoleSelect(role)}
              activeOpacity={0.88}
            >
              {isSelected ? (
                <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryRoleGradient}>
                  <View style={styles.primaryRoleInner}>
                    <RoleCard role={role} selected />
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.primaryRoleCard}>
                  <RoleCard role={role} selected={false} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.moreRolesLabel}>More profiles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryScroll}>
        {SECONDARY_ROLES.map((role) => {
          const isSelected = selectedRole.title === role.title;
          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.secondaryChip, isSelected && styles.secondaryChipSelected]}
              onPress={() => handleRoleSelect(role)}
              activeOpacity={0.85}
            >
              <Ionicons name={role.icon} size={16} color={isSelected ? "#FFFFFF" : theme.accent} />
              <Text style={[styles.secondaryChipText, isSelected && styles.secondaryChipTextSelected]}>{role.title}</Text>
              <View style={styles.soonBadge}><Text style={styles.soonBadgeText}>Soon</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isFocusedFlow && showRolePicker ? (
        <TouchableOpacity style={styles.changeProfileLink} onPress={() => setShowRolePicker(false)} activeOpacity={0.8}>
          <Ionicons name="chevron-up-outline" size={16} color={theme.link} />
          <Text style={styles.changeProfileText}>
            Back to {focusedHero?.title?.toLowerCase() || "profile"} sign in
          </Text>
        </TouchableOpacity>
      ) : null}
        </>
      )}

      {!showRolePicker && isFocusedFlow ? null : (
      <View style={styles.selectedBanner}>
        <LinearGradient colors={["rgba(51,175,193,0.14)", "rgba(30,143,177,0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.selectedBannerInner}>
          <View style={styles.selectedBannerIcon}>
            <Ionicons name={selectedRole.icon} size={20} color={theme.accent} />
          </View>
          <View style={styles.selectedBannerText}>
            <Text style={styles.selectedBannerLabel}>Signing in as</Text>
            <Text style={styles.selectedBannerValue}>{selectedRole.title}</Text>
          </View>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
        </LinearGradient>
      </View>
      )}

      {isComingSoonRole && (showRolePicker || !isFocusedFlow) ? (
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIconWrap}>
            <Ionicons name="time-outline" size={32} color={theme.accent} />
          </View>
          <Text style={styles.comingSoonTitle}>Coming soon</Text>
          <Text style={styles.comingSoonText}>{selectedRole.title} login is not available yet. Try Customer, Supplier, or Delivery partner.</Text>
          <TouchableOpacity style={styles.switchRoleBtn} onPress={() => setSelectedRole(PRIMARY_ROLES[0])} activeOpacity={0.85}>
            <Text style={styles.switchRoleBtnText}>Switch to Customer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard} onLayout={(e) => setFormAnchorY(e.nativeEvent.layout.y)}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.formCardIcon}>
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={styles.formCardTitle}>Account credentials</Text>
              <Text style={styles.formCardSubtitle}>Enter email & password for {selectedRole.title}</Text>
            </View>
          </View>

          <ModernInput
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={scrollToForm}
          />

          <View style={modern.inputSection}>
            <Text style={modern.label}>Password</Text>
            <View style={styles.passwordRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7C85" style={modern.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted(!termsAccepted)} activeOpacity={0.8}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <ModernPrimaryButton label="Sign in securely" onPress={handleLogin} disabled={!canLogin} loading={loading} icon="arrow-forward" />

          <TouchableOpacity style={styles.forgotLink} onPress={() => router.push("/forgot-password")} activeOpacity={0.8}>
            <Text style={styles.forgotLinkText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isComingSoonRole && (
        <TouchableOpacity
          style={styles.otpLink}
          onPress={() =>
            router.push({
              pathname: "/login-otp",
              params: {
                role:
                  selectedRole.title === "Delivery partner"
                    ? "Partner"
                    : selectedRole.title === "Supplier"
                      ? "Supplier"
                      : "Customer",
              },
            })
          }
          activeOpacity={0.85}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={theme.link} />
          <Text style={styles.otpLinkText}>Sign in with OTP instead</Text>
        </TouchableOpacity>
      )}

      {!isComingSoonRole && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialPill} onPress={() => setError("Google sign-in coming soon")} activeOpacity={0.85}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.socialPillText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialPill} onPress={() => setError("Apple sign-in coming soon")} activeOpacity={0.85}>
              <Ionicons name="logo-apple" size={20} color={theme.textPrimary} />
              <Text style={styles.socialPillText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.signUpFooter} onPress={goToSignup} activeOpacity={0.85}>
        <Text style={styles.signUpFooterText}>New to H2Online?</Text>
        <Text style={styles.signUpFooterAction}>Create an account →</Text>
      </TouchableOpacity>
    </ModernScreenShell>
  );
};

function RoleCard({ role, selected }) {
  return (
    <>
      <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
        <Ionicons name={role.icon} size={22} color={selected ? "#FFFFFF" : theme.accent} />
      </View>
      <Text style={[styles.roleCardTitle, selected && styles.roleCardTitleSelected]} numberOfLines={1}>{role.title}</Text>
      {role.desc ? (
        <Text style={[styles.roleCardDesc, selected && styles.roleCardDescSelected]} numberOfLines={2}>{role.desc}</Text>
      ) : null}
      {selected && (
        <View style={styles.roleCheck}>
          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
        </View>
      )}
    </>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  pageTitle: { fontSize: 22, fontWeight: "700", color: theme.textPrimary, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 14, color: theme.textMuted, marginTop: 4, marginBottom: 18 },
  customerHero: { marginBottom: 16 },
  customerHeroGradient: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 0 },
    }),
  },
  customerHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  customerHeroText: { flex: 1 },
  customerHeroLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.5 },
  customerHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  customerHeroDesc: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4, lineHeight: 16 },
  changeProfileLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, marginBottom: 4 },
  changeProfileText: { fontSize: 13, fontWeight: "600", color: theme.link },
  primaryRoleGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  primaryRoleWrap: { width: "31.5%" },
  primaryRoleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    minHeight: 118,
    padding: 12,
    alignItems: "center",
    position: "relative",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  primaryRoleGradient: { borderRadius: 20, minHeight: 118, padding: 2 },
  primaryRoleInner: { flex: 1, alignItems: "center", padding: 10, minHeight: 114, justifyContent: "center", position: "relative" },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  roleIconWrapSelected: { backgroundColor: "rgba(255,255,255,0.22)" },
  roleCardTitle: { fontSize: 12, fontWeight: "700", color: theme.textPrimary, textAlign: "center" },
  roleCardTitleSelected: { color: "#FFFFFF" },
  roleCardDesc: { fontSize: 10, color: theme.textMuted, textAlign: "center", marginTop: 4, lineHeight: 13 },
  roleCardDescSelected: { color: "rgba(255,255,255,0.88)" },
  roleCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreRolesLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  secondaryScroll: { paddingBottom: 14, gap: 8 },
  secondaryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    gap: 6,
  },
  secondaryChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  secondaryChipText: { fontSize: 12, fontWeight: "600", color: theme.textPrimary },
  secondaryChipTextSelected: { color: "#FFFFFF" },
  soonBadge: { backgroundColor: "rgba(51,175,193,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  soonBadgeText: { fontSize: 9, fontWeight: "700", color: theme.accent },
  selectedBanner: { marginBottom: 16, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(51,175,193,0.2)" },
  selectedBannerInner: { flexDirection: "row", alignItems: "center", padding: 14 },
  selectedBannerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  selectedBannerText: { flex: 1 },
  selectedBannerLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  selectedBannerValue: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginTop: 2 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
  },
  formCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 12 },
  formCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formCardTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  formCardSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
    padding: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  eyeBtn: { padding: 4, marginLeft: 8 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.primaryLight, marginRight: 10, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  termsText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 19 },
  termsLink: { color: theme.link, fontWeight: "600" },
  errorBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(220,38,38,0.08)", borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  errorBannerText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500", lineHeight: 18 },
  forgotLink: { alignItems: "center", marginTop: 12 },
  forgotLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  otpLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    marginBottom: 8,
  },
  otpLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(214,234,242,0.95)" },
  dividerText: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
  socialRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  socialPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  socialPillText: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  signUpFooter: { alignItems: "center", paddingVertical: 20, marginTop: 4 },
  signUpFooterText: { fontSize: 13, color: theme.textMuted },
  signUpFooterAction: { fontSize: 15, fontWeight: "700", color: theme.link, marginTop: 4 },
  comingSoonCard: { ...modern.card, alignItems: "center", paddingVertical: 28 },
  comingSoonIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(51,175,193,0.12)", alignItems: "center", justifyContent: "center" },
  comingSoonTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary, marginTop: 14 },
  comingSoonText: { fontSize: 14, color: theme.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20 },
  switchRoleBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: theme.primary },
  switchRoleBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
});
