import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

export default function SupplierWalletScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const mountedRef = useRef(true);
  const lastWalletRef = useRef(null);

  const loadWallet = React.useCallback(async () => {
    try {
      const data = await api.wallet.get();
      const first = Number(data?.balance ?? 0);
      const prev = Number(lastWalletRef.current?.balance ?? 0);
      if (first === 0 && prev > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const retry = await api.wallet.get();
        if (mountedRef.current) {
          setWallet(retry);
          lastWalletRef.current = retry;
        }
        return;
      }
      if (mountedRef.current) {
        setWallet(data);
        lastWalletRef.current = data;
      }
    } catch (_) {
      if (mountedRef.current) setWallet(lastWalletRef.current);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      loadWallet();
      const interval = setInterval(loadWallet, 60 * 1000);
      return () => clearInterval(interval);
    }, [loadWallet])
  );

  const txns = wallet?.transactions || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Wallet</Text>
              <Text style={styles.headerSubtitle}>Supplier balance and transaction history</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
          ) : wallet ? (
            <>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available balance</Text>
                <Text style={styles.balanceValue}>₹{Number(wallet.balance || 0).toLocaleString()}</Text>
              </View>
              <Text style={styles.sectionTitle}>Recent transactions</Text>
              {txns.length === 0 ? (
                <Text style={styles.empty}>No transactions yet.</Text>
              ) : (
                txns.slice().reverse().map((t, idx) => (
                  <View key={`${t.ref || "tx"}-${idx}`} style={styles.txnRow}>
                    <View style={[styles.txnIconWrap, t.type === "credit" ? styles.txnIconCredit : styles.txnIconDebit]}>
                      <Ionicons name={t.type === "credit" ? "arrow-down" : "arrow-up"} size={14} color={t.type === "credit" ? "#065F46" : "#9F1239"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnRef}>{t.ref || "wallet"}</Text>
                      <Text style={styles.txnType}>{t.type || "credit"}</Text>
                    </View>
                    <Text style={[styles.txnAmount, t.type === "credit" ? styles.creditText : styles.debitText]}>
                      {t.type === "credit" ? "+" : "-"}₹{Number(t.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <Text style={styles.empty}>Unable to load wallet</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 28, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: { marginTop: -16, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, flex: 1, overflow: "hidden" },
  content: { flex: 1 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  balanceCard: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", marginBottom: 14 },
  balanceLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 6 },
  balanceValue: { fontSize: 28, fontWeight: "800", color: "#1B2B34" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 10 },
  txnRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", padding: 12, marginBottom: 10 },
  txnIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 10 },
  txnIconCredit: { backgroundColor: "#D1FAE5" },
  txnIconDebit: { backgroundColor: "#FFE4E6" },
  txnRef: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  txnType: { fontSize: 12, color: "#6B7C85", marginTop: 2, textTransform: "capitalize" },
  txnAmount: { fontSize: 14, fontWeight: "700" },
  creditText: { color: "#065F46" },
  debitText: { color: "#9F1239" },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
});
