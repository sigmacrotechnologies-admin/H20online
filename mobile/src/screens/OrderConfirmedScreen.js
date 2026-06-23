import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppLogo from "@/src/components/AppLogo";
import BackButton from "@/src/components/BackButton";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import RouteMapPreview from "@/src/components/RouteMapPreview";
import LiveTrackingMap from "@/src/components/LiveTrackingMap";
import { useCart } from "@/src/context/CartContext";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { api } from "@/src/api/client";
import { getOrderIdShort, getOrderMongoId, matchOrderId } from "@/src/utils/orderId";
import { primaryTravelLeg } from "@/src/utils/deliveryEta";
import { resolveOrderEta } from "@/src/utils/orderEta";
import { useLiveOrderTracking } from "@/src/hooks/useLiveOrderTracking";
import { isCustomerLiveTrackingEnabled } from "@/src/utils/customerLiveTracking";
import { theme } from "@/src/theme";

/** Poll order status only while waiting for supplier / partner assignment */
const STATUS_POLL_MS = 12000;

function getAccepted(order) {
  return (order?.supplierResponses || []).find((r) => r && r.status === "accepted");
}

function buildSteps(order) {
  const accepted = getAccepted(order);
  const stage = accepted?.deliveryStage;
  const hasPartner = !!(accepted?.deliveryPartnerId || accepted?.deliveryPartnerName);
  const isDelivered = order?.status === "delivered" || stage === "delivered";

  return [
    { key: "placed", label: "Order placed", icon: "checkmark-circle", done: true },
    {
      key: "supplier",
      label: accepted ? "Accepted by supplier" : "Awaiting supplier",
      icon: "storefront-outline",
      done: !!accepted,
      waiting: !accepted,
    },
    {
      key: "partner",
      label: hasPartner
        ? `Partner: ${accepted.deliveryPartnerName || "Assigned"}`
        : accepted
          ? "Assigning delivery partner"
          : "Delivery partner",
      icon: "bicycle-outline",
      done: hasPartner,
      waiting: accepted && !hasPartner,
    },
    {
      key: "delivery",
      label: stage === "picked_up" ? "Out for delivery" : "On the way to you",
      icon: "navigate-outline",
      done: stage === "picked_up" || isDelivered,
      live: stage === "picked_up" && !isDelivered,
    },
    { key: "done", label: "Delivered", icon: "home-outline", done: isDelivered },
  ];
}

function statusHeadline(order) {
  if (!order) return "Processing your order";
  if (order.status === "delivered") return "Order delivered";
  if (order.status === "cancelled") return "Order cancelled";
  const accepted = getAccepted(order);
  const stage = accepted?.deliveryStage;
  if (stage === "picked_up") return "Partner is on the way";
  if (accepted?.deliveryPartnerName) return "Delivery partner assigned";
  if (accepted) return "Supplier accepted your order";
  return "Waiting for supplier to accept";
}

const OrderConfirmedScreen = () => {
  const router = useRouter();
  const portal = useCustomerPortal();
  const params = useLocalSearchParams();
  const orderIdParam = params.orderId ?? params?.orderId;
  const orderId = typeof orderIdParam === "string" ? orderIdParam : null;
  const { refreshOrders } = useCart();
  const [order, setOrder] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!orderId);
  const [statusPolling, setStatusPolling] = useState(false);
  const hadPartnerRef = useRef(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const accepted = getAccepted(order);
  const stage = accepted?.deliveryStage;
  const hasPartner = !!(accepted?.deliveryPartnerId || accepted?.deliveryPartnerName);
  const isDelivered = order?.status === "delivered" || stage === "delivered";
  const isCancelled = order?.status === "cancelled";
  const isPickedUp = stage === "picked_up";

  const mongoId = order ? getOrderMongoId(order) : orderId;
  const liveEnabled = isCustomerLiveTrackingEnabled(order);
  const { tracking: liveTracking } = useLiveOrderTracking(mongoId, liveEnabled);

  const shouldPollOrderStatus =
    !!orderId &&
    !!order &&
    !isDelivered &&
    !isCancelled &&
    (!accepted || !hasPartner || !isPickedUp);

  const loadOrder = useCallback(
    async (silent = false) => {
      if (!orderId) {
        if (!silent) setInitialLoading(false);
        return;
      }
      if (!silent) setInitialLoading(true);
      try {
        const data = await api.orders.get(orderId);
        if (data) setOrder(data);
      } catch (_) {}
      if (!silent) setInitialLoading(false);
    },
    [orderId]
  );

  useEffect(() => {
    loadOrder(false);
    refreshOrders();
  }, [orderId]);

  useEffect(() => {
    if (!shouldPollOrderStatus) {
      setStatusPolling(false);
      return undefined;
    }
    setStatusPolling(true);
    const timer = setInterval(() => loadOrder(true), STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [shouldPollOrderStatus, loadOrder]);

  useEffect(() => {
    if (hasPartner && !hadPartnerRef.current) {
      hadPartnerRef.current = true;
      loadOrder(true);
    }
    if (!hasPartner) hadPartnerRef.current = false;
  }, [hasPartner, loadOrder]);

  const travel = primaryTravelLeg(order?.travelInfo);
  const customerLat = liveTracking?.customerLatitude ?? order?.customerLatitude;
  const customerLng = liveTracking?.customerLongitude ?? order?.customerLongitude;
  const storeLat = travel?.storeLatitude;
  const storeLng = travel?.storeLongitude;
  const partnerLat = liveTracking?.partnerLatitude;
  const partnerLng = liveTracking?.partnerLongitude;

  const hasRouteMap =
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng) &&
    Number.isFinite(storeLat) &&
    Number.isFinite(storeLng);

  const hasLiveMap =
    liveEnabled &&
    Number.isFinite(partnerLat) &&
    Number.isFinite(partnerLng) &&
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng);

  const etaText = resolveOrderEta(order, liveTracking) || "Estimating…";
  const distanceText =
    liveTracking?.liveDistanceText || travel?.distanceText || "";

  const steps = buildSteps(order);
  const progressPct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const itemCount = (order?.items || []).reduce((s, i) => s + (i.qty || 1), 0);
  const headline = statusHeadline(order);

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
              <BackButton onPress={() => router.replace(portal.home)} />
              <AppLogo size="header" />
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.headerTitle}>Order confirmed</Text>
            <Text style={styles.headerSubtitle}>{headline}</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {initialLoading && !order ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.loadingText}>Loading order…</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryBanner}>
                  <LinearGradient
                    colors={[theme.medium, theme.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.summaryBannerGradient}
                  >
                    <View style={styles.summaryBannerIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.summaryBannerText}>
                      <Text style={styles.summaryBannerLabel}>Order #{getOrderIdShort(order) || orderId?.slice(-8)}</Text>
                      <Text style={styles.summaryBannerValue}>{headline}</Text>
                      {itemCount ? (
                        <Text style={styles.summaryBannerMeta}>
                          {itemCount} item{itemCount !== 1 ? "s" : ""} · ₹{order?.total ?? "—"}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.etaChip}>
                      <Text style={styles.etaChipLabel}>ETA</Text>
                      <Text style={styles.etaChipValue}>{etaText}</Text>
                    </View>
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

                {statusPolling ? (
                  <View style={styles.pollHint}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={styles.pollHintText}>Checking for supplier updates…</Text>
                  </View>
                ) : liveEnabled ? (
                  <View style={styles.pollHint}>
                    <View style={styles.liveDot} />
                    <Text style={styles.pollHintText}>Live rider map — refreshes every 30 seconds</Text>
                  </View>
                ) : null}

                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Ionicons name="time-outline" size={18} color={theme.accent} />
                    <View style={styles.metricText}>
                      <Text style={styles.metricLabel}>Estimated delivery</Text>
                      <Text style={styles.metricValue}>{etaText}</Text>
                    </View>
                  </View>
                  {distanceText ? (
                    <View style={styles.metricCard}>
                      <Ionicons name="navigate-outline" size={18} color={theme.accent} />
                      <View style={styles.metricText}>
                        <Text style={styles.metricLabel}>
                          {liveEnabled ? "Distance to you" : "Distance to store"}
                        </Text>
                        <Text style={styles.metricValue}>{distanceText}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {hasLiveMap ? (
                  <View style={styles.mapCard}>
                    <Text style={styles.mapLabel}>Live delivery tracking</Text>
                    <LiveTrackingMap
                      partnerLatitude={partnerLat}
                      partnerLongitude={partnerLng}
                      customerLatitude={customerLat}
                      customerLongitude={customerLng}
                      height={200}
                    />
                  </View>
                ) : hasRouteMap ? (
                  <View style={styles.mapCard}>
                    <Text style={styles.mapLabel}>Route preview</Text>
                    <RouteMapPreview
                      fromLatitude={storeLat}
                      fromLongitude={storeLng}
                      toLatitude={customerLat}
                      toLongitude={customerLng}
                      height={200}
                    />
                  </View>
                ) : null}

                <View style={styles.timelineCard}>
                  <Text style={styles.cardTitle}>Order progress</Text>
                  {steps.map((step) => (
                    <View key={step.key} style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          step.done && styles.timelineDotDone,
                          step.waiting && styles.timelineDotWaiting,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={14}
                          color={step.done ? "#FFFFFF" : theme.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.timelineLabel,
                          step.done && styles.timelineLabelDone,
                          step.waiting && styles.timelineLabelWaiting,
                        ]}
                        numberOfLines={2}
                      >
                        {step.label}
                      </Text>
                      {step.live ? (
                        <View style={styles.livePill}>
                          <Text style={styles.livePillText}>LIVE</Text>
                        </View>
                      ) : step.waiting ? (
                        <View style={styles.waitPill}>
                          <Text style={styles.waitPillText}>Waiting</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                {order ? (
                  <View style={styles.summaryCard}>
                    <Text style={styles.cardTitle}>Order summary</Text>
                    {(order.items || []).slice(0, 6).map((item, i) => (
                      <View key={`${item.productName}-${i}`} style={styles.summaryRow}>
                        <Text style={styles.summaryItem} numberOfLines={1}>
                          {item.qty || 1}× {item.productName}
                        </Text>
                        <Text style={styles.summaryPrice}>₹{(item.price || 0) * (item.qty || 1)}</Text>
                      </View>
                    ))}
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotalLabel}>Total paid</Text>
                      <Text style={styles.summaryTotal}>₹{order.total}</Text>
                    </View>
                    {order.paymentMethod ? (
                      <Text style={styles.summaryMeta}>Payment: {String(order.paymentMethod).toUpperCase()}</Text>
                    ) : null}
                    {order.address ? (
                      <Text style={styles.summaryMeta} numberOfLines={2}>Deliver to: {order.address}</Text>
                    ) : null}
                    {accepted?.deliveryPartnerName ? (
                      <Text style={styles.summaryMeta}>Partner: {accepted.deliveryPartnerName}</Text>
                    ) : (
                      <Text style={styles.summaryMeta}>Partner: awaiting assignment</Text>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => {
                    const id = mongoId || orderId;
                    router.push(id ? `/track-order?orderId=${encodeURIComponent(id)}` : "/track-order");
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.trackBtnGradient}>
                    <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.trackBtnText}>Open full tracking</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dashboardBtn}
                  onPress={() => router.replace(portal.home)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dashboardBtnText}>Back to dashboard</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OrderConfirmedScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },
  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  loadingWrap: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, color: theme.textMuted, fontWeight: "500" },
  summaryBanner: { borderRadius: 20, overflow: "hidden", marginBottom: 12 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  summaryBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBannerText: { flex: 1, minWidth: 0 },
  summaryBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" },
  summaryBannerValue: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  summaryBannerMeta: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 4 },
  etaChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  etaChipLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  etaChipValue: { fontSize: 13, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(214,234,242,0.95)",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 4 },
  pollHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  pollHintText: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
  pollHintStatic: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 14,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  metricText: { flex: 1, minWidth: 0 },
  metricLabel: { fontSize: 10, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase" },
  metricValue: { fontSize: 14, fontWeight: "800", color: theme.accent, marginTop: 2 },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    overflow: "hidden",
  },
  mapLabel: { fontSize: 13, fontWeight: "700", color: theme.textPrimary, marginBottom: 8 },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: theme.textPrimary, marginBottom: 12 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(107,124,133,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: { backgroundColor: theme.accent },
  timelineDotWaiting: { backgroundColor: "rgba(245,158,11,0.2)" },
  timelineLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textMuted },
  timelineLabelDone: { color: theme.textPrimary },
  timelineLabelWaiting: { color: "#B45309" },
  livePill: {
    backgroundColor: "rgba(220,38,38,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  livePillText: { fontSize: 10, fontWeight: "800", color: "#DC2626" },
  waitPill: {
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  waitPillText: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  summaryItem: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.textPrimary },
  summaryPrice: { fontSize: 13, fontWeight: "700", color: theme.accent },
  summaryDivider: { height: 1, backgroundColor: "rgba(214,234,242,0.95)", marginVertical: 8 },
  summaryTotalLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  summaryTotal: { fontSize: 18, fontWeight: "800", color: theme.accent },
  summaryMeta: { fontSize: 12, color: theme.textMuted, marginTop: 6, lineHeight: 17 },
  trackBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  trackBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  trackBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  dashboardBtn: { alignItems: "center", paddingVertical: 14 },
  dashboardBtnText: { fontSize: 15, fontWeight: "700", color: theme.link },
});
