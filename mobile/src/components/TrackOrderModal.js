import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OrderDetailsModal from "./OrderDetailsModal";

export default function TrackOrderModal({ visible, onClose, order }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!order) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Track your order</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color="#9CA3AF" />
              <Text style={styles.mapText}>Map view (integrate later)</Text>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {}} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Call rider</Text>
            </TouchableOpacity>
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
  mapPlaceholder: { height: 180, backgroundColor: "#f0f7fcd7", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  mapText: { fontSize: 13, color: "#6B7C85", marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#0EA5E9", paddingVertical: 14, borderRadius: 14, marginBottom: 10 },
  actionBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  actionBtnOutline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#f0f7fcd7", paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: "#0EA5E9" },
  actionBtnOutlineText: { fontSize: 16, fontWeight: "600", color: "#0EA5E9" },
});
