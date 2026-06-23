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
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ModernScreenShell,
  ModernInput,
  ModernPrimaryButton,
  modern,
} from "@/src/components/modern";
import { theme } from "@/src/theme";

const OTP_LENGTH = 6;

const ROLE_CONFIG = {
  Customer: { icon: "person-outline", label: "Customer", desc: "Order & track water deliveries" },
  Supplier: { icon: "storefront-outline", label: "Supplier", desc: "Manage inventory & orders" },
  Partner: { icon: "bicycle-outline", label: "Delivery partner", desc: "Deliver orders on the go" },
};

function OtpBoxes({ value, onChange }) {
  const inputsRef = useRef([]);
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  const updateDigit = (index, char) => {
    const cleaned = char.replace(/\D/g, "");
    const next = value.split("");
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, OTP_LENGTH);
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputsRef.current[focusIndex]?.focus();
      return;
    }
    next[index] = cleaned;
    const joined = next.join("").replace(/\s/g, "").slice(0, OTP_LENGTH);
    onChange(joined);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.otpRow}>
      {digits.map((digit, index) => {
        const filled = Boolean(digit?.trim());
        return (
          <View key={index} style={[styles.otpBox, filled && styles.otpBoxFilled]}>
            <TextInput
              ref={(ref) => {
                inputsRef.current[index] = ref;
              }}
              style={styles.otpBoxInput}
              value={filled ? digit : ""}
              onChangeText={(t) => updateDigit(index, t)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              textAlign="center"
            />
          </View>
        );
      })}
    </View>
  );
}

const LoginOTPScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleFromParams = params?.role && typeof params.role === "string" ? params.role : "Customer";
  const roleInfo = ROLE_CONFIG[roleFromParams] || ROLE_CONFIG.Customer;

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = () => {
    setError("");
    const trimmed = phone.trim().replace(/\D/g, "");
    if (trimmed.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setError("");
    }, 800);
  };

  const handleVerifyOTP = () => {
    setError("");
    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (roleFromParams === "Supplier") {
        router.replace("/supplier-verification-pending");
      } else {
        router.replace("/dashboard");
      }
    }, 600);
  };

  const maskedPhone = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return phone.trim();
    return `+91 ${digits.slice(0, 2)}****${digits.slice(-4)}`;
  };

  const canSendOtp = phone.trim().replace(/\D/g, "").length >= 10;
  const canVerify = otp.length === OTP_LENGTH;
  const currentStep = otpSent ? 2 : 1;

  return (
    <ModernScreenShell
      title="Sign in with OTP"
      subtitle={otpSent ? `Code sent to ${maskedPhone()}` : "Quick & secure phone verification"}
      icon="phone-portrait-outline"
      headerHeight={210}
    >
      <View style={styles.roleBanner}>
        <LinearGradient
          colors={[theme.medium, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.roleBannerGradient}
        >
          <View style={styles.roleBannerIcon}>
            <Ionicons name={roleInfo.icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.roleBannerText}>
            <Text style={styles.roleBannerLabel}>Signing in as</Text>
            <Text style={styles.roleBannerValue}>{roleInfo.label}</Text>
            <Text style={styles.roleBannerDesc}>{roleInfo.desc}</Text>
          </View>
          <Ionicons name="shield-checkmark" size={22} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentStep >= 1 && styles.progressDotActive]}>
            <Text style={[styles.progressDotText, currentStep >= 1 && styles.progressDotTextActive]}>1</Text>
          </View>
          <Text style={[styles.progressLabel, currentStep >= 1 && styles.progressLabelActive]}>Phone</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentStep >= 2 && styles.progressDotActive]}>
            <Text style={[styles.progressDotText, currentStep >= 2 && styles.progressDotTextActive]}>2</Text>
          </View>
          <Text style={[styles.progressLabel, currentStep >= 2 && styles.progressLabelActive]}>Verify</Text>
        </View>
      </View>

      {!otpSent ? (
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.formCardIcon}>
              <Ionicons name="call-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={styles.formCardTitle}>Mobile number</Text>
              <Text style={styles.formCardSubtitle}>We'll send a one-time password via SMS</Text>
            </View>
          </View>

          <ModernInput
            label="Phone number"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
          />

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed-outline" size={16} color={theme.accent} />
            <Text style={styles.secureNoteText}>Your number is only used for verification and is never shared.</Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <ModernPrimaryButton label="Send OTP" onPress={handleSendOTP} disabled={!canSendOtp} loading={loading} icon="send-outline" />
        </View>
      ) : (
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.formCardIcon}>
              <Ionicons name="keypad-outline" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={styles.formCardTitle}>Enter verification code</Text>
              <Text style={styles.formCardSubtitle}>Type the {OTP_LENGTH}-digit OTP sent to {maskedPhone()}</Text>
            </View>
          </View>

          <Text style={styles.otpLabel}>One-time password</Text>
          <OtpBoxes value={otp} onChange={setOtp} />

          <View style={styles.resendRow}>
            <Text style={styles.resendHint}>Didn't receive it?</Text>
            <TouchableOpacity
              onPress={() => {
                setOtp("");
                setError("");
                handleSendOTP();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resendAction}>Resend OTP</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <ModernPrimaryButton
            label="Verify & continue"
            onPress={handleVerifyOTP}
            disabled={!canVerify}
            loading={loading}
            icon="shield-checkmark-outline"
          />

          <TouchableOpacity
            style={styles.changeNumberBtn}
            onPress={() => {
              setOtpSent(false);
              setOtp("");
              setError("");
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.link} />
            <Text style={styles.changeNumberText}>Use a different number</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.passwordLink} onPress={() => router.replace("/login")} activeOpacity={0.85}>
        <Ionicons name="mail-outline" size={18} color={theme.link} />
        <Text style={styles.passwordLinkText}>Sign in with email & password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backFooter} onPress={() => router.replace("/")} activeOpacity={0.85}>
        <Text style={styles.backFooterText}>New to H2Online?</Text>
        <Text style={styles.backFooterAction}>Choose your profile →</Text>
      </TouchableOpacity>
    </ModernScreenShell>
  );
};

export default LoginOTPScreen;

const styles = StyleSheet.create({
  roleBanner: { marginBottom: 14, borderRadius: 22, overflow: "hidden" },
  roleBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  roleBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBannerText: { flex: 1 },
  roleBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.88)", textTransform: "uppercase", letterSpacing: 0.4 },
  roleBannerValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  roleBannerDesc: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3 },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  progressStep: { alignItems: "center", gap: 6 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: { backgroundColor: theme.accent },
  progressDotText: { fontSize: 12, fontWeight: "800", color: theme.accent },
  progressDotTextActive: { color: "#FFFFFF" },
  progressLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted },
  progressLabelActive: { color: theme.textPrimary },
  progressLine: { flex: 1, height: 2, backgroundColor: "rgba(214,234,242,0.95)", marginHorizontal: 12, marginBottom: 18 },
  progressLineActive: { backgroundColor: theme.accent },
  formCard: {
    ...modern.card,
    marginBottom: 14,
  },
  formCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  formCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formCardTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  formCardSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    marginTop: -4,
  },
  secureNoteText: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  otpLabel: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginBottom: 12 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 14 },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 0 },
    }),
  },
  otpBoxFilled: { borderColor: theme.accent, backgroundColor: "rgba(51,175,193,0.06)" },
  otpBoxInput: {
    width: "100%",
    height: "100%",
    fontSize: 22,
    fontWeight: "800",
    color: theme.textPrimary,
    textAlign: "center",
    padding: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 },
  resendHint: { fontSize: 13, color: theme.textMuted },
  resendAction: { fontSize: 13, fontWeight: "700", color: theme.link },
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
  changeNumberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
  },
  changeNumberText: { fontSize: 13, fontWeight: "600", color: theme.link },
  passwordLink: {
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
  passwordLinkText: { fontSize: 14, fontWeight: "600", color: theme.link },
  backFooter: { alignItems: "center", paddingVertical: 18, marginTop: 4 },
  backFooterText: { fontSize: 13, color: theme.textMuted },
  backFooterAction: { fontSize: 15, fontWeight: "700", color: theme.link, marginTop: 4 },
});
