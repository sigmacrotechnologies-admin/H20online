import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OrderDetailsModal from "./OrderDetailsModal";

export default function TrackOrderModal({ visible, onClose, order }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!order) return null;

  const accepted = (order.supplierResponses || []).find((r) => r.status === "accepted");
  const riderPhone = accepted?.deliveryPartnerPhone;
  const riderName = accepted?.deliveryPartnerName;
  const eta = accepted?.eta;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Track your order</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            {accepted ? (
              <View style={styles.trackCard}>
                <Text style={styles.trackStatus}>Supplier accepted</Text>
                {eta ? <Text style={styles.trackEta}>ETA: {eta}</Text> : null}
                {accepted.remarks ? <Text style={styles.trackRemarks}>{accepted.remarks}</Text> : null}
                {riderName && <Text style={styles.trackRider}>Delivery partner: {riderName}</Text>}
                {riderPhone && <Text style={styles.trackRider}>Contact: {riderPhone}</Text>}
              </View>
            ) : (
              <View style={styles.trackCard}>
                <Text style={styles.trackPending}>Waiting for supplier to accept</Text>
              </View>
            )}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color="#9CA3AF" />
              <Text style={styles.mapText}>Map view (integrate later)</Text>
            </View>
            {riderPhone ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL("tel:" + riderPhone)} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Call rider</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setShowDetails(true)} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={22} color="#0EA5E9" />
              <Text style={styles.actionBtnOutlineText}>View order details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <OrderDetailsModal visible={showDetails} onClose={() => setShowDetails(false)} order={order} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#c6e2fa", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  trackCard: { backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 16, marginBottom: 16 },
  trackStatus: { fontSize: 16, fontWeight: "700", color: "#059669" },
  trackEta: { fontSize: 15, color: "#1B2B34", marginTop: 4 },
  trackRemarks: { fontSize: 14, color: "#6B7C85", marginTop: 4 },
  trackRider: { fontSize: 14, color: "#1B2B34", marginTop: 4 },
  trackPending: { fontSize: 15, color: "#6B7C85" },
  mapPlaceholder: { height: 180, backgroundColor: "#f0f7fcd7", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  mapText: { fontSize: 13, color: "#6B7C85", marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#0EA5E9", paddingVertical: 14, borderRadius: 14, marginBottom: 10 },
  actionBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  actionBtnOutline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#f0f7fcd7", paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: "#0EA5E9" },
  actionBtnOutlineText: { fontSize: 16, fontWeight: "600", color: "#0EA5E9" },
});
