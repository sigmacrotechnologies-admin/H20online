import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const SupplierOnboardingStatusScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const savedCode = (params?.code || "000000").toString().trim();
  const status = (params?.status || "pending").toString();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleContinue = async () => {
    setError("");
    const entered = code.trim().replace(/\D/g, "").slice(0, 6);
    if (entered.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    const codeRequired = savedCode && savedCode !== "000000";
    if (codeRequired && entered !== savedCode) {
      setError("Invalid code. Use the code shown below.");
      return;
    }
    try {
      const supplierData = await api.suppliers.me();
      if (supplierData?.onboardingStatus === "approved") {
        router.replace("/supplier-dashboard");
      } else {
        router.replace("/supplier-verification-pending");
      }
    } catch {
      router.replace("/supplier-verification-pending");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerTopRow}>
            <BackButton />
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="business-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Onboarding Status</Text>
            <Text style={styles.headerSubtitle}>{status === "approved" ? "Approved" : "Pending"}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentPanel}>
        <Text style={styles.title}>Verification Code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code below to access your supplier dashboard.
        </Text>

        {savedCode && savedCode !== "000000" && (
          <View style={styles.codeDisplay}>
            <Text style={styles.codeLabel}>Your code</Text>
            <Text style={styles.codeValue}>{savedCode}</Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.label}>6-digit code</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Go to Supplier Dashboard →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SupplierOnboardingStatusScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 200, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 24, paddingHorizontal: 36, paddingBottom: 36 },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -14, width: "100%" },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.95)", marginBottom: 32 },
  contentPanel: {
    marginTop: -16,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24 },
  codeDisplay: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  codeLabel: { fontSize: 12, color: "#6B7C85", marginBottom: 4 },
  codeValue: { fontSize: 28, fontWeight: "700", color: theme.primary, letterSpacing: 8 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 20, color: "#1B2B34", padding: 0, letterSpacing: 6 },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  continueButton: {
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    elevation: 3,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
