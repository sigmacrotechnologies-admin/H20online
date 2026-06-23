import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { ui } from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

const SCHEDULE_FILTERS = [
  { key: "all", label: "Total" },
  { key: "today", label: "Today's orders" },
  { key: "this_week", label: "This week" },
];

function getTimeOptions() {
  const options = [];
  for (const ampm of ["AM", "PM"]) {
    for (let h = 1; h <= 12; h++) {
      for (const m of ["00", "15", "30", "45"]) {
        options.push({ value: `${h}:${m} ${ampm}`, label: `${h}:${m} ${ampm}` });
      }
    }
  }
  return options;
}
const TIME_OPTIONS = getTimeOptions();

export default function DeliverySubscriptionOrdersScreen() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [timeRangeStart, setTimeRangeStart] = useState("");
  const [timeRangeEnd, setTimeRangeEnd] = useState("");
  const [showTimeStartModal, setShowTimeStartModal] = useState(false);
  const [showTimeEndModal, setShowTimeEndModal] = useState(false);

  const fetchSubscriptions = useCallback(() => {
    const params = {};
    if (scheduleFilter !== "all") params.scheduleFilter = scheduleFilter;
    if (timeRangeStart && timeRangeEnd) {
      params.timeRangeStart = timeRangeStart;
      params.timeRangeEnd = timeRangeEnd;
    }
    return api.deliveryPartners.subscriptions(params).then(setSubscriptions).catch(() => setSubscriptions([]));
  }, [scheduleFilter, timeRangeStart, timeRangeEnd]);

  useEffect(() => {
    setLoading(true);
    fetchSubscriptions().finally(() => setLoading(false));
  }, [fetchSubscriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <DeliveryPartnerLayout title="Subscription orders" subtitle="Your assigned subscription deliveries" icon="repeat-outline">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </DeliveryPartnerLayout>
    );
  }

  return (
    <DeliveryPartnerLayout title="Subscription orders" subtitle="Your assigned subscription deliveries" icon="repeat-outline">
      <View style={styles.pagePad}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Schedule</Text>
          <View style={styles.filterChips}>
            {SCHEDULE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, scheduleFilter === f.key && styles.filterChipSelected]}
                onPress={() => setScheduleFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, scheduleFilter === f.key && styles.filterChipTextSelected]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Time range (optional)</Text>
          <View style={styles.timeRangeRow}>
            <TouchableOpacity style={styles.timeRangeBtn} onPress={() => setShowTimeStartModal(true)} activeOpacity={0.8}>
              <Text style={styles.timeRangeBtnText}>{timeRangeStart || "From"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeRangeBtn} onPress={() => setShowTimeEndModal(true)} activeOpacity={0.8}>
              <Text style={styles.timeRangeBtnText}>{timeRangeEnd || "To"}</Text>
            </TouchableOpacity>
            {(timeRangeStart || timeRangeEnd) && (
              <TouchableOpacity style={styles.clearTimeBtn} onPress={() => { setTimeRangeStart(""); setTimeRangeEnd(""); }} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={20} color="#6B7C85" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Modal visible={showTimeStartModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimeStartModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>From</Text>
                <TouchableOpacity onPress={() => setShowTimeStartModal(false)}><Ionicons name="close" size={24} color="#6B7C85" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {TIME_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[styles.modalItem, timeRangeStart === opt.value && styles.modalItemSelected]} onPress={() => { setTimeRangeStart(opt.value); setShowTimeStartModal(false); }} activeOpacity={0.8}>
                    <Text style={styles.modalItemText}>{opt.label}</Text>
                    {timeRangeStart === opt.value && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
        <Modal visible={showTimeEndModal} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimeEndModal(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>To</Text>
                <TouchableOpacity onPress={() => setShowTimeEndModal(false)}><Ionicons name="close" size={24} color="#6B7C85" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {TIME_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[styles.modalItem, timeRangeEnd === opt.value && styles.modalItemSelected]} onPress={() => { setTimeRangeEnd(opt.value); setShowTimeEndModal(false); }} activeOpacity={0.8}>
                    <Text style={styles.modalItemText}>{opt.label}</Text>
                    {timeRangeEnd === opt.value && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={ui.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
          {subscriptions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="repeat-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No subscription orders</Text>
              <Text style={styles.emptySub}>
                {scheduleFilter !== "all" || (timeRangeStart && timeRangeEnd) ? "No orders match the selected filter or time range." : "When admin assigns subscription deliveries to you, they will appear here. Try Today's orders or This week to see scheduled deliveries."}
              </Text>
            </View>
          ) : (
            subscriptions.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardId}>{s.subscriptionId || s.id}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{s.frequency}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Ionicons name="time-outline" size={16} color="#6B7C85" />
                  <Text style={styles.cardTime}>{s.preferredDeliveryTime || "—"}</Text>
                </View>
                <Text style={styles.cardCustomer}>{s.customerName || s.customerEmail || "Customer"}</Text>
                <Text style={styles.cardLabel}>Delivery address</Text>
                <Text style={styles.cardAddress}>{s.deliveryAddress || "—"}</Text>
                <Text style={styles.cardLabel}>Subscription type · Product</Text>
                <Text style={styles.cardProduct}>{s.frequency} · {s.productLabel || s.planName}</Text>
                {s.quantity > 1 && <Text style={styles.cardMeta}>Qty: {s.quantity}</Text>}
                {(s.pickupHubName || s.pickupHubAddress) ? (
                  <>
                    <Text style={styles.cardLabel}>Pickup hub</Text>
                    <Text style={styles.cardHub}>{s.pickupHubName}{s.pickupHubAddress ? ` — ${s.pickupHubAddress}` : ""}</Text>
                  </>
                ) : null}
                {s.selectedDates?.length > 0 && (
                  <Text style={styles.cardMeta}>Delivery dates: {s.selectedDates.slice(0, 3).join(", ")}{s.selectedDates.length > 3 ? "…" : ""}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </DeliveryPartnerLayout>
  );
}

const styles = StyleSheet.create({
  pagePad: { paddingHorizontal: 20, paddingTop: 24, flex: 1 },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterSection: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, padding: 12, marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#6B7C85", marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#E5E7EB" },
  filterChipSelected: { backgroundColor: theme.primary },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  filterChipTextSelected: { color: "#FFF" },
  timeRangeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeRangeBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f0f7fcd7", borderWidth: 1, borderColor: "#E5E7EB" },
  timeRangeBtnText: { fontSize: 14, color: "#1B2B34" },
  clearTimeBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 320 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  modalScroll: { maxHeight: 260 },
  modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16 },
  modalItemSelected: { backgroundColor: "#E0F2FE" },
  modalItemText: { fontSize: 16, color: "#1B2B34" },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7C85", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center", paddingHorizontal: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  typeBadge: { backgroundColor: "#E0F2FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: "600", color: theme.primary },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  cardTime: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  cardCustomer: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 6 },
  cardLabel: { fontSize: 12, color: "#6B7C85", marginTop: 6, marginBottom: 2 },
  cardAddress: { fontSize: 13, color: "#1B2B34", marginBottom: 4 },
  cardProduct: { fontSize: 14, color: "#1B2B34", fontWeight: "600" },
  cardHub: { fontSize: 13, color: theme.primary, marginTop: 2 },
  cardMeta: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
});
