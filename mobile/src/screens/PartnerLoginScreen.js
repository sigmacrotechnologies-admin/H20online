import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
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

const PARTNER_TYPES = {
  supplier: {
    id: "supplier",
    roleKey: "Supplier",
    dbRole: "supplier",
    icon: "storefront",
    tabIcon: "storefront-outline",
    label: "Supplier",
    headline: "Supplier portal",
    desc: "Manage your catalog, accept orders & track supplier earnings",
    otpRole: "Supplier",
    signupRoute: "/supplier-onboarding",
    perks: [
      { icon: "cube-outline", label: "Catalog" },
      { icon: "cart-outline", label: "Orders" },
      { icon: "wallet-outline", label: "Earnings" },
    ],
  },
  delivery: {
    id: "delivery",
    roleKey: "Delivery partner",
    dbRole: "deliveryPartner",
    icon: "bicycle",
    tabIcon: "bicycle-outline",
    label: "Delivery",
    headline: "Delivery partner hub",
    desc: "Pick up orders, complete routes & grow your delivery income",
    otpRole: "Partner",
    signupRoute: "/delivery-onboarding",
    perks: [
      { icon: "navigate-outline", label: "Routes" },
      { icon: "repeat-outline", label: "Subscriptions" },
      { icon: "cash-outline", label: "Payouts" },
    ],
  },
};

function resolveInitialType(roleParam) {
  if (roleParam === "Delivery partner") return "delivery";
  return "supplier";
}

export default function PartnerLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleParam = params?.role && typeof params.role === "string" ? params.role : null;
  const { login, logout } = useAuth();

  const [partnerType, setPartnerType] = useState(resolveInitialType(roleParam));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const contentScrollRef = useRef(null);
  const [formAnchorY, setFormAnchorY] = useState(0);

  const active = PARTNER_TYPES[partnerType];

  const scrollToForm = () => {
    if (contentScrollRef.current && formAnchorY > 0) {
      contentScrollRef.current.scrollTo({ y: Math.max(0, formAnchorY - 24), animated: true });
    }
  };

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
      const requiredRole = active.dbRole;
      if (loggedInUser?.role !== requiredRole) {
        logout();
        if (requiredRole === "supplier" && loggedInUser?.role === "deliveryPartner") {
          setError("This is a delivery partner account. Switch to Delivery and sign in again.");
        } else if (requiredRole === "supplier") {
          setError("This email isn't registered as a supplier. Check your credentials or switch profile.");
        } else if (requiredRole === "deliveryPartner" && loggedInUser?.role === "supplier") {
          setError("This is a supplier account. Switch to Supplier and sign in again.");
        } else if (requiredRole === "deliveryPartner") {
          setError("This email isn't registered as a delivery partner. Check your credentials.");
        } else {
          setError("Account does not match the selected partner profile.");
        }
        return;
      }
      router.replace(await resolveHomeRoute(loggedInUser));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const canLogin = email.trim().length > 0 && password.trim().length > 0 && termsAccepted;

  return (
    <ModernScreenShell
      title="Partner portal"
      subtitle="Sign in to manage orders, deliveries & earnings"
      icon="briefcase-outline"
      onBack={() => router.replace("/")}
      scrollRef={contentScrollRef}
      headerHeight={200}
    >
      <View style={styles.typeSelector}>
        {Object.values(PARTNER_TYPES).map((type) => {
          const selected = partnerType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={styles.typeTabWrap}
              onPress={() => {
                setPartnerType(type.id);
                setError("");
              }}
              activeOpacity={0.88}
            >
              {selected ? (
                <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.typeTabActive}>
                  <Ionicons name={type.tabIcon} size={18} color="#FFFFFF" />
                  <Text style={styles.typeTabTextActive}>{type.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.typeTab}>
                  <Ionicons name={type.tabIcon} size={18} color={theme.accent} />
                  <Text style={styles.typeTabText}>{type.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.heroCard}>
        <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Ionicons name={active.icon} size={30} color="#FFFFFF" />
            </View>
            <View style={styles.heroText}>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Secure partner access</Text>
              </View>
              <Text style={styles.heroTitle}>{active.headline}</Text>
              <Text style={styles.heroDesc}>{active.desc}</Text>
            </View>
          </View>
          <View style={styles.perkRow}>
            {active.perks.map((perk) => (
              <View key={perk.label} style={styles.perkChip}>
                <Ionicons name={perk.icon} size={14} color="#FFFFFF" />
                <Text style={styles.perkText}>{perk.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      <View style={styles.formCard} onLayout={(e) => setFormAnchorY(e.nativeEvent.layout.y)}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to your {active.label.toLowerCase()} account</Text>
        </View>

        <ModernInput
          label="Email address"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="partner@business.com"
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
              onFocus={scrollToForm}
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

        <ModernPrimaryButton
          label={`Sign in as ${active.label.toLowerCase()}`}
          onPress={handleLogin}
          disabled={!canLogin}
          loading={loading}
          icon="arrow-forward"
        />

        <TouchableOpacity style={styles.forgotLink} onPress={() => router.push("/forgot-password")} activeOpacity={0.8}>
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.altLink}
        onPress={() =>
          router.push({
            pathname: "/login-otp",
            params: { role: active.otpRole },
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="phone-portrait-outline" size={18} color={theme.link} />
        <Text style={styles.altLinkText}>Sign in with OTP instead</Text>
      </TouchableOpacity>

      <View style={styles.signupCard}>
        <View style={styles.signupIcon}>
          <Ionicons name="person-add-outline" size={22} color={theme.accent} />
        </View>
        <View style={styles.signupText}>
          <Text style={styles.signupTitle}>New to H2Online partners?</Text>
          <Text style={styles.signupDesc}>Register as a supplier or delivery partner</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace(active.signupRoute)} activeOpacity={0.85}>
          <Text style={styles.signupAction}>Sign up</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backLink} onPress={() => router.replace("/")} activeOpacity={0.85}>
        <Ionicons name="arrow-back-outline" size={16} color={theme.textMuted} />
        <Text style={styles.backLinkText}>Back to profile selection</Text>
      </TouchableOpacity>
    </ModernScreenShell>
  );
}

const styles = StyleSheet.create({
  typeSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  typeTabWrap: { flex: 1 },
  typeTabActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: theme.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  typeTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(51,175,193,0.28)",
  },
  typeTabTextActive: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  typeTabText: { fontSize: 14, fontWeight: "600", color: theme.accent },
  heroCard: { marginBottom: 18, borderRadius: 24, overflow: "hidden" },
  heroGradient: { padding: 20 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    marginBottom: 8,
  },
  heroBadgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  heroDesc: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },
  perkRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  perkChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  perkText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
  },
  formHeader: { marginBottom: 18 },
  formTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary, letterSpacing: -0.3 },
  formSubtitle: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.primaryLight,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  termsText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 19 },
  termsLink: { color: theme.link, fontWeight: "600" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500", lineHeight: 18 },
  forgotLink: { alignItems: "center", marginTop: 12 },
  forgotLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  altLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    marginBottom: 14,
  },
  altLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  signupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.18)",
    marginBottom: 8,
  },
  signupIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  signupText: { flex: 1 },
  signupTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  signupDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  signupAction: { fontSize: 14, fontWeight: "700", color: theme.link },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  backLinkText: { fontSize: 13, fontWeight: "600", color: theme.textMuted },
});
