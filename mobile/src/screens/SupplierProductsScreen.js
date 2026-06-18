import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Image, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  GradientButton,
  EmptyState,
  ModernSheet,
  SupplierPageHeader,
  ui,
} from "@/src/components/supplier/supplierUi";
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

  const inStockCount = products.filter((p) => p.inStock !== false).length;

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="cube-outline"
          title="My products"
          subtitle="Manage your product catalog"
          stats={[
            { icon: "pricetags-outline", label: "Products", value: String(products.length) },
            { icon: "checkmark-circle-outline", label: "In stock", value: String(inStockCount) },
            { icon: "layers-outline", label: "Total stock", value: String(totalStockAvailable) },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by product ID, name or type"
            placeholderTextColor={theme.textMuted}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title={products.length === 0 ? "No products yet" : "No matches found"}
            subtitle={products.length === 0 ? "Add products from your dashboard to get started." : "Try a different search term."}
          />
        ) : (
          <SectionCard icon="pricetags-outline" title="Your catalog" subtitle={`${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`}>
            {filteredProducts.map((p) => (
              <View key={p.id} style={styles.productCard}>
                <View style={styles.productTopRow}>
                  <Image
                    source={
                      p.imageUrl && PRODUCT_ASSET_MAP[p.imageUrl]
                        ? PRODUCT_ASSET_MAP[p.imageUrl]
                        : { uri: p.imageUrl || DEFAULT_PRODUCT_IMAGE }
                    }
                    style={styles.productImage}
                  />
                  <View style={styles.productTextWrap}>
                    <Text style={styles.productName}>{p.productName || p.name}</Text>
                    <Text style={styles.productMeta}>ID: {p.id}</Text>
                    <Text style={styles.productMeta}>
                      {(p.productType || "jar").toUpperCase()} • {p.capacityL || 20}L
                    </Text>
                    <Text style={styles.productPrice}>
                      ₹{Number(p.price || 0).toLocaleString()} • {p.priceUnit || ""}
                    </Text>
                    <View style={styles.productBadgeRow}>
                      <View style={[styles.stockBadge, p.inStock === false && styles.stockBadgeOut]}>
                        <Text style={[styles.stockBadgeText, p.inStock === false && styles.stockBadgeTextOut]}>
                          {p.inStock === false ? "Out of stock" : "In stock"}
                        </Text>
                      </View>
                      <Text style={styles.deliveryText}>{p.delivery || "20-30 min"}</Text>
                    </View>
                    <Text style={styles.stockQtyText}>Available stock: {Number(p.stockQty || 0)}</Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <GradientButton
                    label="Edit"
                    icon="create-outline"
                    onPress={() => openEdit(p)}
                    style={styles.actionBtn}
                  />
                  <GradientButton
                    label="Remove"
                    icon="trash-outline"
                    variant="danger"
                    onPress={() => handleRemove(p)}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ))}
          </SectionCard>
        )}
      </ScrollView>

      <ModernSheet
        visible={!!editing}
        title="Edit product"
        subtitle={editing?.productName || "Update product details"}
        icon="create-outline"
        onClose={() => setEditing(null)}
        footer={
          <GradientButton
            label={savingEdit ? "Saving..." : "Save changes"}
            icon="checkmark-circle-outline"
            onPress={saveEdit}
            disabled={savingEdit}
            loading={savingEdit}
          />
        }
      >
        {editing ? (
          <>
            <Text style={ui.inputLabel}>Product ID</Text>
            <Text style={styles.modalIdText}>{editing.id}</Text>
            <Text style={ui.inputLabel}>Product name</Text>
            <TextInput
              style={ui.input}
              value={editing.productName}
              onChangeText={(v) => setEditing((e) => ({ ...e, productName: v }))}
            />
            <Text style={ui.inputLabel}>Price</Text>
            <TextInput
              style={ui.input}
              value={editing.price}
              onChangeText={(v) => setEditing((e) => ({ ...e, price: v }))}
              keyboardType="decimal-pad"
            />
            <Text style={ui.inputLabel}>Price unit</Text>
            <TextInput
              style={ui.input}
              value={editing.priceUnit}
              onChangeText={(v) => setEditing((e) => ({ ...e, priceUnit: v }))}
            />
            <Text style={ui.inputLabel}>Delivery</Text>
            <TextInput
              style={ui.input}
              value={editing.delivery}
              onChangeText={(v) => setEditing((e) => ({ ...e, delivery: v }))}
            />
            <Text style={ui.inputLabel}>Capacity (L)</Text>
            <TextInput
              style={ui.input}
              value={editing.capacityL}
              onChangeText={(v) => setEditing((e) => ({ ...e, capacityL: v }))}
              keyboardType="number-pad"
            />
            <Text style={ui.inputLabel}>Available stock units</Text>
            <TextInput
              style={ui.input}
              value={editing.stockQty}
              onChangeText={(v) => setEditing((e) => ({ ...e, stockQty: v }))}
              keyboardType="number-pad"
            />
          </>
        ) : null}
      </ModernSheet>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.textPrimary, paddingVertical: 0 },
  productCard: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  productTopRow: { flexDirection: "row", alignItems: "flex-start" },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(30,143,177,0.08)",
    marginRight: 12,
  },
  productTextWrap: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "800", color: theme.textPrimary },
  productMeta: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  productPrice: { fontSize: 14, fontWeight: "700", color: theme.accent, marginTop: 6 },
  productBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  stockBadge: {
    backgroundColor: "rgba(15,118,110,0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockBadgeOut: { backgroundColor: "rgba(220,38,38,0.08)" },
  stockBadgeText: { fontSize: 11, fontWeight: "700", color: "#0F766E" },
  stockBadgeTextOut: { color: "#DC2626" },
  deliveryText: { fontSize: 11, color: theme.textMuted, fontWeight: "600" },
  stockQtyText: { fontSize: 12, color: "#0F766E", marginTop: 6, fontWeight: "700" },
  productActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
  modalIdText: { fontSize: 14, color: theme.textMuted, fontWeight: "600", marginBottom: 8 },
});
