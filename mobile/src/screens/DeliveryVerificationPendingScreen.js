import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import {
  ModernScreenShell,
  ModernPrimaryButton,
  ModernOutlineButton,
  modern,
} from "@/src/components/modern";
import { SectionCard } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

const VERIFICATION_LABELS = {
  documentLicenseVerified: "ID proof",
  documentIdentityVerified: "Address proof",
  documentVehicleIdentificationVerified: "Vehicle documentation",
};

export default function DeliveryVerificationPendingScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [dp, setDp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const verifiedCount = Object.keys(VERIFICATION_LABELS).filter((key) => dp?.[key]).length;
  const totalChecks = Object.keys(VERIFICATION_LABELS).length;

  const refreshStatus = () => {
    setRefreshing(true);
    api.deliveryPartners
      .me()
      .then((data) => {
        setDp(data);
        if (data.onboardingStatus === "approved") router.replace("/delivery-dashboard");
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <ModernScreenShell title="Verification" subtitle="Checking your partner account" icon="shield-checkmark-outline" onBack={() => router.replace("/login")}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </ModernScreenShell>
    );
  }

  if (error) {
    return (
      <ModernScreenShell title="Verification" subtitle="Partner account status" icon="alert-circle-outline" onBack={() => router.replace("/login")}>
        <View style={modern.card}>
          <Text style={styles.errorText}>{error}</Text>
          <ModernPrimaryButton label="Back to login" onPress={() => router.replace("/login")} icon="log-in-outline" />
        </View>
      </ModernScreenShell>
    );
  }

  return (
    <ModernScreenShell
      title="Partner verification"
      subtitle="We're reviewing your delivery partner application"
      icon="document-text-outline"
      onBack={() => router.replace("/login")}
      headerHeight={210}
    >
      <View style={styles.statusHero}>
        <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statusHeroGradient}>
          <View style={styles.statusHeroIcon}>
            <Ionicons name="hourglass-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.statusHeroText}>
            <Text style={styles.statusHeroLabel}>Account status</Text>
            <Text style={styles.statusHeroTitle}>Under review</Text>
            <Text style={styles.statusHeroDesc}>Estimated completion: {tentativeTime}</Text>
          </View>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>{verifiedCount}/{totalChecks}</Text>
          </View>
        </LinearGradient>
      </View>

      <SectionCard icon="checkmark-done-outline" title="Verification checks" subtitle="We'll notify you when each step is complete">
        <View style={styles.checksList}>
          {Object.entries(VERIFICATION_LABELS).map(([key, label]) => {
            const done = dp?.[key];
            return (
              <View key={key} style={[styles.checkRow, done && styles.checkRowDone]}>
                <View style={[styles.checkIcon, done && styles.checkIconDone]}>
                  <Ionicons name={done ? "checkmark" : "ellipse-outline"} size={18} color={done ? "#FFFFFF" : theme.textMuted} />
                </View>
                <View style={styles.checkTextWrap}>
                  <Text style={[styles.checkText, done && styles.checkTextDone]}>{label}</Text>
                  <Text style={styles.checkStatus}>{done ? "Verified" : "Pending review"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <Text style={styles.infoText}>
        Our team is verifying your documents. You'll get full access to the delivery dashboard once all checks are complete.
      </Text>

      <ModernOutlineButton label={refreshing ? "Refreshing..." : "Refresh status"} onPress={refreshStatus} disabled={refreshing} icon="refresh-outline" />
      <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace("/login"); }} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ModernScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  loadingText: { fontSize: 15, color: theme.textMuted, marginTop: 12 },
  errorText: { fontSize: 15, color: "#DC2626", marginBottom: 16, lineHeight: 22 },
  statusHero: { marginBottom: 16, borderRadius: 22, overflow: "hidden" },
  statusHeroGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 0 },
    }),
  },
  statusHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusHeroText: { flex: 1 },
  statusHeroLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.88)", textTransform: "uppercase", letterSpacing: 0.5 },
  statusHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  statusHeroDesc: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  progressPillText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  checksList: { gap: 8 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.contentPanelBackground,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  checkRowDone: { backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(107,124,133,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkIconDone: { backgroundColor: "#10B981" },
  checkTextWrap: { flex: 1 },
  checkText: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
  checkTextDone: { color: "#059669" },
  checkStatus: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  infoText: { fontSize: 14, color: theme.textMuted, lineHeight: 20, marginBottom: 16, marginTop: 4 },
  logoutBtn: { alignItems: "center", paddingVertical: 16 },
  logoutText: { fontSize: 15, color: theme.textMuted, fontWeight: "600" },
});
