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
import BackButton from "@/src/components/BackButton";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const VERIFICATION_LABELS = {
  documentLicenseVerified: "ID proof",
  documentIdentityVerified: "Address proof",
  documentVehicleIdentificationVerified: "Other documentation",
};

export default function DeliveryVerificationPendingScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [dp, setDp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.deliveryPartners
      .me()
      .then((data) => {
        if (!cancelled) {
          setDp(data);
          if (data.onboardingStatus === "approved") {
            router.replace("/delivery-dashboard");
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

  const tentativeTime = dp?.tentativeVerificationTime || "24-48 hours";

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
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="document-text-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Verification status</Text>
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
            Our team is verifying your documents. You will get access to the delivery dashboard once all checks are complete.
          </Text>

          <Text style={styles.estimateLabel}>Estimated time</Text>
          <Text style={styles.estimateValue}>{tentativeTime}</Text>

          <Text style={styles.checksLabel}>Verification checks</Text>
          <View style={styles.checksList}>
            {Object.entries(VERIFICATION_LABELS).map(([key, label]) => (
              <View key={key} style={styles.checkRow}>
                <Ionicons
                  name={dp?.[key] ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={dp?.[key] ? "#10B981" : "#9CA3AF"}
                />
                <Text style={[styles.checkText, dp?.[key] && styles.checkTextDone]}>{label}</Text>
                <Text style={styles.checkStatus}>{dp?.[key] ? "Verified" : "Pending"}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setLoading(true);
              api.deliveryPartners.me().then((data) => {
                setDp(data);
                if (data.onboardingStatus === "approved") router.replace("/delivery-dashboard");
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 15, color: theme.textMuted, marginTop: 12 },
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 32 },
  contentPanel: {
    flex: 1,
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", color: theme.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.textMuted, marginBottom: 24 },
  estimateLabel: { fontSize: 14, color: theme.textMuted, marginBottom: 4 },
  estimateValue: { fontSize: 18, fontWeight: "700", color: theme.primary, marginBottom: 24 },
  checksLabel: { fontSize: 16, fontWeight: "600", color: theme.textPrimary, marginBottom: 12 },
  checksList: { marginBottom: 24 },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkText: { flex: 1, fontSize: 15, color: theme.textPrimary, marginLeft: 10 },
  checkTextDone: { color: "#059669" },
  checkStatus: { fontSize: 13, color: theme.textMuted },
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
  logoutButtonText: { fontSize: 15, color: theme.textMuted, fontWeight: "500" },
});
