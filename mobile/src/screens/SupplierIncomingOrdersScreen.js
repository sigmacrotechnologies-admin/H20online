import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

const FLEET_OPTIONS = [{ key: "bicycle", label: "Bicycle" }, { key: "bike", label: "Bike" }, { key: "minivan", label: "Minivan" }, { key: "truck", label: "Truck" }, { key: "cycle", label: "Cycle" }, { key: "camper", label: "Camper" }];

export default function SupplierIncomingOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOrder, setModalOrder] = useState(null);
  const [eta, setEta] = useState("");
  const [remarks, setRemarks] = useState("");
  const [fleetType, setFleetType] = useState("");
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.supplier.ordersIncoming().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(load);

  const openModal = (order) => {
    setModalOrder(order);
    setEta("");
    setRemarks("");
    setFleetType("");
    setSelectedPartnerId(null);
    setPartners([]);
    if (order) {
      api.deliveryPartners.list().then(setPartners).catch(() => setPartners([]));
    }
  };

  const loadPartnersByFleet = (type) => {
    setFleetType(type);
    setSelectedPartnerId(null);
    api.deliveryPartners.list(type).then(setPartners).catch(() => setPartners([]));
  };

  const handleAccept = async () => {
    if (!modalOrder?.id) return;
    setSubmitting(true);
    try {
      await api.supplier.acceptOrder(modalOrder.id, {
        eta: eta.trim(),
        remarks: remarks.trim(),
        requestedFleetType: fleetType || undefined,
        deliveryPartnerId: selectedPartnerId || undefined,
      });
      setModalOrder(null);
      load();
    } catch (e) {
      alert(e.message || "Failed to accept");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Incoming orders</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} /> : (
          orders.length === 0 ? (
            <Text style={styles.empty}>No pending orders</Text>
          ) : (
            orders.map((o) => (
              <TouchableOpacity key={o.id} style={styles.card} onPress={() => openModal(o)} activeOpacity={0.8}>
                <Text style={styles.cardId}>#{o.id.slice(-6)}</Text>
                <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
                <Text style={styles.cardTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
                <Text style={styles.cardItems}>{(o.myItems || o.items || []).length} item(s)</Text>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
      <Modal visible={!!modalOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Accept order</Text>
              <TouchableOpacity onPress={() => setModalOrder(null)}><Ionicons name="close" size={28} color="#1B2B34" /></TouchableOpacity>
            </View>
            {modalOrder && (
              <>
                <Text style={styles.modalLabel}>ETA (e.g. 30 min)</Text>
                <TextInput style={styles.input} value={eta} onChangeText={setEta} placeholder="30 min" placeholderTextColor="#9CA3AF" />
                <Text style={styles.modalLabel}>Remarks (shown to customer)</Text>
                <TextInput style={[styles.input, { minHeight: 60 }]} value={remarks} onChangeText={setRemarks} placeholder="Optional" placeholderTextColor="#9CA3AF" multiline />
                <Text style={styles.modalLabel}>Fleet type needed</Text>
                <View style={styles.fleetRow}>
                  {FLEET_OPTIONS.map((f) => (
                    <TouchableOpacity key={f.key} style={[styles.fleetChip, fleetType === f.key && styles.fleetChipSelected]} onPress={() => loadPartnersByFleet(f.key)}>
                      <Text style={[styles.fleetChipText, fleetType === f.key && styles.fleetChipTextSelected]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {partners.length > 0 && (
                  <>
                    <Text style={styles.modalLabel}>Assign delivery partner</Text>
                    <ScrollView style={{ maxHeight: 120 }}>
                      {partners.map((p) => (
                        <TouchableOpacity key={p.id} style={[styles.partnerRow, selectedPartnerId === p.id && styles.partnerRowSelected]} onPress={() => setSelectedPartnerId(selectedPartnerId === p.id ? null : p.id)}>
                          <Text style={styles.partnerName}>{p.name} • {p.vehicleType}</Text>
                          <Text style={styles.partnerPhone}>{p.phone}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                <TouchableOpacity style={[styles.acceptBtn, submitting && styles.acceptBtnDisabled]} onPress={handleAccept} disabled={submitting}>
                  <Text style={styles.acceptBtnText}>{submitting ? "Saving..." : "Accept & send to customer"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  content: { flex: 1 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardId: { fontSize: 12, color: "#6B7C85" },
  cardCustomer: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginTop: 4 },
  cardTotal: { fontSize: 15, color: theme.primary, marginTop: 4 },
  cardItems: { fontSize: 13, color: "#6B7C85", marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  fleetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  fleetChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.selectedTint },
  fleetChipSelected: { backgroundColor: theme.primary },
  fleetChipText: { fontSize: 13, color: "#1B2B34" },
  fleetChipTextSelected: { color: "#FFF" },
  partnerRow: { padding: 12, backgroundColor: "#f0f7fc", borderRadius: 12, marginBottom: 8 },
  partnerRowSelected: { backgroundColor: theme.selectedTint, borderWidth: 2, borderColor: theme.primary },
  partnerName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  partnerPhone: { fontSize: 13, color: "#6B7C85" },
  acceptBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 16 },
  acceptBtnDisabled: { opacity: 0.7 },
  acceptBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
