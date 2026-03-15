import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

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

const LoginScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleFromParams = (params?.role && typeof params.role === "string") ? params.role : null;
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialRole =
    (roleFromParams && LOGIN_ROLES.find((r) => r.title === roleFromParams)) || LOGIN_ROLES[0];
  const [selectedRole, setSelectedRole] = useState(initialRole);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={["#7DD3FC", "#38BDF8", "#0EA5E9", "#06B6D4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="log-in-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Sign in with Email</Text>
          </View>
        </LinearGradient>
      </View>

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
                    color={isSelected ? "#0EA5E9" : "#6B7C85"}
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

        <View style={styles.inputSection}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
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
          onPress={() => router.replace(selectedRole.title === "Supplier" ? "/supplier-onboarding" : "/create-profile")}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpLinkText}>{"Don't have an account? Sign up"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 168, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 36, paddingHorizontal: 20, paddingBottom: 16 },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -50 },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom:20 },
  contentPanel: { marginTop: -20, marginLeft: 2, marginRight: 2, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  roleLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
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
    backgroundColor: "#E0F2FE",
    borderColor: "#8ED1FC",
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
    backgroundColor: "#BAE6FD",
  },
  roleTileText: { fontSize: 11, fontWeight: "600", color: "#6B7C85", textAlign: "center" },
  roleTileTextSelected: { color: "#0EA5E9" },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24, marginTop: 4 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", elevation: 3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#8ED1FC", marginRight: 12, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#1EA7FD", borderColor: "#1EA7FD" },
  termsText: { flex: 1, fontSize: 14, color: "#6B7C85" },
  termsLink: { color: "#1EA7FD", fontWeight: "600" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  loginButton: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  loginButtonDisabled: { backgroundColor: "#EEF3F7", elevation: 1 },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  loginButtonTextDisabled: { fontSize: 16, fontWeight: "600", color: "#8A9AA3" },
  socialSection: { marginTop: 24, marginBottom: 20 },
  socialLabel: { fontSize: 13, color: "#6B7C85", textAlign: "center", marginBottom: 12 },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.85)", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", elevation: 2 },
  socialButtonText: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  signUpLink: { alignItems: "center", paddingVertical: 12 },
  signUpLinkText: { fontSize: 14, fontWeight: "600", color: "#1EA7FD" },
});
