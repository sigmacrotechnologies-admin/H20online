import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const VERIFICATION_LABELS = {
  documentIdProofVerified: "ID proof",
  documentAddressProofVerified: "Address proof",
  documentBusinessLicenseVerified: "Business license",
};

const SupplierVerificationPendingScreen = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.suppliers
      .me()
      .then((data) => {
        if (!cancelled) {
          setSupplier(data);
          if (data.onboardingStatus === "approved") {
            router.replace("/supplier-dashboard");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load status");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const tentativeTime = supplier?.tentativeVerificationTime || "24-48 hours";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentPanel}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/login")}>
            <Text style={styles.primaryButtonText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>Verification status</Text>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name="document-text-outline" size={40} color="#FFFFFF" />
            <Text style={styles.statusLabel}>Document verification</Text>
            <Text style={styles.statusValue}>Pending</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentPanel}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your account is under verification</Text>
          <Text style={styles.subtitle}>
            Our team is verifying your documents. You will get access to the supplier dashboard once all checks are complete.
          </Text>

          <Text style={styles.estimateLabel}>Estimated time</Text>
          <Text style={styles.estimateValue}>{tentativeTime}</Text>

          <Text style={styles.checksLabel}>Verification checks</Text>
          <View style={styles.checksList}>
            {Object.entries(VERIFICATION_LABELS).map(([key, label]) => (
              <View key={key} style={styles.checkRow}>
                <Ionicons
                  name={supplier?.[key] ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={supplier?.[key] ? "#10B981" : "#9CA3AF"}
                />
                <Text style={[styles.checkText, supplier?.[key] && styles.checkTextDone]}>{label}</Text>
                <Text style={styles.checkStatus}>{supplier?.[key] ? "Verified" : "Pending"}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setLoading(true);
              api.suppliers.me().then((data) => {
                setSupplier(data);
                if (data.onboardingStatus === "approved") router.replace("/supplier-dashboard");
                setLoading(false);
              }).catch(() => setLoading(false));
            }}
          >
            <Text style={styles.secondaryButtonText}>Refresh status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={() => { logout(); router.replace("/login"); }}>
            <Text style={styles.logoutButtonText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SupplierVerificationPendingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 15, color: "#6B7C85", marginTop: 12 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 180, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20, alignItems: "center" },
  headerOverlay: { width: "100%", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  statusBadge: { marginTop: 16, alignItems: "center" },
  statusLabel: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  statusValue: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  contentPanel: {
    flex: 1,
    marginTop: -20,
    marginLeft: 11,
    marginRight: 11,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24 },
  estimateLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  estimateValue: { fontSize: 18, fontWeight: "700", color: theme.primary, marginBottom: 24 },
  checksLabel: { fontSize: 16, fontWeight: "600", color: "#1B2B34", marginBottom: 12 },
  checksList: { marginBottom: 24 },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkText: { flex: 1, fontSize: 15, color: "#1B2B34", marginLeft: 10 },
  checkTextDone: { color: "#059669" },
  checkStatus: { fontSize: 13, color: "#6B7C85" },
  errorText: { fontSize: 15, color: "#DC2626", marginBottom: 16 },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    elevation: 3,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: { color: theme.primary, fontSize: 16, fontWeight: "600" },
  logoutButton: { alignItems: "center", paddingVertical: 12 },
  logoutButtonText: { fontSize: 15, color: "#6B7C85", fontWeight: "500" },
});
