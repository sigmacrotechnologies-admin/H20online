import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, TextInput, ActivityIndicator, Image, Platform, StatusBar, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

const VEHICLE_LABELS = {
  bicycle: "Bicycle",
  bike: "Bike",
  van: "Van",
  tanker: "Tanker",
  miniTruck: "Mini Truck",
};

export default function SupplierIncomingOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOrder, setModalOrder] = useState(null);
  const [etaHours, setEtaHours] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [remarks, setRemarks] = useState("");
  const [fleetType, setFleetType] = useState("");
  const [allPartners, setAllPartners] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(() => {
    setLoading(true);
    api.supplier.ordersIncoming().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(load);

  const openModal = (order) => {
    setModalOrder(order);
    setEtaHours(0);
    setEtaMinutes(30);
    setRemarks("");
    setFleetType("");
    setSelectedPartnerId(null);
    setAllPartners([]);
    setPartners([]);
    if (order) {
      api.deliveryPartners
        .list()
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

  const adjustEtaHours = (delta) => setEtaHours((prev) => Math.min(24, Math.max(0, prev + delta)));
  const adjustEtaMinutes = (delta) => setEtaMinutes((prev) => Math.min(55, Math.max(0, prev + delta)));
  const etaDisplay = `${etaHours}h ${etaMinutes}m`;

  const handleAccept = async () => {
    if (!modalOrder?.id) return;
    if (!etaDisplay || !/^\d{1,2}h\s+[0-5]?\dm$/i.test(etaDisplay)) {
      alert("Please select a valid ETA.");
      return;
    }
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
    setSubmitting(true);
    try {
      await api.supplier.acceptOrder(modalOrder.id, {
        eta: etaDisplay,
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
              <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Incoming orders</Text>
              <Text style={styles.headerSubtitle}>Accept orders and assign delivery partner</Text>
            </View>
          </View>
          <View style={styles.headerTypeTilesRow}>
            <TouchableOpacity
              style={[styles.headerTypeTile, activeTypeFilter === "instant" && styles.headerTypeTileActive]}
              onPress={() => setActiveTypeFilter("instant")}
              activeOpacity={0.85}
            >
              <View style={styles.headerTypeTileTop}>
                <Text style={[styles.headerTypeTileTitle, activeTypeFilter === "instant" && styles.headerTypeTileTitleActive]}>Instant order</Text>
                {instantOrders.length > 0 ? <View style={styles.headerLiveDot} /> : null}
              </View>
              <Text style={[styles.headerTypeTileCount, activeTypeFilter === "instant" && styles.headerTypeTileCountActive]}>{instantOrders.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerTypeTile, activeTypeFilter === "scheduled" && styles.headerTypeTileActive]}
              onPress={() => setActiveTypeFilter("scheduled")}
              activeOpacity={0.85}
            >
              <View style={styles.headerTypeTileTop}>
                <Text style={[styles.headerTypeTileTitle, activeTypeFilter === "scheduled" && styles.headerTypeTileTitleActive]}>Schedule for later</Text>
                {scheduledOrders.length > 0 ? <View style={[styles.headerLiveDot, { backgroundColor: "#22C55E" }]} /> : null}
              </View>
              <Text style={[styles.headerTypeTileCount, activeTypeFilter === "scheduled" && styles.headerTypeTileCountActive]}>{scheduledOrders.length}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} /> : (
          visibleOrders.length === 0 ? (
            <Text style={styles.empty}>No pending orders</Text>
          ) : (
            visibleOrders.map((o) => (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardLeftCol}>
                    <Text style={styles.cardId}>#{o.id.slice(-6)}</Text>
                    <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
                  </View>
                  <View style={styles.cardRightCol}>
                    <Text style={styles.cardTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
                    <Text style={styles.cardItems}>{(o.myItems || o.items || []).length} item(s)</Text>
                  </View>
                </View>
                <View style={[styles.orderTypePill, (o.orderType || "instant") === "scheduled" ? styles.orderTypeScheduled : styles.orderTypeInstant]}>
                  <Text style={styles.orderTypeText}>{(o.orderType || "instant") === "scheduled" ? "Scheduled" : "Instant"}</Text>
                </View>
                <Text style={styles.cardProducts} numberOfLines={2}>
                  Products: {getProductNames(o).length ? getProductNames(o).join(", ") : "—"}
                </Text>
                <Text style={styles.cardReceiver} numberOfLines={1}>
                  Receiver: {o.receiverName || "N/A"} {o.receiverPhone ? `• ${o.receiverPhone}` : ""}
                </Text>
                <Text style={styles.cardAddress} numberOfLines={2}>
                  Address: {o.address || "N/A"}
                </Text>
                <Text style={styles.cardMeta}>Date: {formatOrderDate(o.createdAt)} • Time: {formatOrderTime(o.createdAt)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(o.id)}>
                    <Text style={[styles.actionBtnText, styles.rejectBtnText]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.acceptActionBtn]} onPress={() => openModal(o)}>
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
      </View>
      <Modal visible={!!modalOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Accept order</Text>
              <TouchableOpacity onPress={() => setModalOrder(null)}><Ionicons name="close" size={28} color="#1B2B34" /></TouchableOpacity>
            </View>
            {modalOrder && (
              <>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  <View style={styles.orderSummaryCard}>
                    <Text style={styles.orderSummaryTitle}>Order details</Text>
                    <Text style={styles.orderSummaryMeta}>Date: {formatOrderDate(modalOrder.createdAt)} • Time: {formatOrderTime(modalOrder.createdAt)}</Text>
                    <Text style={styles.orderSummaryMeta}>Customer: {modalOrder.customerName || modalOrder.customerEmail || "Customer"}</Text>
                    <Text style={styles.orderSummaryMeta}>Total: ₹{Number(modalOrder.myTotal || modalOrder.total).toLocaleString()}</Text>
                    <Text style={styles.orderSummaryLabel}>Products</Text>
                    {(modalOrder.myItems?.length ? modalOrder.myItems : modalOrder.items || []).map((item, idx) => (
                      <Text key={`${item.productName || "item"}-${idx}`} style={styles.orderSummaryItem}>
                        {idx + 1}. {item.productName || "Product"} x {item.qty || 1}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.modalLabel}>ETA (hours and minutes) *</Text>
                  <View style={styles.etaRow}>
                    <View style={styles.etaUnit}>
                      <Text style={styles.etaUnitLabel}>Hours</Text>
                      <View style={styles.etaControl}>
                        <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaHours(-1)}><Text style={styles.etaBtnText}>-</Text></TouchableOpacity>
                        <Text style={styles.etaValue}>{etaHours}</Text>
                        <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaHours(1)}><Text style={styles.etaBtnText}>+</Text></TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.etaUnit}>
                      <Text style={styles.etaUnitLabel}>Minutes</Text>
                      <View style={styles.etaControl}>
                        <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaMinutes(-5)}><Text style={styles.etaBtnText}>-</Text></TouchableOpacity>
                        <Text style={styles.etaValue}>{etaMinutes}</Text>
                        <TouchableOpacity style={styles.etaBtn} onPress={() => adjustEtaMinutes(5)}><Text style={styles.etaBtnText}>+</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.etaPreview}>{etaDisplay}</Text>
                  <Text style={styles.modalLabel}>Remarks (shown to customer) *</Text>
                  <TextInput style={[styles.input, { minHeight: 60 }]} value={remarks} onChangeText={setRemarks} placeholder="Required remarks" placeholderTextColor="#9CA3AF" multiline />
                  <Text style={styles.modalLabel}>Fleet type needed *</Text>
                  <View style={styles.fleetRow}>
                    {availableFleetOptions.map((f) => (
                      <TouchableOpacity key={f.key} style={[styles.fleetChip, fleetType === f.key && styles.fleetChipSelected]} onPress={() => loadPartnersByFleet(f.key)}>
                        <Text style={[styles.fleetChipText, fleetType === f.key && styles.fleetChipTextSelected]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {partners.length > 0 && (
                    <>
                      <Text style={styles.modalLabel}>Assign delivery partner *</Text>
                      <ScrollView style={{ maxHeight: 180 }}>
                        {partners.map((p) => (
                          <TouchableOpacity key={p.id} style={[styles.partnerRow, selectedPartnerId === p.id && styles.partnerRowSelected]} onPress={() => setSelectedPartnerId(selectedPartnerId === p.id ? null : p.id)}>
                            <Text style={styles.partnerName}>{p.name} • {p.vehicleType}</Text>
                            <Text style={styles.partnerPhone}>{p.phone}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={[styles.acceptBtn, submitting && styles.acceptBtnDisabled]} onPress={handleAccept} disabled={submitting}>
                    <Text style={styles.acceptBtnText}>{submitting ? "Saving..." : "Accept & send to customer"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 300, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 20, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  contentSection: {
    marginTop: -16,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    flex: 1,
    overflow: "hidden",
  },
  content: { flex: 1 },
  headerTypeTilesRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  headerTypeTile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },
  headerTypeTileActive: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  headerTypeTileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTypeTileTitle: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.95)" },
  headerTypeTileTitleActive: { color: "#FFFFFF" },
  headerTypeTileCount: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", marginTop: 8 },
  headerTypeTileCountActive: { color: "#FFFFFF" },
  headerLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
  contentWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeftCol: { flex: 1, paddingRight: 10 },
  cardRightCol: { minWidth: 92, alignItems: "flex-end" },
  cardId: { fontSize: 12, color: "#6B7C85" },
  cardCustomer: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginTop: 4 },
  cardTotal: { fontSize: 15, fontWeight: "700", color: theme.primary, marginTop: 2 },
  cardItems: { fontSize: 12, color: "#6B7C85", marginTop: 3 },
  orderTypePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  orderTypeInstant: { backgroundColor: "#FEE2E2" },
  orderTypeScheduled: { backgroundColor: "#DCFCE7" },
  orderTypeText: { fontSize: 11, fontWeight: "700", color: "#1F2937" },
  cardMeta: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  cardProducts: { fontSize: 12, color: "#435866", marginTop: 8 },
  cardReceiver: { fontSize: 12, color: "#435866", marginTop: 5 },
  cardAddress: { fontSize: 12, color: "#435866", marginTop: 4 },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 10 },
  actionBtn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  actionBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  rejectBtn: { backgroundColor: "#FEE2E2" },
  rejectBtnText: { color: "#B91C1C" },
  acceptActionBtn: { backgroundColor: theme.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingBottom: 8 },
  orderSummaryCard: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 12, marginBottom: 14 },
  orderSummaryTitle: { fontSize: 14, fontWeight: "700", color: "#1B2B34", marginBottom: 6 },
  orderSummaryMeta: { fontSize: 12, color: "#435866", marginBottom: 2 },
  orderSummaryLabel: { fontSize: 12, fontWeight: "700", color: "#1B2B34", marginTop: 6, marginBottom: 4 },
  orderSummaryItem: { fontSize: 12, color: "#435866", marginBottom: 2 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  etaRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  etaUnit: { flex: 1 },
  etaUnitLabel: { fontSize: 12, color: "#6B7C85", marginBottom: 6 },
  etaControl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0f7fc", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  etaBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E2ECF3", alignItems: "center", justifyContent: "center" },
  etaBtnText: { fontSize: 20, color: "#1B2B34", lineHeight: 24 },
  etaValue: { fontSize: 18, fontWeight: "700", color: "#1B2B34", minWidth: 30, textAlign: "center" },
  etaPreview: { fontSize: 13, color: "#4B5563", marginBottom: 16 },
  fleetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  fleetChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.selectedTint },
  fleetChipSelected: { backgroundColor: theme.primary },
  fleetChipText: { fontSize: 13, color: "#1B2B34" },
  fleetChipTextSelected: { color: "#FFF" },
  partnerRow: { padding: 12, backgroundColor: "#f0f7fc", borderRadius: 12, marginBottom: 8 },
  partnerRowSelected: { backgroundColor: theme.selectedTint, borderWidth: 2, borderColor: theme.primary },
  partnerName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  partnerPhone: { fontSize: 13, color: "#6B7C85" },
  modalFooter: { paddingTop: 10, paddingBottom: 14 },
  acceptBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 16 },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
