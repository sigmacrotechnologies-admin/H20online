import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";

export default function DeliveryVerificationPendingScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [dp, setDp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.deliveryPartners.me().then(setDp).catch(() => setDp(null)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /><Text style={styles.loadingText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }
  if (dp?.onboardingStatus === "approved") {
    router.replace("/delivery-dashboard");
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>Verification pending</Text>
            <Text style={styles.headerSub}>Delivery partner onboarding</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentPanel}>
        <Ionicons name="time-outline" size={48} color="#0EA5E9" style={{ alignSelf: "center", marginBottom: 16 }} />
        <Text style={styles.title}>Your account is under verification</Text>
        <Text style={styles.subtitle}>Admin will verify your documents. You’ll get access once approved. Typically 24-48 hours.</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace("/login"); }}>
          <Text style={styles.logoutBtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 15, color: "#6B7C85", marginTop: 12 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 160, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20, alignItems: "center" },
  headerOverlay: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.95)", marginTop: 4 },
  contentPanel: { flex: 1, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2B34", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7C85", marginBottom: 24 },
  logoutBtn: { alignSelf: "center", paddingVertical: 12 },
  logoutBtnText: { fontSize: 15, color: "#1EA7FD", fontWeight: "600" },
});
