import React, { useState, useEffect } from "react";

import {

  View,

  Text,

  TouchableOpacity,

  StyleSheet,

  ScrollView,

  ActivityIndicator,

  RefreshControl,

  Alert,

} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";

import DeliveryScreenShell from "@/src/components/delivery/DeliveryScreenShell";

import {

  SectionCard,

  FilterChip,

  GradientButton,

  EmptyState,

  SupplierPageHeader,

  ui,

} from "@/src/components/supplier/supplierUi";

import { useDeliveryLocationSync, getLocationForPickup } from "@/src/hooks/useDeliveryLocationSync";

import { useDeliveryPartnerOnline } from "@/src/hooks/useDeliveryPartnerOnline";

import { theme } from "@/src/theme";



const TYPE_FILTERS = [

  { id: "all", label: "All" },

  { id: "instant", label: "Instant" },

  { id: "scheduled", label: "Scheduled" },

];



export default function DeliveryIncomingOrdersScreen() {

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actioningId, setActioningId] = useState(null);

  const [activeTypeFilter, setActiveTypeFilter] = useState("all");

  const { inFlight } = useDeliveryPartnerOnline();



  const fetchOrders = () => {

    return api.deliveryPartners.ordersIncoming()

      .then(setOrders)

      .catch(() => setOrders([]));

  };



  useEffect(() => {

    fetchOrders().finally(() => setLoading(false));

  }, []);



  const onRefresh = () => {

    setRefreshing(true);

    fetchOrders().finally(() => setRefreshing(false));

  };



  const handlePickedUp = (orderId) => {

    setActioningId(orderId);

    getLocationForPickup()

      .then((coords) => api.deliveryPartners.markPickedUp(orderId, coords || {}))

      .then(() => fetchOrders())

      .catch((e) => Alert.alert("Error", e.message || "Failed to update"))

      .finally(() => setActioningId(null));

  };



  const handleDelivered = (orderId) => {

    setActioningId(orderId);

    api.deliveryPartners.markDelivered(orderId)

      .then(() => fetchOrders())

      .catch((e) => Alert.alert("Error", e.message || "Failed to complete delivery"))

      .finally(() => setActioningId(null));

  };



  const formatDate = (d) => {

    if (!d) return "";

    const dt = new Date(d);

    return dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  };



  const instantOrders = orders.filter((o) => (o.orderType || "instant") === "instant");

  const scheduledOrders = orders.filter((o) => (o.orderType || "instant") === "scheduled");

  const visibleOrders =

    activeTypeFilter === "instant"

      ? instantOrders

      : activeTypeFilter === "scheduled"

        ? scheduledOrders

        : orders;



  const liveTrackingOrderIds = orders

    .filter((o) => o.supplierResponse?.deliveryStage === "picked_up" && o.status === "in_progress")

    .map((o) => o.id);

  useDeliveryLocationSync(liveTrackingOrderIds);



  const headerExtra = (

    <SupplierPageHeader

      icon="cart-outline"

      title="Incoming orders"

      subtitle="Pick up and complete assigned deliveries"

      stats={[

        { icon: "time-outline", label: "Active", value: String(orders.length), alert: orders.length > 0 },

        { icon: "flash-outline", label: "Instant", value: String(instantOrders.length) },

        { icon: "calendar-outline", label: "Scheduled", value: String(scheduledOrders.length) },

      ]}

    />

  );



  if (loading) {

    return (

      <DeliveryScreenShell showMenu tallHeader headerExtra={headerExtra}>

        <View style={styles.centered}>

          <ActivityIndicator size="large" color={theme.accent} />

        </View>

      </DeliveryScreenShell>

    );

  }



  return (

    <DeliveryScreenShell showMenu tallHeader headerExtra={headerExtra}>

      <ScrollView

        style={styles.scroll}

        contentContainerStyle={ui.scrollContent}

        showsVerticalScrollIndicator={false}

        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} />}

      >

        {inFlight ? (

          <View style={styles.inFlightBanner}>

            <Ionicons name="airplane-outline" size={18} color="#B45309" />

            <Text style={styles.inFlightText}>

              You are in flight on an active delivery. Complete it before suppliers can assign you again.

            </Text>

          </View>

        ) : null}



        <SectionCard icon="funnel-outline" title="Order type" subtitle="Filter by delivery timing">

          <View style={ui.filterRow}>

            {TYPE_FILTERS.map((f) => {

              const count =

                f.id === "instant" ? instantOrders.length : f.id === "scheduled" ? scheduledOrders.length : orders.length;

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



        {visibleOrders.length === 0 ? (

          <EmptyState

            icon="cart-outline"

            title="No incoming orders"

            subtitle="When suppliers assign orders to you, they will appear here. Completed orders are in Order history."

          />

        ) : (

          visibleOrders.map((o) => {

            const stage = o.supplierResponse?.deliveryStage || "accepted";

            const canPickedUp = stage === "accepted" && o.status === "in_progress";

            const canDeliver = stage === "picked_up" && o.status === "in_progress";

            const isDelivered = o.status === "delivered" || stage === "delivered";

            const busy = actioningId === o.id;



            return (

              <View key={o.id} style={styles.orderCard}>

                <View style={styles.cardRow}>

                  <Text style={styles.cardId}>Order #{o.id?.slice(-6) || "—"}</Text>

                  <View

                    style={[

                      styles.statusBadge,

                      isDelivered && styles.statusDelivered,

                      stage === "picked_up" && !isDelivered && styles.statusPickedUp,

                    ]}

                  >

                    <Text style={styles.statusText}>

                      {isDelivered ? "Delivered" : stage === "picked_up" ? "In flight" : "Assigned"}

                    </Text>

                  </View>

                </View>



                <Text style={styles.cardCustomer}>{o.customerName || o.customerEmail || "Customer"}</Text>



                <View

                  style={[

                    styles.orderTypePill,

                    (o.orderType || "instant") === "scheduled" ? styles.orderTypeScheduled : styles.orderTypeInstant,

                  ]}

                >

                  <Text style={styles.orderTypeText}>

                    {(o.orderType || "instant") === "scheduled" ? "Scheduled" : "Instant"}

                  </Text>

                </View>



                {o.address ? <Text style={styles.cardAddress} numberOfLines={2}>{o.address}</Text> : null}

                {o.supplierResponse?.eta ? <Text style={styles.cardEta}>ETA: {o.supplierResponse.eta}</Text> : null}

                <Text style={styles.cardTotal}>₹{o.total ?? 0}</Text>

                <Text style={styles.cardDate}>{formatDate(o.createdAt)}</Text>



                {!isDelivered && (

                  <View style={styles.actionSection}>

                    {canDeliver && (

                      <View style={styles.liveBanner}>

                        <View style={styles.liveDot} />

                        <Text style={styles.liveBannerText}>Live location sharing active</Text>

                      </View>

                    )}

                    {canPickedUp && (

                      <GradientButton

                        label={busy ? "Updating..." : "Order picked up"}

                        icon="cube-outline"

                        onPress={() => handlePickedUp(o.id)}

                        disabled={busy}

                        loading={busy}

                      />

                    )}

                    {canDeliver && (

                      <GradientButton

                        label={busy ? "Updating..." : "Complete delivery"}

                        icon="checkmark-done-outline"

                        onPress={() => handleDelivered(o.id)}

                        disabled={busy}

                        loading={busy}

                        style={{ marginTop: canPickedUp ? 0 : 10 }}

                      />

                    )}

                  </View>

                )}

              </View>

            );

          })

        )}

      </ScrollView>

    </DeliveryScreenShell>

  );

}



const styles = StyleSheet.create({

  scroll: { flex: 1 },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },

  inFlightBanner: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,

    backgroundColor: "#FFFBEB",

    borderRadius: 14,

    padding: 12,

    marginBottom: 16,

    borderWidth: 1,

    borderColor: "#FDE68A",

  },

  inFlightText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18, fontWeight: "600" },

  orderCard: {

    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    padding: 14,

    marginBottom: 12,

    borderWidth: 1,

    borderColor: "rgba(214,234,242,0.95)",

  },

  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

  cardId: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },

  statusBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  statusPickedUp: { backgroundColor: "#DBEAFE" },

  statusDelivered: { backgroundColor: "#D1FAE5" },

  statusText: { fontSize: 12, fontWeight: "600", color: "#92400E" },

  cardCustomer: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginBottom: 4 },

  orderTypePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },

  orderTypeInstant: { backgroundColor: "#FEE2E2" },

  orderTypeScheduled: { backgroundColor: "#DCFCE7" },

  orderTypeText: { fontSize: 11, fontWeight: "700", color: "#1F2937" },

  cardAddress: { fontSize: 13, color: theme.textMuted, marginBottom: 4, lineHeight: 18 },

  cardEta: { fontSize: 13, color: theme.accent, marginBottom: 4, fontWeight: "600" },

  cardTotal: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },

  cardDate: { fontSize: 12, color: theme.textMuted, marginTop: 4 },

  actionSection: { marginTop: 12, gap: 10 },

  liveBanner: {

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    paddingVertical: 8,

    paddingHorizontal: 10,

    borderRadius: 10,

    backgroundColor: "#DCFCE7",

  },

  liveBannerText: { fontSize: 12, fontWeight: "600", color: "#166534" },

  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },

});

