import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton, { backButtonContainerStyle } from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const STATIC_VALIDATION_CODE = "CORP2024";

const CorporateValidationScreen = () => {
  const router = useRouter();
  const [validationCode, setValidationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isValid = validationCode.trim().toUpperCase() === STATIC_VALIDATION_CODE;

  const handleContinue = () => {
    if (!isValid) {
      setError("Invalid validation code. Use CORP2024 for demo.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/corporate-dashboard");
    }, 500);
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
          <View style={[styles.headerOverlay, backButtonContainerStyle]}>
            <BackButton onPress={() => router.back()} />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentPanel}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={56} color={theme.primary} />
        </View>
        <Text style={styles.title}>Account Validation</Text>
        <Text style={styles.subtitle}>
          Enter the validation code provided by your company to access the Corporate Hub.
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Validation Code</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={validationCode}
              onChangeText={(t) => {
                setValidationCode(t);
                setError("");
              }}
              placeholder="Enter code (e.g. CORP2024)"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.statusRow}>
          <Ionicons name={isValid ? "checkmark-circle" : "time-outline"} size={22} color={isValid ? "#14B8A6" : "#6B7C85"} />
          <Text style={[styles.statusText, isValid && styles.statusTextValid]}>
            {isValid ? "Validation enabled" : "Validation pending"}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.continueButton, (!isValid || loading) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={isValid && !loading ? 0.9 : 1}
          disabled={!isValid || loading}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={isValid && !loading ? styles.buttonText : styles.buttonTextDisabled}>
                Continue to Corporate Dashboard →
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CorporateValidationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 100, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 14, paddingHorizontal: 20 },
  headerOverlay: { flexDirection: "row", alignItems: "center" },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 32, paddingHorizontal: 20 },
  iconWrap: { alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", color: "#1B2B34", marginBottom: 8 },
  subtitle: { textAlign: "center", color: "#6B7C85", marginBottom: 24, fontSize: 14 },
  inputSection: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  statusText: { fontSize: 14, color: "#6B7C85", fontWeight: "500" },
  statusTextValid: { color: "#14B8A6" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  continueButton: { marginTop: 12, marginBottom: 24, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  continueButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  buttonTextDisabled: { color: "#8A9AA3", fontSize: 16, fontWeight: "600" },
});
