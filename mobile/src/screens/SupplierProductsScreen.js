import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image, Platform, StatusBar, Modal, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/400x300?text=H2O+Product";
const PRODUCT_ASSET_MAP = {
  "asset://water-camper": require("../../assets/images/Product-icon/Water-Camper.png"),
  "asset://water-bottle": require("../../assets/images/Product-icon/water-bottle.png"),
  "asset://plastic-bottle": require("../../assets/images/Product-icon/plastic-bottle.png"),
  "asset://gallon-bottle": require("../../assets/images/Product-icon/gallon-bottle.png"),
  "asset://gallon-1": require("../../assets/images/Product-icon/gallon (1).png"),
  "asset://gallon-2": require("../../assets/images/Product-icon/gallon2.png"),
  "asset://gallon-3": require("../../assets/images/Product-icon/gallon3.png"),
  "asset://water-dispenser": require("../../assets/images/Product-icon/water-dispenser.png"),
  "asset://tank-truck": require("../../assets/images/Product-icon/tank-truck.png"),
};

export default function SupplierProductsScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () => {
    setLoading(true);
    api.supplier.products().then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleRemove = (p) => {
    Alert.alert("Remove product", "Remove \"" + (p.productName || p.name) + "\"?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => api.products.delete(p.id).then(load).catch((e) => alert(e.message)) },
    ]);
  };

  const openEdit = (p) => {
    setEditing({
      id: p.id,
      productName: p.productName || "",
      productType: p.productType || "jar",
      price: String(p.price ?? ""),
      priceUnit: p.priceUnit || "20L Jar",
      delivery: p.delivery || "20-30 min",
      capacityL: String(p.capacityL ?? 20),
      stockQty: String(p.stockQty ?? 0),
    });
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    setSavingEdit(true);
    try {
      await api.products.update(editing.id, {
        productName: editing.productName.trim(),
        productType: editing.productType,
        price: Number(editing.price) || 0,
        priceUnit: editing.priceUnit,
        delivery: editing.delivery,
        capacityL: Number(editing.capacityL) || 20,
        stockQty: Math.max(0, Number(editing.stockQty) || 0),
      });
      setEditing(null);
      load();
    } catch (e) {
      alert(e.message || "Failed to update product");
    } finally {
      setSavingEdit(false);
    }
  };

  const normalizedQuery = (searchQuery || "").trim().toLowerCase();
  const filteredProducts = normalizedQuery
    ? products.filter((p) => {
        const idText = String(p?.id || "").toLowerCase();
        const nameText = String(p?.productName || p?.name || "").toLowerCase();
        const typeText = String(p?.productType || "").toLowerCase();
        return idText.includes(normalizedQuery) || nameText.includes(normalizedQuery) || typeText.includes(normalizedQuery);
      })
    : products;
  const totalStockAvailable = products.reduce((sum, p) => sum + Math.max(0, Number(p?.stockQty || 0)), 0);

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
              <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>My products</Text>
              <Text style={styles.headerSubtitle}>Manage your product catalog</Text>
            </View>
          </View>
          <View style={styles.topStatsRow}>
            <View style={styles.topStatCard}>
              <View style={styles.topStatIcon}>
                <Ionicons name="layers-outline" size={15} color="#065F46" />
              </View>
              <View style={styles.topStatTextWrap}>
                <Text style={styles.topStatLabel}>Total stock available</Text>
                <Text style={styles.topStatValue}>{totalStockAvailable}</Text>
              </View>
            </View>
            <View style={styles.topStatCard}>
              <View style={styles.topStatIcon}>
                <Ionicons name="cube-outline" size={15} color="#1D4ED8" />
              </View>
              <View style={styles.topStatTextWrap}>
                <Text style={styles.topStatLabel}>Total products</Text>
                <Text style={styles.topStatValue}>{products.length}</Text>
              </View>
            </View>
          </View>
          <View style={styles.topSearchRow}>
            <Ionicons name="search-outline" size={17} color="#6B7C85" />
            <TextInput
              style={styles.topSearchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by product ID, name or type"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </LinearGradient>
      </View>
      <View style={styles.contentSection}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} /> : (
          filteredProducts.length === 0 ? <Text style={styles.empty}>{products.length === 0 ? "No products. Add from dashboard." : "No product found for this search."}</Text> : (
            filteredProducts.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Image
                    source={
                      p.imageUrl && PRODUCT_ASSET_MAP[p.imageUrl]
                        ? PRODUCT_ASSET_MAP[p.imageUrl]
                        : { uri: p.imageUrl || DEFAULT_PRODUCT_IMAGE }
                    }
                    style={styles.cardImage}
                  />
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardName}>{p.productName || p.name}</Text>
                    <Text style={styles.cardMeta}>Product ID: {p.id}</Text>
                    <Text style={styles.cardMeta}>{(p.productType || "jar").toUpperCase()} • {p.capacityL || 20}L</Text>
                    <Text style={styles.cardPrice}>₹{Number(p.price || 0).toLocaleString()} • {p.priceUnit || ""}</Text>
                    <Text style={styles.cardMeta}>{p.inStock === false ? "Out of stock" : "In stock"} • {p.delivery || "20-30 min"}</Text>
                    <Text style={styles.stockText}>Available stock: {Number(p.stockQty || 0)}</Text>
                  </View>
                </View>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(p)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(p)}>
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
      </View>
      <Modal visible={!!editing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit product</Text>
              <TouchableOpacity onPress={() => setEditing(null)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            {editing ? (
              <>
                <Text style={styles.modalLabel}>Product ID</Text>
                <Text style={styles.modalIdText}>{editing.id}</Text>
                <Text style={styles.modalLabel}>Product name</Text>
                <TextInput style={styles.modalInput} value={editing.productName} onChangeText={(v) => setEditing((e) => ({ ...e, productName: v }))} />
                <Text style={styles.modalLabel}>Price</Text>
                <TextInput style={styles.modalInput} value={editing.price} onChangeText={(v) => setEditing((e) => ({ ...e, price: v }))} keyboardType="decimal-pad" />
                <Text style={styles.modalLabel}>Price unit</Text>
                <TextInput style={styles.modalInput} value={editing.priceUnit} onChangeText={(v) => setEditing((e) => ({ ...e, priceUnit: v }))} />
                <Text style={styles.modalLabel}>Delivery</Text>
                <TextInput style={styles.modalInput} value={editing.delivery} onChangeText={(v) => setEditing((e) => ({ ...e, delivery: v }))} />
                <Text style={styles.modalLabel}>Capacity (L)</Text>
                <TextInput style={styles.modalInput} value={editing.capacityL} onChangeText={(v) => setEditing((e) => ({ ...e, capacityL: v }))} keyboardType="number-pad" />
                <Text style={styles.modalLabel}>Available stock units</Text>
                <TextInput style={styles.modalInput} value={editing.stockQty} onChangeText={(v) => setEditing((e) => ({ ...e, stockQty: v }))} keyboardType="number-pad" />
                <TouchableOpacity style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]} onPress={saveEdit} disabled={savingEdit}>
                  <Text style={styles.saveBtnText}>{savingEdit ? "Saving..." : "Save changes"}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 330, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 18, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  topStatsRow: { marginTop: 14, flexDirection: "row", gap: 8 },
  topStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  topStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  topStatTextWrap: { flex: 1 },
  topStatLabel: { fontSize: 11, color: "#456173" },
  topStatValue: { fontSize: 14, fontWeight: "800", color: "#1B2B34", marginTop: 1 },
  topSearchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  topSearchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: "#1B2B34", paddingVertical: 0 },
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
  contentWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    elevation: 0,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  cardImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#E8F1F7", marginRight: 12 },
  cardTextWrap: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  cardMeta: { fontSize: 12, color: "#6B7C85", marginTop: 3 },
  cardPrice: { fontSize: 14, color: theme.primary, marginTop: 4 },
  stockText: { fontSize: 12, color: "#0F766E", marginTop: 4, fontWeight: "700" },
  cardActionsRow: { marginTop: 10, flexDirection: "row", gap: 12 },
  editBtn: { alignSelf: "flex-start", backgroundColor: "#E0F2FE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontSize: 13, color: "#0C4A6E", fontWeight: "700" },
  removeBtn: { alignSelf: "flex-start" },
  removeBtnText: { fontSize: 14, color: "#DC2626", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#1B2B34", marginBottom: 6, marginTop: 8 },
  modalInput: { backgroundColor: "#f0f7fc", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1B2B34" },
  modalIdText: { fontSize: 13, color: "#6B7C85", fontWeight: "600" },
  saveBtn: { marginTop: 16, backgroundColor: theme.primary, borderRadius: 14, alignItems: "center", paddingVertical: 14 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
