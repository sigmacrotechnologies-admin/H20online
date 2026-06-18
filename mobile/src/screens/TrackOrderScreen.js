import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppLogo from "@/src/components/AppLogo";
import BackButton from "@/src/components/BackButton";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { useCart } from "@/src/context/CartContext";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { api } from "@/src/api/client";
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

function DetailRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={theme.accent} />
      <View style={styles.detailTextWrap}>
        {label ? <Text style={styles.detailLabel}>{label}</Text> : null}
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const statusLabel = (order) => {
  if (!order) return "—";
  if (order.status === "cancelled") return "Cancelled";
  if (order.status === "delivered") return "Delivered";
  const accepted = (order.supplierResponses || []).find((r) => r.status === "accepted");
  const stage = accepted?.deliveryStage || (accepted ? "accepted" : null);
  if (stage === "delivered") return "Delivered";
  if (stage === "picked_up") return "Picked up";
  if (accepted) {
    if (stage === "accepted" && accepted.deliveryPartnerName) return "Partner assigned";
    return "Accepted";
  }
  return "Waiting for supplier";
};

export default function TrackOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialOrderId = params?.orderId ? String(params.orderId) : null;

  const { orders } = useCart();
  const [order, setOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || null);
  const [loading, setLoading] = useState(true);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const resolveOrderMongoId = (candidate) => {
    if (candidate == null) return null;
    const c = String(candidate);
    const found = (orders || []).find((o) => {
      const mongoId = o?.id ?? o?._id;
      return mongoId === c || o?.orderId === c || String(o?._id) === c;
    });
    return found ? String(found.id ?? found._id ?? found.orderId ?? c) : c;
  };

  const singleOrderMode = !!initialOrderId;
  const inProgressOrders = (orders || []).filter(
    (o) => o.status !== "cancelled" && o.status !== "delivered"
  );
  const recentOrders = inProgressOrders.length > 0 ? inProgressOrders : (orders || []).slice(0, 10);

  useEffect(() => {
    if (singleOrderMode && initialOrderId) {
      setSelectedOrderId(resolveOrderMongoId(initialOrderId));
    } else if (!singleOrderMode && recentOrders.length > 0 && !selectedOrderId) {
      const id = recentOrders[0]?.id ?? recentOrders[0]?._id ?? getOrderId(recentOrders[0]);
      if (id) setSelectedOrderId(id);
    }
  }, [singleOrderMode, initialOrderId, recentOrders.length, selectedOrderId, orders]);

  useEffect(() => {
    const id = initialOrderId || selectedOrderId;
    if (!id) {
      setLoading(false);
      setOrder(null);
      return;
    }
    setLoading(true);
    api.orders
      .get(id)
      .then((data) => setOrder(data || null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [selectedOrderId, initialOrderId]);

  useEffect(() => {
    const id = initialOrderId || selectedOrderId;
    if (!id) return;
    const interval = setInterval(() => {
      api.orders.get(id).then(setOrder).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedOrderId, initialOrderId]);

  const selectedOrderFromList = selectedOrderId
    ? (recentOrders || []).find((o) => String(o?.id ?? o?._id) === String(selectedOrderId)) || null
    : null;

  const displayOrder = order || selectedOrderFromList;

  const accepted = (displayOrder?.supplierResponses || []).find((r) => r.status === "accepted");
  const stage = accepted?.deliveryStage || (accepted ? "accepted" : null);
  const riderName = accepted?.deliveryPartnerName;
  const riderPhone = accepted?.deliveryPartnerPhone;
  const eta = accepted?.eta;
  const isDelivered = displayOrder?.status === "delivered" || stage === "delivered";

  const supplier = displayOrder?.supplier || null;
  const supplierPhone = supplier?.phone || null;
  const supplierRating = typeof supplier?.rating === "number" && supplier.rating > 0 ? supplier.rating : null;

  const pickupStepLabel =
    stage === "picked_up" || stage === "delivered"
      ? `Picked up by ${riderName || "delivery partner"}`
      : accepted && riderName
        ? `Partner assigned: ${riderName}`
        : accepted
          ? "Waiting for delivery partner"
          : "Waiting for delivery partner";

  const steps = [
    { key: "placed", label: "Order placed", icon: "cart-outline", done: true },
    {
      key: "accepted",
      label: accepted ? "Accepted by supplier" : "Waiting for supplier",
      icon: "checkmark-circle-outline",
      done: !!accepted,
    },
    {
      key: "picked_up",
      label: pickupStepLabel,
      icon: "cube-outline",
      done: stage === "picked_up" || stage === "delivered",
    },
    { key: "delivered", label: "Delivery completed", icon: "flag-outline", done: isDelivered },
  ];

  const progressPct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const productLabel =
    displayOrder?.productLabel ||
    displayOrder?.items?.[0]?.productName ||
    "Water delivery";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <DropletOverlay />
            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.85} onPress={() => router.push("/profile")}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Track order</Text>
            <Text style={styles.headerSubtitle}>Live status and delivery timeline</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {recentOrders.length === 0 && !singleOrderMode ? (
              <View style={styles.emptyState}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.emptyIcon}>
                  <Ionicons name="bicycle-outline" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No orders to track</Text>
                <Text style={styles.emptySub}>Place an order or check your order history</Text>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/order-history")} activeOpacity={0.85}>
                  <Text style={styles.outlineBtnText}>View order history</Text>
                </TouchableOpacity>
              </View>
            ) : loading && !displayOrder ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.loadingText}>Loading order…</Text>
              </View>
            ) : displayOrder ? (
              <>
                <View style={styles.summaryBanner}>
                  <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                    <View style={styles.summaryBannerIcon}>
                      <Ionicons name={isDelivered ? "checkmark-circle" : "bicycle"} size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.summaryBannerText}>
                      <Text style={styles.summaryBannerLabel}>Order #{getOrderIdShort(displayOrder)}</Text>
                      <Text style={styles.summaryBannerValue} numberOfLines={1}>{statusLabel(displayOrder)}</Text>
                      <Text style={styles.summaryBannerMeta} numberOfLines={1}>{productLabel}</Text>
                    </View>
                    {eta ? (
                      <View style={styles.etaChip}>
                        <Text style={styles.etaChipLabel}>ETA</Text>
                        <Text style={styles.etaChipValue}>{eta}</Text>
                      </View>
                    ) : (
                      <View style={styles.etaChip}>
                        <Text style={styles.etaChipValue}>{progressPct}%</Text>
                        <Text style={styles.etaChipLabel}>Done</Text>
                      </View>
                    )}
                  </LinearGradient>
                </View>

                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={[theme.medium, theme.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${progressPct}%` }]}
                  />
                </View>

                {!singleOrderMode && recentOrders.length > 1 ? (
                  <SectionCard icon="list-outline" title="Select order" subtitle="Switch between active deliveries">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                      {recentOrders.map((o) => {
                        const id = o?.id ?? o?._id ?? getOrderId(o);
                        const selected = id && String(id) === String(selectedOrderId);
                        return (
                          <TouchableOpacity key={id || getOrderId(o)} onPress={() => setSelectedOrderId(id)} activeOpacity={0.88}>
                            {selected ? (
                              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.orderChip}>
                                <Text style={styles.orderChipTextSelected}>#{getOrderIdShort(o)}</Text>
                                <Text style={styles.orderChipSubSelected}>{statusLabel(o)}</Text>
                              </LinearGradient>
                            ) : (
                              <View style={styles.orderChipMuted}>
                                <Text style={styles.orderChipText}>#{getOrderIdShort(o)}</Text>
                                <Text style={styles.orderChipSub}>{statusLabel(o)}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </SectionCard>
                ) : null}

                <SectionCard icon="git-network-outline" title="Delivery timeline" subtitle="Step-by-step progress">
                  {steps.map((step, index) => (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        {step.done ? (
                          <LinearGradient colors={["#059669", "#10B981"]} style={styles.timelineDot}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </LinearGradient>
                        ) : (
                          <View style={styles.timelineDotPending}>
                            <Ionicons name={step.icon} size={16} color={theme.textMuted} />
                          </View>
                        )}
                        {index < steps.length - 1 ? (
                          <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                        ) : null}
                      </View>
                      <View style={styles.timelineRight}>
                        <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>{step.label}</Text>
                      </View>
                    </View>
                  ))}
                </SectionCard>

                <SectionCard icon="location-outline" title="Delivery details" subtitle="Address and receiver">
                  <DetailRow icon="location-outline" value={displayOrder.address || "No address set"} />
                  {(displayOrder.receiverName || displayOrder.receiverPhone) && (
                    <DetailRow
                      icon="person-outline"
                      value={`${displayOrder.receiverName || "Receiver"}${displayOrder.receiverPhone ? ` · ${displayOrder.receiverPhone}` : ""}`}
                    />
                  )}
                </SectionCard>

                {Array.isArray(displayOrder?.items) && displayOrder.items.length > 0 ? (
                  <SectionCard icon="cube-outline" title="Order items" subtitle={`${displayOrder.items.length} item(s)`}>
                    {displayOrder.items.map((item, idx) => {
                      const qty = item.qty || 1;
                      const lineTotal = (item.price || 0) * qty;
                      return (
                        <View key={idx} style={[styles.itemRow, idx < displayOrder.items.length - 1 && styles.itemRowBorder]}>
                          <View style={styles.itemLeft}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.productName || "Item"}</Text>
                            {item.supplierName ? <Text style={styles.itemSub} numberOfLines={1}>{item.supplierName}</Text> : null}
                          </View>
                          <Text style={styles.itemPrice}>x{qty} · ₹{lineTotal}</Text>
                        </View>
                      );
                    })}
                  </SectionCard>
                ) : null}

                {(supplier || riderName || riderPhone) ? (
                  <SectionCard icon="people-outline" title="Contacts" subtitle="Supplier and delivery partner">
                    {supplier ? (
                      <View style={styles.contactCard}>
                        <View style={styles.contactIconWrap}>
                          <Ionicons name="business-outline" size={18} color={theme.accent} />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactLabel}>Supplier</Text>
                          <Text style={styles.contactName} numberOfLines={1}>
                            {supplier.name || "Supplier"}
                            {supplierRating != null ? ` · ⭐ ${supplierRating.toFixed(1)}` : ""}
                          </Text>
                        </View>
                        {supplierPhone ? (
                          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${supplierPhone}`)} activeOpacity={0.85}>
                            <Ionicons name="call" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                    {accepted ? (
                      <View style={[styles.contactCard, supplier && styles.contactCardSpaced]}>
                        <View style={styles.contactIconWrap}>
                          <Ionicons name="bicycle-outline" size={18} color={theme.accent} />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactLabel}>Delivery partner</Text>
                          <Text style={styles.contactName} numberOfLines={1}>
                            {riderName || "Waiting for assignment"}
                          </Text>
                        </View>
                        {riderPhone ? (
                          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${riderPhone}`)} activeOpacity={0.85}>
                            <Ionicons name="call" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                    {accepted?.remarks ? (
                      <Text style={styles.remarksText}>Note: {accepted.remarks}</Text>
                    ) : null}
                  </SectionCard>
                ) : null}

                {riderPhone ? (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${riderPhone}`)} activeOpacity={0.88}>
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.primaryBtn}>
                      <Ionicons name="call-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Call delivery partner</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/order-history")} activeOpacity={0.85}>
                  <Text style={styles.outlineBtnText}>View order history</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18, zIndex: 2 },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 20 },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  summaryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBannerText: { flex: 1, minWidth: 0 },
  summaryBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryBannerValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  summaryBannerMeta: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  etaChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  etaChipLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  etaChipValue: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(51,175,193,0.15)",
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  chipRow: { gap: 10, paddingRight: 4 },
  orderChip: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110 },
  orderChipMuted: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    backgroundColor: theme.contentPanelBackground,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  orderChipTextSelected: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  orderChipSubSelected: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.88)", marginTop: 2 },
  orderChipText: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  orderChipSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  timelineRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  timelineLeft: { width: 36, alignItems: "center" },
  timelineDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  timelineDotPending: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { width: 2, height: 28, backgroundColor: "rgba(51,175,193,0.15)", marginVertical: 4 },
  timelineLineDone: { backgroundColor: "#10B981" },
  timelineRight: { flex: 1, marginLeft: 10, paddingTop: 6, paddingBottom: 8 },
  timelineLabel: { fontSize: 14, color: theme.textMuted, fontWeight: "500", lineHeight: 20 },
  timelineLabelDone: { color: theme.textPrimary, fontWeight: "700" },

  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  detailTextWrap: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  detailValue: { fontSize: 14, color: theme.textPrimary, lineHeight: 20 },

  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(214,234,242,0.95)" },
  itemLeft: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  itemSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: theme.accent },

  contactCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactCardSpaced: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(214,234,242,0.95)" },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  contactName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginTop: 2 },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  remarksText: { fontSize: 13, color: theme.textMuted, marginTop: 12, lineHeight: 19, fontStyle: "italic" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  outlineBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.accent,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  outlineBtnText: { fontSize: 15, fontWeight: "700", color: theme.link },

  emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.textPrimary },
  emptySub: { fontSize: 14, color: theme.textMuted, marginTop: 6, textAlign: "center" },
  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  loadingText: { marginTop: 12, fontSize: 14, color: theme.textMuted },
});
