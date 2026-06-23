import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function PasswordField({ label, value, onChangeText, placeholder, show, onToggleShow }) {
  return (
    <View style={modern.inputSection}>
      <Text style={modern.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <Ionicons name="lock-closed-outline" size={20} color="#6B7C85" style={modern.inputIcon} />
        <TextInput
          style={styles.passwordInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggleShow} activeOpacity={0.7}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SocietyOnboardingScreen() {
  const router = useRouter();
  const { registerSociety } = useAuth();
  const [societyName, setSocietyName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const missingFields = () => {
    const missing = [];
    if (!societyName.trim()) missing.push("Society name");
    if (!registrationNo.trim()) missing.push("Registration no.");
    if (!pocName.trim()) missing.push("POC name");
    if (!pocEmail.trim()) missing.push("POC email");
    if (!pocPhone.trim()) missing.push("POC mobile");
    if (!password) missing.push("Password");
    if (!confirmPassword) missing.push("Confirm password");
    return missing;
  };

  const handleSubmit = async () => {
    setError("");
    setHint("");
    const missing = missingFields();
    if (missing.length) {
      setHint(`Complete: ${missing.join(", ")}`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const user = await registerSociety({
        societyName: societyName.trim(),
        registrationNo: registrationNo.trim(),
        gstNumber: gstNumber.trim(),
        pocName: pocName.trim(),
        pocEmail: pocEmail.trim(),
        pocPhone: pocPhone.trim(),
        address: address.trim(),
        city: city.trim(),
        password,
      });
      router.replace(await resolveHomeRoute(user));
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernScreenShell
      title="Society registration"
      subtitle="Register your residential society for tanker orders"
      onBack={() => router.back()}
      icon="home-outline"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hint ? (
          <View style={styles.hintBanner}>
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <SectionCard icon="business-outline" title="Society details" subtitle="Official registration info">
          <ModernInput label="Society name *" value={societyName} onChangeText={setSocietyName} placeholder="e.g. Green Valley Residency" />
          <ModernInput label="Registration no. *" value={registrationNo} onChangeText={setRegistrationNo} placeholder="Society registration number" />
          <ModernInput label="GST (if any)" value={gstNumber} onChangeText={setGstNumber} placeholder="Optional GST number" autoCapitalize="characters" />
        </SectionCard>

        <SectionCard icon="person-outline" title="Point of contact" subtitle="Society POC for orders">
          <ModernInput label="POC name *" value={pocName} onChangeText={setPocName} placeholder="Contact person name" />
          <ModernInput label="POC mobile *" value={pocPhone} onChangeText={setPocPhone} placeholder="10-digit mobile" keyboardType="phone-pad" />
          <ModernInput label="POC email *" value={pocEmail} onChangeText={setPocEmail} placeholder="Email for login" autoCapitalize="none" keyboardType="email-address" />
        </SectionCard>

        <SectionCard icon="location-outline" title="Location" subtitle="Delivery address for tankers">
          <ModernInput label="Address" value={address} onChangeText={setAddress} placeholder="Society address" />
          <ModernInput label="City" value={city} onChangeText={setCity} placeholder="City" />
        </SectionCard>

        <SectionCard icon="lock-closed-outline" title="Account security" subtitle="Login credentials">
          <PasswordField
            label="Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            show={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
          />
          <PasswordField
            label="Confirm password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            show={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </SectionCard>

        <ModernPrimaryButton label="Create society account" onPress={handleSubmit} loading={loading} />
        <TouchableOpacity style={styles.loginLink} onPress={() => router.push({ pathname: "/login", params: { role: "Society" } })}>
          <Text style={styles.loginLinkText}>Already registered? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </ModernScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Platform.OS === "ios" ? 32 : 24 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8EDF2",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.text },
  sectionSubtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.text },
  eyeBtn: { padding: 8 },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 13, color: theme.primary },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  loginLink: { alignItems: "center", marginTop: 16, paddingVertical: 8 },
  loginLinkText: { color: theme.primary, fontWeight: "600", fontSize: 15 },
});
