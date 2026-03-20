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
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { useCart } from "@/src/context/CartContext";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const statusLabel = (order) => {
  if (!order) return "—";
  if (order.status === "cancelled") return "Cancelled";
  if (order.status === "delivered") return "Delivered";
  const accepted = (order.supplierResponses || []).find((r) => r.status === "accepted");
  const stage = accepted?.deliveryStage || (accepted ? "accepted" : null);
  if (stage === "delivered") return "Delivered";
  if (stage === "picked_up") return "Picked up";
  if (accepted) {
    // Delivery partner might be assigned before pickup happens.
    if (stage === "accepted" && accepted.deliveryPartnerName) return "Delivery partner assigned";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenuModal, setShowMenuModal] = useState(false);

  const resolveOrderMongoId = (candidate) => {
    if (candidate == null) return null;
    const c = String(candidate);
    const found = (orders || []).find((o) => {
      const mongoId = o?.id ?? o?._id;
      return mongoId === c || o?.orderId === c || String(o?._id) === c;
    });
    // API expects Mongo _id; order list returns `id` = Mongo _id.
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
      .then((data) => {
        setOrder(data || null);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [selectedOrderId, initialOrderId]);

  // Poll for updates when viewing an order
  useEffect(() => {
    const id = initialOrderId || selectedOrderId;
    if (!id) return;
    const interval = setInterval(() => {
      api.orders.get(id).then(setOrder).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedOrderId, initialOrderId]);

  const handleViewOrderHistory = () => {
    router.push("/order-history");
  };

  const selectedOrderFromList = selectedOrderId
    ? (recentOrders || []).find((o) => String(o?.id ?? o?._id) === String(selectedOrderId)) || null
    : null;

  // Prefer fully fetched order (`order`) but fall back to list order so details show immediately.
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

  const dropdownOrder = displayOrder;

  const pickupStepLabel =
    stage === "picked_up" || stage === "delivered"
      ? `Picked up by ${riderName || "delivery partner"}`
      : accepted && riderName
      ? `Delivery partner assigned: ${riderName}`
      : accepted
      ? "Waiting for delivery partner to get assigned"
      : "Waiting for delivery partner";

  const steps = [
    {
      key: "placed",
      label: "Order placed",
      icon: "cart",
      done: true,
    },
    {
      key: "accepted",
      label: accepted ? "Accepted by supplier" : "Waiting for supplier to accept",
      icon: "checkmark-circle",
      done: !!accepted,
    },
    {
      key: "picked_up",
      label: pickupStepLabel,
      icon: "cube",
      done: stage === "picked_up" || stage === "delivered",
    },
    {
      key: "delivered",
      label: "Delivery completed",
      icon: "flag",
      done: isDelivered,
    },
  ];

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
            <TouchableOpacity
              style={styles.headerMenuBtn}
              activeOpacity={0.7}
              onPress={() => setShowMenuModal(true)}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="time-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Track your order</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
        {recentOrders.length === 0 && !singleOrderMode ? (
          <View style={styles.emptyState}>
            <Text style={styles.noOrders}>No orders to track.</Text>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleViewOrderHistory}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnOutlineText}>View order history</Text>
            </TouchableOpacity>
          </View>
        ) : loading && !displayOrder ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Loading order…</Text>
          </View>
        ) : (
          <>
            {!singleOrderMode && recentOrders.length > 1 && (
              <View style={styles.dropdownWrap}>
                <Text style={styles.dropdownLabel}>Select order</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    Order #{getOrderIdShort(dropdownOrder || { id: selectedOrderId })} – {statusLabel(dropdownOrder)}
                  </Text>
                  <Ionicons
                    name={dropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7C85"
                  />
                </TouchableOpacity>
                {dropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.dropdownListScroll}
                      showsVerticalScrollIndicator={true}
                    >
                      {recentOrders.map((o) => {
                        const id = o?.id ?? o?._id ?? getOrderId(o);
                        const selected = id && String(id) === String(selectedOrderId);
                        return (
                          <TouchableOpacity
                            key={id || getOrderId(o) || String(Math.random())}
                            style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                            onPress={() => {
                              setSelectedOrderId(id);
                              setDropdownOpen(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              Order #{getOrderIdShort(o)}
                            </Text>
                            <Text style={styles.dropdownItemStatus}>{statusLabel(o)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {displayOrder && (
              <>
                <View style={styles.orderSummaryCard}>
                  <Text style={styles.orderSummaryTitle}>
                    Order #{getOrderIdShort(displayOrder)}
                  </Text>
                  <Text style={styles.orderSummaryStatus}>
                    {statusLabel(displayOrder)}
                  </Text>
                  <View style={styles.orderSummaryRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7C85" />
                    <Text style={styles.orderSummaryText} numberOfLines={2}>
                      {displayOrder.address || "No address set"}
                    </Text>
                  </View>
                  {(displayOrder.receiverName || displayOrder.receiverPhone) && (
                    <View style={styles.orderSummaryRow}>
                      <Ionicons name="person-outline" size={16} color="#6B7C85" />
                      <Text style={styles.orderSummaryText} numberOfLines={1}>
                        {displayOrder.receiverName || "Receiver"}{" "}
                        {displayOrder.receiverPhone ? `• ${displayOrder.receiverPhone}` : ""}
                      </Text>
                    </View>
                  )}
                  {supplier && (
                    <View style={styles.orderSummaryRow}>
                      <Ionicons name="business-outline" size={16} color="#6B7C85" />
                      <Text style={styles.orderSummaryText} numberOfLines={1}>
                        {supplier.name || "Supplier"}
                        {supplierRating != null && ` • ⭐ ${supplierRating.toFixed(1)}`}
                        {supplierPhone ? ` • ${supplierPhone}` : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {Array.isArray(displayOrder?.items) && displayOrder.items.length > 0 ? (
                  <View style={styles.itemsCard}>
                    <Text style={styles.itemsTitle}>Order items</Text>
                    {(displayOrder.items || []).map((item, idx) => {
                      const qty = item.qty || 1;
                      const unitPrice = item.price || 0;
                      const lineTotal = unitPrice * qty;
                      return (
                        <View key={idx} style={styles.itemRow}>
                          <View style={styles.itemRowLeft}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.productName || "Item"}
                            </Text>
                            {item.supplierName ? (
                              <Text style={styles.itemSub} numberOfLines={1}>
                                {item.supplierName}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.itemMeta}>
                            x{qty} • ₹{lineTotal}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.trackCard}>
                  <Text style={styles.trackStatus}>
                    {isDelivered ? "Delivered" : accepted ? "Supplier accepted" : "Waiting for supplier to accept"}
                  </Text>
                  {eta ? <Text style={styles.trackEta}>ETA: {eta}</Text> : null}
                  {accepted?.remarks ? <Text style={styles.trackRemarks}>{accepted.remarks}</Text> : null}

                  {supplier ? (
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Supplier</Text>
                      <Text style={styles.infoLine}>
                        {supplier.name || "Supplier"}
                        {supplierRating != null && ` • ⭐ ${supplierRating.toFixed(1)}`}
                      </Text>
                      {supplierPhone ? <Text style={[styles.infoSub, styles.highlightLine]}>Phone: {supplierPhone}</Text> : null}
                    </View>
                  ) : null}

                  {accepted && (riderName || riderPhone) ? (
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Delivery partner</Text>
                      <Text style={[styles.infoLine, styles.highlightLine]}>{riderName || "Delivery partner"}</Text>
                      {riderPhone ? <Text style={[styles.infoSub, styles.highlightLine]}>Phone: {riderPhone}</Text> : null}
                    </View>
                  ) : accepted ? (
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Delivery partner</Text>
                      <Text style={styles.infoSub}>Waiting for delivery partner assignment</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.timeline}>
                  {steps.map((step, index) => (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        <View
                          style={[styles.timelineDot, step.done && styles.timelineDotDone]}
                        >
                          {step.done ? (
                            <Ionicons name="checkmark" size={18} color="#FFF" />
                          ) : (
                            <Ionicons name={step.icon} size={18} color="#9CA3AF" />
                          )}
                        </View>
                        {index < steps.length - 1 && (
                          <View
                            style={[
                              styles.timelineLine,
                              step.done && styles.timelineLineDone,
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.timelineRight}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            step.done && styles.timelineLabelDone,
                          ]}
                        >
                          {step.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.mapText}>Map view (integrate later)</Text>
                </View>
                {riderPhone ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL("tel:" + riderPhone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Call delivery partner</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            <View style={styles.bottomPadding} />
          </>
        )}
        </ScrollView>
      </View>

      {/* Hamburger menu modal - Profile, Order History, etc. */}
      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/profile");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/order-history");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Order History</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setShowMenuModal(false);
                router.push("/water-intake");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="water-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Water Intake</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
    paddingHorizontal: 20,
  },
  headerSection: {
    marginTop: -10,
    marginLeft: -20,
    marginRight: -20,
    height: 200,
    overflow: "hidden",
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 36,
    paddingBottom: 36,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    width: "100%",
  },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    paddingBottom: 32,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingRight: 20,
    alignItems: "flex-end",
  },
  menuModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuModalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2B34",
    marginLeft: 12,
  },
  contentSection: {
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    flex: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: theme.screenBackground,
  },
  headerBackBtn: {
    backgroundColor: "#f0f7fcd7",
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2B34",
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  orderSummaryCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  orderSummaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2B34",
    marginBottom: 4,
  },
  orderSummaryStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 10,
  },
  orderSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  orderSummaryText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
  },
  itemsCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  itemsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2B34",
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  itemRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B2B34",
  },
  itemSub: {
    fontSize: 12,
    color: "#6B7C85",
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 13,
    color: "#1B2B34",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 0,
  },
  emptyState: {
    paddingVertical: 40,
  },
  noOrders: {
    fontSize: 16,
    color: "#6B7C85",
    marginBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7C85",
  },
  dropdownWrap: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7C85",
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f7fcd7",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B2B34",
    flex: 1,
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownListScroll: {
    maxHeight: 218,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemSelected: {
    backgroundColor: theme.selectedTint,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B2B34",
    flex: 1,
  },
  dropdownItemStatus: {
    fontSize: 13,
    color: "#6B7C85",
  },
  trackCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  trackStatus: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  trackEta: {
    fontSize: 15,
    color: "#1B2B34",
    marginTop: 4,
  },
  trackRemarks: {
    fontSize: 14,
    color: "#6B7C85",
    marginTop: 4,
  },
  infoBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7C85",
    marginBottom: 4,
  },
  infoLine: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B2B34",
  },
  infoSub: {
    fontSize: 13,
    color: "#6B7C85",
    marginTop: 4,
  },
  highlightLine: {
    color: theme.primary,
  },
  trackPending: {
    fontSize: 15,
    color: "#6B7C85",
  },
  timeline: {
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: "center",
    width: 32,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotDone: {
    backgroundColor: "#10B981",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: "#E5E7EB",
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: "#10B981",
  },
  timelineRight: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 4,
  },
  timelineLabel: {
    fontSize: 14,
    color: "#6B7C85",
    fontWeight: "500",
  },
  timelineLabelDone: {
    color: "#1B2B34",
    fontWeight: "600",
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  mapText: {
    fontSize: 13,
    color: "#6B7C85",
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f0f7fcd7",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.primary,
    marginBottom: 10,
  },
  actionBtnOutlineText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
