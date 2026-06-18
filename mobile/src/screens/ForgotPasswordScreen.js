import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ModernScreenShell,
  ModernInput,
  ModernPrimaryButton,
  modern,
} from "@/src/components/modern";
import { theme } from "@/src/theme";

const STEPS = [
  { icon: "mail-outline", title: "Enter email", desc: "Use your registered address" },
  { icon: "paper-plane-outline", title: "Get reset link", desc: "Check inbox & spam folder" },
  { icon: "lock-open-outline", title: "Set new password", desc: "Create a strong password" },
];

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendReset = () => {
    setError("");
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Coming soon", "Password reset is coming soon. Please try again later.");
    }, 700);
  };

  return (
    <ModernScreenShell
      title="Reset password"
      subtitle="We'll help you get back into your account"
      icon="key-outline"
      headerHeight={210}
    >
      <View style={styles.heroCard}>
        <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-half-outline" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Secure account recovery</Text>
            <Text style={styles.heroDesc}>A one-time reset link will be sent to your email. The link expires after 30 minutes.</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.stepsCard}>
        <Text style={styles.stepsLabel}>How it works</Text>
        {STEPS.map((step, index) => (
          <View key={step.title} style={[styles.stepRow, index < STEPS.length - 1 && styles.stepRowBorder]}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={18} color={theme.accent} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.formCardIcon}>
            <Ionicons name="mail-unread-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.formCardTitle}>Recovery email</Text>
            <Text style={styles.formCardSubtitle}>Enter the email linked to your H2Online account</Text>
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
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <ModernPrimaryButton
          label="Send reset link"
          onPress={handleSendReset}
          disabled={!email.trim()}
          loading={loading}
          icon="send-outline"
        />
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
        <Text style={styles.tipText}>
          Can't find the email? Check your spam folder or try signing in with OTP instead.
        </Text>
      </View>

      <TouchableOpacity style={styles.otpLink} onPress={() => router.push("/login-otp")} activeOpacity={0.85}>
        <Ionicons name="phone-portrait-outline" size={18} color={theme.link} />
        <Text style={styles.otpLinkText}>Sign in with OTP instead</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backFooter} onPress={() => router.replace("/login")} activeOpacity={0.85}>
        <Text style={styles.backFooterText}>Remember your password?</Text>
        <Text style={styles.backFooterAction}>Back to sign in →</Text>
      </TouchableOpacity>
    </ModernScreenShell>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  heroCard: { marginBottom: 14 },
  heroGradient: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  heroDesc: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },
  stepsCard: {
    ...modern.card,
    marginBottom: 14,
    paddingVertical: 14,
  },
  stepsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, gap: 10 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(214,234,242,0.95)" },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(51,175,193,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: 11, fontWeight: "800", color: theme.accent },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  stepDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  formCard: {
    ...modern.card,
    marginBottom: 14,
  },
  formCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  formCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formCardTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  formCardSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
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
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.15)",
  },
  tipText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },
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
  backFooter: { alignItems: "center", paddingVertical: 18, marginTop: 4 },
  backFooterText: { fontSize: 13, color: theme.textMuted },
  backFooterAction: { fontSize: 15, fontWeight: "700", color: theme.link, marginTop: 4 },
});
