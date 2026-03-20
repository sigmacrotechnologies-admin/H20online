import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import { getOrderId, getOrderIdShort } from "@/src/utils/orderId";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function OrderDetailsModal({ visible, onClose, order }) {
  const { cancelOrder } = useCart();
  const [myReviews, setMyReviews] = useState(null); // { [productId]: { rating, comment } }
  const [loadingMyReviews, setLoadingMyReviews] = useState(false);
  const [submittingReviewProductId, setSubmittingReviewProductId] = useState(null);
  const [selectedRatings, setSelectedRatings] = useState({}); // { [productId]: rating }
  const [comments, setComments] = useState({}); // { [productId]: comment }
  const hasUserInteractedRef = useRef(false);
  const [debugPressCount, setDebugPressCount] = useState(0);
  const orderStatus = order?.status;
  const statusLabel = orderStatus === "cancelled" ? "Cancelled" : orderStatus === "in_progress" ? "In progress" : "Delivered";
  const orderIdDisplay = getOrderId(order);
  const orderMongoId = order?.id ?? order?._id;
  const isDelivered =
    orderStatus === "delivered" ||
    (Array.isArray(order?.supplierResponses) ? order.supplierResponses.some((r) => r?.deliveryStage === "delivered") : false);

  useEffect(() => {
    if (!visible || !isDelivered || !orderMongoId) return;
    let cancelled = false;
    hasUserInteractedRef.current = false;
    setDebugPressCount(0);
    setLoadingMyReviews(true);
    api.reviews
      .getMyOrderReviews(orderMongoId)
      .then((data) => {
        if (cancelled) return;
        const map = {};
        (Array.isArray(data) ? data : []).forEach((r) => {
          const pid = String(r.productId);
          map[pid] = { rating: r.rating, comment: r.comment || "" };
        });
        setMyReviews(map);

        // Initialize pickers from existing reviews.
        const nextRatings = {};
        const nextComments = {};
        Object.keys(map).forEach((pid) => {
          nextRatings[pid] = map[pid].rating;
          nextComments[pid] = map[pid].comment;
        });
        // Do not overwrite user's selection if they already started interacting.
        if (!hasUserInteractedRef.current) {
          setSelectedRatings(nextRatings);
          setComments(nextComments);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMyReviews({});
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingMyReviews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, isDelivered, orderMongoId]);

  const getPid = (item) => (item?.productId != null ? String(item.productId) : "");

  const handleSubmitReview = async (item) => {
    const productId = getPid(item);
    if (!productId) return;
    const rating = selectedRatings[productId];
    if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      alert("Please select star rating (1 to 5).");
      return;
    }

    setSubmittingReviewProductId(productId);
    try {
      const resp = await api.reviews.submit({
        orderId: orderMongoId,
        productId,
        rating,
        comment: comments[productId] || "",
      });

      const next = { ...(myReviews || {}) };
      next[productId] = { rating: resp.rating, comment: resp.comment || "" };
      setMyReviews(next);
    } catch (e) {
      alert(e?.message || "Failed to submit rating");
    } finally {
      setSubmittingReviewProductId(null);
    }
  };

  const RatingButtons = ({ value, onChange }) => {
    const current = Number(value) || 0;
    return (
      <View style={styles.ratingButtonsRow}>
        {[1, 2, 3, 4, 5].map((i) => {
          const active = current >= i;
          return (
            <Pressable
              key={i}
              onPress={() => {
                setDebugPressCount((c) => c + 1);
                onChange(i);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.ratingBtn,
                active && styles.ratingBtnActive,
                pressed && styles.ratingBtnPressed,
              ]}
            >
              <Text style={[styles.ratingBtnText, active && styles.ratingBtnTextActive]}>{i}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const handleCancel = () => {
    if (orderMongoId) cancelOrder(orderMongoId);
    onClose();
  };

  // Render guard (hooks are already called above).
  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Order details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
          </View>
          <View style={styles.scroll}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <Text style={styles.debugText}>Debug presses: {debugPressCount}</Text>
            <Text style={styles.orderId}>Order ID: {orderIdDisplay || getOrderIdShort(order)}</Text>
            <Text style={styles.date}>{new Date(order.date).toLocaleString()}</Text>
            <Text style={styles.sectionLabel}>Items</Text>
            {(order.items || []).map((item, idx) => {
              const pid = getPid(item);
              return (
                <View key={idx} style={styles.itemWrap}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.itemQty}>
                      × {item.qty || 1} — ₹{(item.price || 0) * (item.qty || 1)}
                    </Text>
                  </View>

                  {isDelivered ? (
                    <View style={styles.reviewBlock}>
                      <Text style={styles.reviewPrompt}>Rate this product</Text>
                      {loadingMyReviews ? null : myReviews && myReviews[pid] && (
                        <Text style={styles.yourReviewText}>Your rating: {myReviews[pid].rating}★</Text>
                      )}
                      <RatingButtons
                        value={selectedRatings[pid] || 0}
                        onChange={(r) => {
                          hasUserInteractedRef.current = true;
                          setSelectedRatings((p) => ({ ...p, [pid]: r }));
                        }}
                      />
                      <Text style={styles.selectedRatingHint}>
                        Selected rating: {selectedRatings[pid] || 0}/5
                      </Text>
                      <TextInput
                        style={styles.reviewInput}
                        value={comments[pid] || ""}
                        onChangeText={(t) => {
                          hasUserInteractedRef.current = true;
                          setComments((p) => ({ ...p, [pid]: t }));
                        }}
                        placeholder="Write feedback (optional)"
                        placeholderTextColor="#9CA3AF"
                        multiline
                      />
                      <TouchableOpacity
                        style={[
                          styles.reviewSubmitBtn,
                          submittingReviewProductId === pid && styles.reviewSubmitBtnDisabled,
                        ]}
                        onPress={() => handleSubmitReview(item)}
                        activeOpacity={0.8}
                        disabled={submittingReviewProductId === pid}
                      >
                        {submittingReviewProductId === pid ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.reviewSubmitBtnText}>
                            {myReviews && myReviews[pid] ? "Update rating" : "Submit rating"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{order.total}</Text>
            </View>
            {(order.supplierResponses || []).filter((r) => r.status === "accepted").length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Supplier & delivery</Text>
                {(order.supplierResponses || []).map((r, idx) => (
                  r.status === "accepted" && (
                    <View key={idx} style={styles.trackBlock}>
                      <Text style={styles.trackLabel}>
                        {r.deliveryStage === "delivered" ? "Delivered" : r.deliveryStage === "picked_up" ? "Picked up" : "Accepted by supplier"}
                      </Text>
                      {r.eta ? <Text style={styles.trackText}>ETA: {r.eta}</Text> : null}
                      {r.remarks ? <Text style={styles.trackText}>Remarks: {r.remarks}</Text> : null}
                      {r.deliveryPartnerName ? (
                        <Text style={styles.trackText}>Delivery partner: {r.deliveryPartnerName}{r.deliveryPartnerPhone ? " • " + r.deliveryPartnerPhone : ""}</Text>
                      ) : null}
                    </View>
                  )
                ))}
              </>
            )}
            <Text style={styles.addressLabel}>Delivery address</Text>
            <Text style={styles.address}>{order.address || "Current location"}</Text>
          </View>
          {order.status === "in_progress" && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  scroll: { maxHeight: 360 },
  debugText: { fontSize: 12, fontWeight: "700", color: theme.primary, marginBottom: 8 },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#E0F2FE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 10 },
  statusText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  orderId: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  date: { fontSize: 13, color: "#6B7C85", marginTop: 4, marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#6B7C85", marginBottom: 8 },
  itemWrap: { marginBottom: 12 },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }, // legacy (kept for safety)
  itemName: { flex: 1, fontSize: 14, color: "#1B2B34", paddingRight: 12 },
  itemQty: { fontSize: 14, color: "#6B7C85", fontWeight: "600", textAlign: "right" },
  reviewBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  reviewPrompt: { fontSize: 13, fontWeight: "700", color: "#059669", marginBottom: 8 },
  yourReviewText: { fontSize: 12, fontWeight: "700", color: "#6B7C85", marginBottom: 8 },
  ratingButtonsRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  ratingBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  ratingBtnActive: { backgroundColor: theme.primary },
  ratingBtnPressed: { opacity: 0.9 },
  ratingBtnText: { fontSize: 14, fontWeight: "800", color: "#6B7C85" },
  ratingBtnTextActive: { color: "#FFFFFF" },
  selectedRatingHint: { fontSize: 12, fontWeight: "700", color: theme.primary, marginBottom: 6 },
  reviewInput: {
    backgroundColor: "#f0f7fc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1B2B34",
    marginBottom: 10,
    minHeight: 44,
  },
  reviewSubmitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  reviewSubmitBtnDisabled: { opacity: 0.7 },
  reviewSubmitBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  totalValue: { fontSize: 16, fontWeight: "700", color: theme.primary },
  trackBlock: { backgroundColor: "#f0f7fc", borderRadius: 12, padding: 12, marginBottom: 12 },
  trackLabel: { fontSize: 14, fontWeight: "700", color: "#059669", marginBottom: 4 },
  trackText: { fontSize: 14, color: "#1B2B34", marginTop: 2 },
  addressLabel: { fontSize: 14, fontWeight: "600", color: "#6B7C85", marginTop: 16 },
  address: { fontSize: 14, color: "#1B2B34", marginTop: 4 },
  cancelBtn: { marginTop: 20, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 16, fontWeight: "600", color: "#EF4444" },
});
