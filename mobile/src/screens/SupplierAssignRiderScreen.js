import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

const FLEET_OPTIONS = [{ key: "bicycle", label: "Bicycle" }, { key: "bike", label: "Bike" }, { key: "minivan", label: "Minivan" }, { key: "truck", label: "Truck" }, { key: "cycle", label: "Cycle" }, { key: "camper", label: "Camper" }];

export default function SupplierAssignRiderScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOrder, setModalOrder] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [fleetType, setFleetType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.supplier.ordersAccepted().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openModal = (order) => {
    setModalOrder(order);
    setSelectedPartnerId(order?.supplierResponse?.deliveryPartnerId?.toString() || null);
    setFleetType("");
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

  const handleAssign = async () => {
    if (!modalOrder?.id) return;
    setSubmitting(true);
    try {
      await api.supplier.assignRider(modalOrder.id, { deliveryPartnerId: selectedPartnerId || undefined });
      setModalOrder(null);
      load();
    } catch (e) {
      alert(e.message || "Failed to assign rider");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} style={StyleSheet.absoluteFill} />
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Assign rider</Text>
            <Text style={styles.headerSubtitle}>Assign delivery partner to orders</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#1EA7FD" style={{ marginTop: 24 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.empty}>No accepted orders to assign rider</Text>
        ) : (
          orders.map((o) => (
            <TouchableOpacity key={o.id} style={styles.card} onPress={() => openModal(o)} activeOpacity={0.8}>
              <Text style={styles.cardId}>#{o.id.slice(-6)}</Text>
              <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>
              <Text style={styles.cardTotal}>₹{Number(o.myTotal || o.total).toLocaleString()}</Text>
              {o.supplierResponse?.deliveryPartnerName ? (
                <Text style={styles.cardRider}>Rider: {o.supplierResponse.deliveryPartnerName}</Text>
              ) : (
                <Text style={styles.cardRiderNone}>No rider assigned</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <Modal visible={!!modalOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign delivery partner</Text>
              <TouchableOpacity onPress={() => setModalOrder(null)}><Ionicons name="close" size={28} color="#1B2B34" /></TouchableOpacity>
            </View>
            {modalOrder && (
              <>
                <Text style={styles.modalOrderInfo}>Order #{modalOrder.id.slice(-6)} • {modalOrder.customerName || modalOrder.customerEmail}</Text>
                <Text style={styles.modalLabel}>Fleet type (optional)</Text>
                <View style={styles.fleetRow}>
                  {FLEET_OPTIONS.map((f) => (
                    <TouchableOpacity key={f.key} style={[styles.fleetChip, fleetType === f.key && styles.fleetChipSelected]} onPress={() => loadPartnersByFleet(f.key)}>
                      <Text style={[styles.fleetChipText, fleetType === f.key && styles.fleetChipTextSelected]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {partners.length === 0 && !fleetType ? (
                  <Text style={styles.modalHint}>Select a fleet type or leave blank to see all partners</Text>
                ) : null}
                {partners.length > 0 && (
                  <>
                    <Text style={styles.modalLabel}>Select delivery partner</Text>
                    <ScrollView style={styles.partnerList}>
                      {partners.map((p) => (
                        <TouchableOpacity key={p.id} style={[styles.partnerRow, selectedPartnerId === p.id && styles.partnerRowSelected]} onPress={() => setSelectedPartnerId(selectedPartnerId === p.id ? null : p.id)}>
                          <Text style={styles.partnerName}>{p.name} • {p.vehicleType}</Text>
                          <Text style={styles.partnerPhone}>{p.phone}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                <TouchableOpacity style={[styles.assignBtn, submitting && styles.assignBtnDisabled]} onPress={handleAssign} disabled={submitting}>
                  <Text style={styles.assignBtnText}>{submitting ? "Saving..." : "Assign & notify customer"}</Text>
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
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  content: { flex: 1, padding: 20 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24, fontSize: 15 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardId: { fontSize: 12, color: "#6B7C85" },
  cardCustomer: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginTop: 4 },
  cardTotal: { fontSize: 15, color: "#0EA5E9", marginTop: 4 },
  cardRider: { fontSize: 13, color: "#059669", marginTop: 4 },
  cardRiderNone: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  modalOrderInfo: { fontSize: 14, color: "#6B7C85", marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  modalHint: { fontSize: 13, color: "#6B7C85", marginBottom: 12 },
  fleetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  fleetChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#E0F2FE" },
  fleetChipSelected: { backgroundColor: "#1EA7FD" },
  fleetChipText: { fontSize: 13, color: "#1B2B34" },
  fleetChipTextSelected: { color: "#FFF" },
  partnerList: { maxHeight: 180, marginBottom: 16 },
  partnerRow: { padding: 12, backgroundColor: "#f0f7fc", borderRadius: 12, marginBottom: 8 },
  partnerRowSelected: { backgroundColor: "#E0F2FE", borderWidth: 2, borderColor: "#1EA7FD" },
  partnerName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  partnerPhone: { fontSize: 13, color: "#6B7C85" },
  assignBtn: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 8 },
  assignBtnDisabled: { opacity: 0.7 },
  assignBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
