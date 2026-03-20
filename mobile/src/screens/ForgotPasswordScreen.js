import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

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

    // Backend reset-password endpoint is not available in the current repo,
    // so we show a safe placeholder flow for now.
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Coming soon", "Password reset is coming soon. Please try again later.");
    }, 700);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={[styles.headerTopRow]}>
            <BackButton onPress={() => router.back()} />
            <Text style={styles.headerTitle}>Reset Password</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentPanel}>
        <Text style={styles.subtitle}>Enter your email to receive reset instructions.</Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Email ID</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!email.trim() || loading) && styles.primaryButtonDisabled]}
          onPress={handleSendReset}
          disabled={!email.trim() || loading}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Send Reset Link</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginLink}
          onPress={() => router.replace("/login")}
          activeOpacity={0.8}
        >
          <Text style={styles.backToLoginText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 110, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: theme.white, marginLeft: 12 },
  contentPanel: { marginTop: -18, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 26, paddingHorizontal: 20 },
  subtitle: { fontSize: 14, color: theme.textMuted, marginBottom: 24 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginBottom: 10 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: theme.textPrimary, padding: 0 },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  primaryButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  primaryButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: theme.white },
  backToLoginLink: { marginTop: 18, alignItems: "center" },
  backToLoginText: { fontSize: 14, fontWeight: "600", color: theme.link },
});

