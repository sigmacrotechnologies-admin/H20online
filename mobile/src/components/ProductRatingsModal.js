import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

function Stars({ value, size = 16 }) {
  const rounded = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rounded ? "star" : "star-outline"} size={size} color={i <= rounded ? "#EAB308" : "#9CA3AF"} />
      ))}
    </View>
  );
}

export default function ProductRatingsModal({ visible, onClose, product }) {
  const productId = product?.id;
  const productName = product?.productName || "";
  const supplierName = product?.supplierName || "";

  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);

  const fetchReviews = () => {
    if (!productId) return;
    setLoading(true);
    api.reviews.listForProduct(productId)
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (visible) fetchReviews();
  }, [visible, productId]);

  const totalReviews = product?.reviewCount != null ? String(product.reviewCount) : String(reviews.length);
  const avgRating = product?.rating != null ? Number(product.rating) : null;

  const headerSummary = useMemo(() => {
    if (avgRating == null) return null;
    return (
      <View style={styles.summaryRow}>
        <Stars value={avgRating} size={18} />
        <Text style={styles.summaryText}>
          {avgRating.toFixed(1)} · {totalReviews} Reviews
        </Text>
      </View>
    );
  }, [avgRating, totalReviews]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Product ratings</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#1B2B34" />
            </TouchableOpacity>
          </View>

          {productName ? (
            <View style={styles.productBlock}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {productName}
              </Text>
              {supplierName ? <Text style={styles.productSub} numberOfLines={1}>{supplierName}</Text> : null}
            </View>
          ) : null}

          {headerSummary}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="star-outline" size={52} color="#9CA3AF" />
                <Text style={styles.emptyText}>No ratings yet</Text>
              </View>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <Stars value={r.rating} size={16} />
                    <Text style={styles.userName}>{r.userName || "Customer"}</Text>
                  </View>
                  <Text style={styles.reviewDate}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </Text>
                  {r.comment ? <Text style={styles.commentText}>{r.comment}</Text> : null}
                </View>
              ))
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.description}>
            <Text style={styles.descLabel}>Product description</Text>
            <Text style={styles.descText}>
              {productName ? `${productName}` : "—"} {supplierName ? `• ${supplierName}` : ""}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },

  productBlock: { marginBottom: 10 },
  productTitle: { fontSize: 16, fontWeight: "800", color: "#1B2B34" },
  productSub: { fontSize: 13, color: "#6B7C85", marginTop: 2 },

  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  summaryText: { fontSize: 14, color: "#6B7C85", fontWeight: "600" },

  scroll: { flexGrow: 0 },

  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  emptyWrap: { paddingVertical: 50, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#6B7C85", marginTop: 12, fontWeight: "600" },

  reviewCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  userName: { fontSize: 13, color: "#1B2B34", fontWeight: "700" },
  reviewDate: { fontSize: 12, color: "#9CA3AF", marginBottom: 6 },
  commentText: { fontSize: 14, color: "#1B2B34", fontWeight: "600" },

  description: { paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 6 },
  descLabel: { fontSize: 13, color: "#6B7C85", fontWeight: "700", marginBottom: 6 },
  descText: { fontSize: 14, color: "#1B2B34", fontWeight: "700" },
});

