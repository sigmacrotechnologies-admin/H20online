import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  FilterChip,
  GradientButton,
  EmptyState,
  SupplierPageHeader,
  ui,
} from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function statusMeta(status) {
  if (status === "cancelled") {
    return { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.12)", icon: "close-circle-outline" };
  }
  if (status === "in_progress") {
    return { label: "In progress", color: theme.accent, bg: "rgba(30,143,177,0.12)", icon: "bicycle-outline" };
  }
  if (status === "delivered") {
    return { label: "Delivered", color: "#059669", bg: "rgba(5,150,105,0.12)", icon: "checkmark-circle-outline" };
  }
  return { label: status || "Unknown", color: theme.textMuted, bg: "rgba(107,124,133,0.12)", icon: "help-circle-outline" };
}

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

  const totalPages = Math.ceil(data.total / 20) || 1;
  const deliveredOnPage = data.orders.filter((o) => o.status === "delivered").length;
  const activeOnPage = data.orders.filter((o) => o.status === "in_progress").length;

  const renderOrderCard = (o) => {
    const meta = statusMeta(o.status);
    const date = o.createdAt ? new Date(o.createdAt) : null;
    const itemCount = (o.myItems || o.items || []).length;

    return (
      <View key={o.id} style={styles.orderCard}>
        <View style={styles.orderCardTop}>
          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.orderIcon}>
            <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.orderMain}>
            <Text style={styles.orderId}>#{o.id.slice(-6)}</Text>
            <Text style={styles.orderCustomer} numberOfLines={1}>
              {o.customerName || o.customerEmail || "Customer"}
            </Text>
            {date ? (
              <Text style={styles.orderDate}>
                {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.orderCardBottom}>
          <View style={styles.orderMetaItem}>
            <Ionicons name="cube-outline" size={14} color={theme.textMuted} />
            <Text style={styles.orderMetaText}>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text style={styles.orderTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="time-outline"
          title="Order history"
          subtitle="Track completed, active and cancelled orders"
          stats={[
            { icon: "layers-outline", label: "Total", value: String(data.total || 0) },
            { icon: "checkmark-circle-outline", label: "Delivered", value: String(deliveredOnPage) },
            { icon: "bicycle-outline", label: "Active", value: String(activeOnPage) },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard icon="search-outline" title="Search orders" subtitle="Find by customer or address">
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, address"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </SectionCard>

        <SectionCard icon="funnel-outline" title="Filter by status" subtitle="Browse orders by delivery state">
          <View style={ui.filterRow}>
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value || "all"}
                label={opt.label}
                selected={status === opt.value}
                onPress={() => {
                  setStatus(opt.value);
                  setPage(1);
                }}
              />
            ))}
          </View>
        </SectionCard>

        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : data.orders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No orders found"
            subtitle={search.trim() || status ? "Try adjusting your search or filter." : "Your order history will appear here."}
          />
        ) : (
          <>
            <View style={styles.listHeadingRow}>
              <Text style={styles.listHeading}>
                {STATUS_OPTIONS.find((s) => s.value === status)?.label || "All"} orders
              </Text>
              <Text style={styles.listCount}>{data.orders.length} shown</Text>
            </View>
            {data.orders.map(renderOrderCard)}
          </>
        )}

        {data.total > 20 ? (
          <View style={styles.pagination}>
            <GradientButton
              label="Previous"
              variant="outline"
              icon="chevron-back"
              onPress={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              style={{ flex: 1 }}
            />
            <Text style={styles.pageInfo}>
              Page {page} of {totalPages}
            </Text>
            <GradientButton
              label="Next"
              variant="outline"
              icon="chevron-forward"
              onPress={() => setPage((p) => p + 1)}
              disabled={page * 20 >= data.total}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 4 : 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.textPrimary, paddingVertical: 8 },
  loader: { marginTop: 32 },
  listHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listHeading: { fontSize: 17, fontWeight: "700", color: theme.textPrimary },
  listCount: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  orderCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  orderMain: { flex: 1, minWidth: 0 },
  orderId: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
  orderCustomer: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 2 },
  orderDate: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.8)",
    gap: 12,
  },
  orderMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderMetaText: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
  orderTotal: { marginLeft: "auto", fontSize: 17, fontWeight: "800", color: theme.accent },
  pagination: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 8 },
  pageInfo: { fontSize: 13, fontWeight: "600", color: theme.textSecondary, minWidth: 90, textAlign: "center" },
});
