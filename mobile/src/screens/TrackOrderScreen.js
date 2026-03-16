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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { headerRowWithBackStyle } from "@/src/components/BackButton";
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
  if (accepted) return "Accepted";
  return "Waiting for supplier";
};

export default function TrackOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialOrderId = params?.orderId ? String(params.orderId) : null;

  const { orders, getLatestOrder } = useCart();
  const [order, setOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const singleOrderMode = !!initialOrderId;
  const inProgressOrders = (orders || []).filter(
    (o) => o.status !== "cancelled" && o.status !== "delivered"
  );
  const recentOrders = inProgressOrders.length > 0 ? inProgressOrders : (orders || []).slice(0, 10);

  useEffect(() => {
    if (singleOrderMode && initialOrderId) {
      setSelectedOrderId(initialOrderId);
    } else if (!singleOrderMode && recentOrders.length > 0 && !selectedOrderId) {
      const id = getOrderId(recentOrders[0]);
      if (id) setSelectedOrderId(id);
    }
  }, [singleOrderMode, initialOrderId, recentOrders.length]);

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

  const handleViewDetails = () => {
    router.push("/order-history");
  };

  const displayOrder = order;

  const accepted = (displayOrder?.supplierResponses || []).find((r) => r.status === "accepted");
  const stage = accepted?.deliveryStage || (accepted ? "accepted" : null);
  const riderName = accepted?.deliveryPartnerName;
  const riderPhone = accepted?.deliveryPartnerPhone;
  const eta = accepted?.eta;
  const isDelivered = displayOrder?.status === "delivered" || stage === "delivered";

  const steps = [
    { key: "accepted", label: "Accepted by supplier", icon: "checkmark-circle", done: !!accepted },
    {
      key: "picked_up",
      label: riderName ? `Picked up by ${riderName}` : "Picked up by delivery partner",
      icon: "cube",
      done: stage === "picked_up" || stage === "delivered",
    },
    { key: "delivered", label: "Delivery completed", icon: "flag", done: isDelivered },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerRow, headerRowWithBackStyle]}>
        <BackButton onPress={() => router.back()} iconColor="#1B2B34" style={styles.headerBackBtn} />
        <Text style={styles.title}>Track your order</Text>
        <View style={styles.headerSpacer} />
      </View>

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
                    Order #{getOrderIdShort(displayOrder || { id: selectedOrderId })} –{" "}
                    {statusLabel(displayOrder)}
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
                        const id = getOrderId(o);
                        const selected = id === selectedOrderId;
                        return (
                          <TouchableOpacity
                            key={id}
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
                {accepted ? (
                  <View style={styles.trackCard}>
                    <Text style={styles.trackStatus}>Supplier accepted</Text>
                    {eta ? <Text style={styles.trackEta}>ETA: {eta}</Text> : null}
                    {accepted.remarks ? (
                      <Text style={styles.trackRemarks}>{accepted.remarks}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.trackCard}>
                    <Text style={styles.trackPending}>Waiting for supplier to accept</Text>
                  </View>
                )}

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
                    <Text style={styles.actionBtnText}>Call rider</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleViewDetails}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={22} color={theme.primary} />
              <Text style={styles.actionBtnOutlineText}>View order details</Text>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.screenBackground,
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
    paddingHorizontal: 24,
    paddingTop: 20,
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
