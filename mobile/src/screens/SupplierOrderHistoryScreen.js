import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function SupplierOrderHistoryScreen() {
  const router = useRouter();
  const [data, setData] = useState({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
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
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Order history</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentPanel}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search customer, address" placeholderTextColor="#9CA3AF" />
        <View style={styles.statusRow}>
          {["", "in_progress", "delivered", "cancelled"].map((s) => (
            <TouchableOpacity key={s || "all"} style={[styles.statusChip, status === s && styles.statusChipSelected]} onPress={() => { setStatus(s); setPage(1); }}>
              <Text style={[styles.statusChipText, status === s && styles.statusChipTextSelected]}>{s || "All"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 14, paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  contentPanel: { marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20, flex: 1 },
  searchInput: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  statusChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", marginRight: 8, marginBottom: 8 },
  statusChipSelected: { backgroundColor: theme.primary },
  statusChipText: { fontSize: 13, color: "#1B2B34" },
  statusChipTextSelected: { color: "#FFF" },
  scroll: { flex: 1 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12 },
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
