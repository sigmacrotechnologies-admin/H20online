import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  FilterChip,
  GradientButton,
  EmptyState,
  ModernSheet,
  SupplierPageHeader,
  ui,
} from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { etaFromTravelInfo } from "@/src/utils/deliveryEta";

const VEHICLE_LABELS = {
  bicycle: "Bicycle",
  bike: "Bike",
  van: "Van",
  tanker: "Tanker",
  miniTruck: "Mini Truck",
};

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "instant", label: "Instant" },
  { id: "scheduled", label: "Scheduled" },
];

export default function SupplierIncomingOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOrder, setModalOrder] = useState(null);
  const [etaBufferMinutes, setEtaBufferMinutes] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [fleetType, setFleetType] = useState("");
  const [allPartners, setAllPartners] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.supplier.ordersIncoming().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(load);

  const openModal = (order) => {
    setModalOrder(order);
    setEtaBufferMinutes(0);
    setRemarks("");
    setFleetType("");
    setSelectedPartnerId(null);
    setAllPartners([]);
    setPartners([]);
    if (order) {
      const params = {};
      if (order.customerLatitude != null && order.customerLongitude != null) {
        params.nearLat = order.customerLatitude;
        params.nearLng = order.customerLongitude;
      }
      api.supplier.deliveryPartners
        .list(params)
        .then((list) => {
          setAllPartners(list || []);
          setPartners(list || []);
        })
        .catch(() => {
          setAllPartners([]);
          setPartners([]);
        });
    }
  };

  const loadPartnersByFleet = (type) => {
    setFleetType(type);
    setSelectedPartnerId(null);
    if (!type) {
      setPartners(allPartners);
      return;
    }
    setPartners((allPartners || []).filter((p) => p.vehicleType === type));
  };

  const availableFleetOptions = Array.from(new Set((allPartners || []).map((p) => p.vehicleType).filter(Boolean))).map((key) => ({
    key,
    label: VEHICLE_LABELS[key] || key,
  }));

  const adjustEtaBuffer = (delta) =>
    setEtaBufferMinutes((prev) => Math.min(60, Math.max(0, prev + delta)));

  const baseEta = modalOrder ? etaFromTravelInfo(modalOrder.travelInfo || [], 0) : null;
  const previewEta = modalOrder ? etaFromTravelInfo(modalOrder.travelInfo || [], etaBufferMinutes) : null;

  const handleAccept = async () => {
    if (!modalOrder?.id) return;
    if (!remarks.trim()) {
      alert("Remarks are required.");
      return;
    }
    if (!fleetType) {
      alert("Please select fleet type needed.");
      return;
    }
    if (!selectedPartnerId) {
      alert("Please assign a delivery partner.");
      return;
    }
    const selected = (allPartners || []).find((p) => p.id === selectedPartnerId);
    if (!selected?.availableForAssignment) {
      alert(
        selected?.inFlight
          ? "This partner is in flight delivering an order. Choose another partner."
          : "This partner must be online to receive assignments."
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.supplier.acceptOrder(modalOrder.id, {
        etaBufferMinutes,
        remarks: remarks.trim(),
        requestedFleetType: fleetType,
        deliveryPartnerId: selectedPartnerId,
      });
      setModalOrder(null);
      load();
    } catch (e) {
      alert(e.message || "Failed to accept");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = (orderId) => {
    if (!orderId) return;
    Alert.alert("Reject order", "Are you sure you want to reject this incoming order?", [
      { text: "No", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await api.supplier.rejectOrder(orderId, {});
            load();
          } catch (e) {
            alert(e.message || "Failed to reject");
          }
        },
      },
    ]);
  };

  const formatOrderDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatOrderTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getProductNames = (order) => {
    const src = order?.myItems?.length ? order.myItems : order?.items || [];
    return src.map((i) => i?.productName).filter(Boolean);
  };

  const instantOrders = orders.filter((o) => (o.orderType || "instant") === "instant");
  const scheduledOrders = orders.filter((o) => (o.orderType || "instant") === "scheduled");
  const visibleOrders =
    activeTypeFilter === "instant"
      ? instantOrders
      : activeTypeFilter === "scheduled"
      ? scheduledOrders
      : orders;

  const renderOrderCard = (o) => {
    const isScheduled = (o.orderType || "instant") === "scheduled";
    const typeMeta = isScheduled
      ? { label: "Scheduled", color: "#059669", bg: "rgba(5,150,105,0.12)", icon: "calendar-outline" }
      : { label: "Instant", color: "#DC2626", bg: "rgba(220,38,38,0.12)", icon: "flash-outline" };
    const productNames = getProductNames(o);

    return (
      <View key={o.id} style={styles.orderCard}>
        <View style={styles.orderCardTop}>
          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.orderIcon}>
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.orderMain}>
            <Text style={styles.orderId}>#{o.id.slice(-6)}</Text>
            <Text style={styles.orderCustomer} numberOfLines={1}>
              {o.customerName || o.customerEmail || "Customer"}
            </Text>
            <Text style={styles.orderDate}>
              {formatOrderDate(o.createdAt)} · {formatOrderTime(o.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={12} color={typeMeta.color} />
            <Text style={[styles.statusChipText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.detailText} numberOfLines={2}>
            <Text style={styles.detailLabel}>Products: </Text>
            {productNames.length ? productNames.join(", ") : "—"}
          </Text>
          <Text style={styles.detailText} numberOfLines={1}>
            <Text style={styles.detailLabel}>Receiver: </Text>
            {o.receiverName || "N/A"}
            {o.receiverPhone ? ` · ${o.receiverPhone}` : ""}
          </Text>
          <Text style={styles.detailText} numberOfLines={2}>
            <Text style={styles.detailLabel}>Address: </Text>
            {o.address || "N/A"}
          </Text>
        </View>

        <View style={styles.orderCardBottom}>
          <View style={styles.orderMetaItem}>
            <Ionicons name="cube-outline" size={14} color={theme.textMuted} />
            <Text style={styles.orderMetaText}>{(o.myItems || o.items || []).length} item(s)</Text>
          </View>
          <Text style={styles.orderTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
        </View>

        <View style={styles.cardActions}>
          <GradientButton label="Reject" variant="danger" onPress={() => handleReject(o.id)} style={{ flex: 1 }} />
          <GradientButton label="Accept" icon="checkmark" onPress={() => openModal(o)} style={{ flex: 1 }} />
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
          icon="cart-outline"
          title="Incoming orders"
          subtitle="Accept orders and assign delivery partner"
          stats={[
            { icon: "time-outline", label: "Pending", value: String(orders.length), alert: orders.length > 0 },
            { icon: "flash-outline", label: "Instant", value: String(instantOrders.length) },
            { icon: "calendar-outline", label: "Scheduled", value: String(scheduledOrders.length) },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard icon="funnel-outline" title="Order type" subtitle="Filter by delivery timing">
          <View style={ui.filterRow}>
            {TYPE_FILTERS.map((f) => {
              const count = f.id === "instant" ? instantOrders.length : f.id === "scheduled" ? scheduledOrders.length : orders.length;
              return (
                <FilterChip
                  key={f.id}
                  label={`${f.label} (${count})`}
                  selected={activeTypeFilter === f.id}
                  onPress={() => setActiveTypeFilter(f.id)}
                />
              );
            })}
          </View>
        </SectionCard>

        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="No pending orders"
            subtitle={
              activeTypeFilter === "all"
                ? "New customer orders will appear here for you to accept."
                : "No orders match this filter."
            }
          />
        ) : (
          visibleOrders.map(renderOrderCard)
        )}
      </ScrollView>

      <ModernSheet
        visible={!!modalOrder}
        title="Accept order"
        subtitle={modalOrder ? `Order #${modalOrder.id.slice(-6)}` : ""}
        icon="checkmark-circle-outline"
        onClose={() => setModalOrder(null)}
        footer={
          <GradientButton
            label={submitting ? "Saving..." : "Accept & send to customer"}
            onPress={handleAccept}
            disabled={submitting}
            loading={submitting}
            icon="send-outline"
          />
        }
      >
        {modalOrder ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order details</Text>
              <Text style={styles.summaryMeta}>
                Date: {formatOrderDate(modalOrder.createdAt)} · Time: {formatOrderTime(modalOrder.createdAt)}
              </Text>
              <Text style={styles.summaryMeta}>
                Customer: {modalOrder.customerName || modalOrder.customerEmail || "Customer"}
              </Text>
              <Text style={styles.summaryMeta}>
                Total: ₹{Number(modalOrder.myTotal || modalOrder.total).toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Products</Text>
              {(modalOrder.myItems?.length ? modalOrder.myItems : modalOrder.items || []).map((item, idx) => (
                <Text key={`${item.productName || "item"}-${idx}`} style={styles.summaryItem}>
                  {idx + 1}. {item.productName || "Product"} x {item.qty || 1}
                </Text>
              ))}
            </View>

            <Text style={ui.inputLabel}>Delivery ETA (distance-based)</Text>
            <Text style={styles.etaHint}>
              Base estimate from distance bands. Real map distance is shown to the customer separately.
            </Text>
            {baseEta ? (
              <Text style={styles.etaBase}>Base: {baseEta.text}</Text>
            ) : (
              <Text style={styles.etaBase}>Base: 25–30 min (default)</Text>
            )}
            <Text style={ui.inputLabel}>Buffer time (minutes)</Text>
            <View style={styles.etaRow}>
              <View style={styles.etaUnit}>
                <Text style={styles.etaUnitLabel}>Add buffer</Text>
                <View style={styles.etaControl}>
                  <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaBuffer(-5)}>
                    <Text style={styles.etaBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.etaValue}>{etaBufferMinutes}</Text>
                  <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaBuffer(5)}>
                    <Text style={styles.etaBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.etaPreview}>Customer ETA: {previewEta?.text || "—"}</Text>

            <Text style={ui.inputLabel}>Remarks (shown to customer) *</Text>
            <TextInput
              style={[ui.input, { minHeight: 60 }]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Required remarks"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <Text style={ui.inputLabel}>Fleet type needed *</Text>
            <View style={ui.filterRow}>
              {availableFleetOptions.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  selected={fleetType === f.key}
                  onPress={() => loadPartnersByFleet(f.key)}
                />
              ))}
            </View>

            {partners.length > 0 ? (
              <>
                <Text style={ui.inputLabel}>Assign delivery partner *</Text>
                <Text style={styles.partnerHint}>Partners in flight cannot be assigned until delivery is complete.</Text>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {partners.map((p) => {
                    const disabled = !p.availableForAssignment;
                    const statusLabel = p.inFlight ? "In flight" : p.isOnline ? "Online" : "Offline";
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.partnerRow,
                          selectedPartnerId === p.id && styles.partnerRowSelected,
                          disabled && styles.partnerRowDisabled,
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          setSelectedPartnerId(selectedPartnerId === p.id ? null : p.id);
                        }}
                        activeOpacity={disabled ? 1 : 0.85}
                      >
                        <View style={styles.partnerRowTop}>
                          <Text style={[styles.partnerName, disabled && styles.partnerNameDisabled]}>
                            {p.name} · {VEHICLE_LABELS[p.vehicleType] || p.vehicleType}
                            {p.isOwnFleet ? " · Your fleet" : ""}
                          </Text>
                          <View
                            style={[
                              styles.partnerStatusPill,
                              p.inFlight && styles.partnerStatusInFlight,
                              !p.inFlight && p.isOnline && styles.partnerStatusOnline,
                              !p.inFlight && !p.isOnline && styles.partnerStatusOffline,
                            ]}
                          >
                            <Text style={styles.partnerStatusText}>{statusLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.partnerPhone}>
                          {p.phone}
                          {p.distanceText ? ` · ${p.distanceText} away` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </>
        ) : null}
      </ModernSheet>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
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
  orderDetails: { marginTop: 12, gap: 4 },
  detailText: { fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
  detailLabel: { fontWeight: "700", color: theme.textPrimary },
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
  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  summaryCard: {
    backgroundColor: "rgba(30,143,177,0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 6 },
  summaryMeta: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  summaryLabel: { fontSize: 12, fontWeight: "700", color: theme.textPrimary, marginTop: 6, marginBottom: 4 },
  summaryItem: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  etaRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  etaUnit: { flex: 1 },
  etaUnitLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
  etaControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  etaBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(30,143,177,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  etaBtnText: { fontSize: 20, color: theme.textPrimary, lineHeight: 24 },
  etaValue: { fontSize: 18, fontWeight: "700", color: theme.textPrimary, minWidth: 30, textAlign: "center" },
  etaPreview: { fontSize: 13, marginBottom: 16, fontWeight: "700", color: theme.accent },
  etaHint: { fontSize: 12, color: theme.textMuted, marginBottom: 6, lineHeight: 17 },
  etaBase: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 12 },
  partnerRow: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  partnerRowSelected: { backgroundColor: theme.selectedTint, borderWidth: 2, borderColor: theme.accent },
  partnerRowDisabled: { opacity: 0.55, backgroundColor: "#F8FAFC" },
  partnerRowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  partnerName: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, flex: 1 },
  partnerNameDisabled: { color: theme.textMuted },
  partnerPhone: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  partnerHint: { fontSize: 12, color: theme.textMuted, marginBottom: 8, lineHeight: 17 },
  partnerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  partnerStatusOnline: { backgroundColor: "#DCFCE7" },
  partnerStatusInFlight: { backgroundColor: "#FEF3C7" },
  partnerStatusOffline: { backgroundColor: "#F3F4F6" },
  partnerStatusText: { fontSize: 10, fontWeight: "700", color: "#374151" },
});
