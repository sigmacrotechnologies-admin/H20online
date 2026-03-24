import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, ActivityIndicator, Image, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function SupplierOrderHistoryScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [data, setData] = useState({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "in_progress", label: "In Progress" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || "All";
  const load = () => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (status) params.status = status;
    if (search.trim()) params.search = search.trim();
    api.supplier.ordersHistory(params).then(setData).catch(() => setData({ orders: [], total: 0 })).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [page, status]);
  useEffect(() => { const t = setTimeout(() => { if (search !== undefined) load(); }, 400); return () => clearTimeout(t); }, [search]);

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
              <Ionicons name="time-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Order history</Text>
              <Text style={styles.headerSubtitle}>Track completed, active and cancelled orders</Text>
            </View>
          </View>
          <View style={styles.headerControls}>
            <TextInput
              style={styles.headerSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, address"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.dropdownWrap}>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowStatusDropdown((v) => !v)} activeOpacity={0.85}>
                <Text style={styles.dropdownBtnText}>{statusLabel}</Text>
                <Ionicons name={showStatusDropdown ? "chevron-up" : "chevron-down"} size={18} color="#1B2B34" />
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={styles.dropdownMenu}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value || "all"}
                      style={[styles.dropdownItem, status === opt.value && styles.dropdownItemSelected]}
                      onPress={() => {
                        setStatus(opt.value);
                        setPage(1);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, status === opt.value && styles.dropdownItemTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} /> : (
          data.orders.length === 0 ? <Text style={styles.empty}>No orders</Text> : (
            data.orders.map((o) => (
              <View key={o.id} style={styles.card}>
                <Text style={styles.cardId}>#{o.id.slice(-6)}</Text>
                <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail}</Text>
                <Text style={styles.cardTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
                <Text style={styles.cardStatus}>{o.status}</Text>
                <Text style={styles.cardDate}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}</Text>
              </View>
            ))
          )
        )}
        {data.total > 20 && (
          <View style={styles.pagination}>
            <TouchableOpacity style={styles.pageBtn} disabled={page <= 1} onPress={() => setPage((p) => p - 1)}><Text style={styles.pageBtnText}>Prev</Text></TouchableOpacity>
            <Text style={styles.pageInfo}>Page {page}</Text>
            <TouchableOpacity style={styles.pageBtn} disabled={page * 20 >= data.total} onPress={() => setPage((p) => p + 1)}><Text style={styles.pageBtnText}>Next</Text></TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 304, overflow: "visible", zIndex: 2 },
  gradientBackground: { flex: 1, paddingBottom: 28, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  headerControls: { marginTop: 14, marginBottom: 8, zIndex: 20 },
  headerSearchInput: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 10 : 12,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    elevation: 0,
    color: "#1B2B34",
  },
  dropdownWrap: { zIndex: 50 },
  dropdownBtn: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownBtnText: { fontSize: 14, color: "#1B2B34", fontWeight: "600" },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(225,235,242,1)",
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#FFFFFF" },
  dropdownItemSelected: { backgroundColor: theme.selectedTint },
  dropdownItemText: { fontSize: 14, color: "#1B2B34" },
  dropdownItemTextSelected: { color: theme.primary, fontWeight: "700" },
  contentSection: {
    marginTop: -8,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
    flex: 1,
    overflow: "hidden",
    zIndex: 6,
    elevation: 6,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 24 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  cardId: { fontSize: 12, color: "#6B7C85" },
  cardCustomer: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginTop: 4 },
  cardTotal: { fontSize: 15, color: theme.primary, marginTop: 4 },
  cardStatus: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  cardDate: { fontSize: 12, color: "#6B7C85", marginTop: 2 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginVertical: 20 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.primary, borderRadius: 8 },
  pageBtnText: { color: "#FFF", fontWeight: "600" },
  pageInfo: { color: "#1B2B34" },
});
