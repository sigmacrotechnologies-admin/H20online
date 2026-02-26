import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";

const OTP_LENGTH = 6;

const LoginOTPScreen = () => {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = () => {
    setError("");
    const trimmed = phone.trim().replace(/\D/g, "");
    if (trimmed.length < 10) {
      setError("Please enter a valid phone number");
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
      setError(`Please enter ${OTP_LENGTH}-digit OTP`);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/dashboard");
    }, 600);
  };

  const canSendOtp = phone.trim().replace(/\D/g, "").length >= 10;
  const canVerify = otp.length === OTP_LENGTH;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={["#7DD3FC", "#38BDF8", "#0EA5E9", "#06B6D4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerOverlay}>
            <BackButton onPress={() => router.back()} />
            <Text style={styles.headerTitle}>Sign in with OTP</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentPanel}>
        {!otpSent ? (
          <>
            <Text style={styles.subtitle}>Enter your phone number to receive a one-time password.</Text>
            <View style={styles.inputSection}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryButton, (!canSendOtp || loading) && styles.primaryButtonDisabled]}
              onPress={handleSendOTP}
              disabled={!canSendOtp || loading}
              activeOpacity={0.9}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the {OTP_LENGTH}-digit code sent to {phone.trim()}</Text>
            <View style={styles.inputSection}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  placeholder="Enter OTP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                />
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryButton, (!canVerify || loading) && styles.primaryButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={!canVerify || loading}
              activeOpacity={0.9}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Verify & Log in</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendLink} onPress={() => { setOtpSent(false); setOtp(""); setError(""); }} activeOpacity={0.8}>
              <Text style={styles.resendLinkText}>Change number / Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default LoginOTPScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 100, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerOverlay: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginLeft: 12 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  otpInput: { flex: 1, fontSize: 20, fontWeight: "700", color: "#1B2B34", padding: 0, letterSpacing: 4 },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  primaryButton: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  primaryButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  resendLink: { marginTop: 20, alignItems: "center" },
  resendLinkText: { fontSize: 14, fontWeight: "600", color: "#1EA7FD" },
});
