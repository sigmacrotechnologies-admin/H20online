import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & set ETA", icon: "cart-outline", route: "supplier-incoming-orders", badge: true },
  { key: "history", title: "Order history", subtitle: "Past orders & filters", icon: "time-outline", route: "supplier-order-history" },
  { key: "products", title: "My products", subtitle: "Add or remove products", icon: "cube-outline", route: "supplier-products" },
  { key: "addProduct", title: "Add product", subtitle: "New product to catalog", icon: "add-circle-outline", route: "supplier-dashboard", action: "addProduct" },
  { key: "financials", title: "Financials", subtitle: "Revenue & 30% deduction", icon: "wallet-outline", route: "supplier-financials" },
  { key: "support", title: "Support", subtitle: "Message admin", icon: "chatbubble-ellipses-outline", route: "supplier-support" },
];

const SupplierDashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    api.supplier.ordersIncoming().then((list) => setIncomingCount(list?.length || 0)).catch(() => {});
  }, []);

  const handleTilePress = (tile) => {
    if (tile.action === "addProduct") {
      setShowAddProduct(true);
      return;
    }
    if (tile.route && tile.route !== "supplier-dashboard") {
      router.push("/" + tile.route);
    }
  };

  if (showAddProduct) {
    return (
      <SupplierAddProductView onClose={() => setShowAddProduct(false)} onAdded={() => setShowAddProduct(false)} />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPanel}>
          <LinearGradient
            colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerRow}>
              <BackButton onPress={() => router.back()} />
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Supplier Dashboard</Text>
                <Text style={styles.welcomeText}>{user?.name || "Supplier"}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const count = tile.badge ? incomingCount : null;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tile}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tileIconWrap}>
                    <Ionicons name={tile.icon} size={32} color="#1EA7FD" />
                    {count != null && count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PRICE_UNITS = ["20L Jar", "1L Bottle", "5L Can", "500ml", "Bulk"];
const BADGES = ["", "subscription", "premium"];

function SupplierAddProductView({ onClose, onAdded }) {
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("20L Jar");
  const [delivery, setDelivery] = useState("20-30 min");
  const [inStock, setInStock] = useState(true);
  const [capacityL, setCapacityL] = useState("20");
  const [categories, setCategories] = useState("");
  const [badge, setBadge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");
    const nameTrim = productName.trim();
    const priceNum = parseFloat(price);
    if (!nameTrim) { setError("Product name is required"); return; }
    if (isNaN(priceNum) || priceNum < 0) { setError("Valid price required"); return; }
    setLoading(true);
    try {
      await api.products.create({
        productName: nameTrim,
        price: priceNum,
        priceUnit: priceUnit || "20L Jar",
        delivery: delivery.trim() || "20-30 min",
        inStock,
        capacityL: parseInt(capacityL, 10) || 20,
        categories: categories.trim() ? categories.split(",").map((s) => s.trim()).filter(Boolean) : [],
        badge: badge || "",
        rating: 4,
        reviewCount: "0",
      });
      onAdded();
    } catch (err) {
      setError(err.message || "Failed to add");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerPanel}>
          <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
            <View style={styles.headerRow}>
              <BackButton onPress={onClose} />
              <View style={styles.headerCenter}><Text style={styles.headerTitle}>Add product</Text></View>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>
        </View>
        <View style={styles.contentPanel}>
          <Text style={styles.label}>Product name *</Text>
          <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Pure Water 20L" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Price unit</Text>
          <TextInput style={styles.input} value={priceUnit} onChangeText={setPriceUnit} placeholder="20L Jar" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Delivery (e.g. 20-30 min)</Text>
          <TextInput style={styles.input} value={delivery} onChangeText={setDelivery} placeholder="20-30 min" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Capacity (L)</Text>
          <TextInput style={styles.input} value={capacityL} onChangeText={setCapacityL} placeholder="20" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Categories (comma-separated)</Text>
          <TextInput style={styles.input} value={categories} onChangeText={setCategories} placeholder="drinking, mineral" placeholderTextColor="#9CA3AF" />
          <View style={styles.checkRow}>
            <TouchableOpacity onPress={() => setInStock(!inStock)} style={styles.checkRow}>
              <View style={[styles.checkbox, inStock && styles.checkboxChecked]}>{inStock ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}</View>
              <Text style={styles.checkLabel}>In stock</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleAdd} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? "Saving..." : "Save product"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 30 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  welcomeText: { fontSize: 14, color: "rgba(255,255,255,0.95)", marginTop: 2 },
  contentPanel: { marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 28, paddingHorizontal: 20 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    elevation: 2,
  },
  tileIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 10, position: "relative" },
  badge: { position: "absolute", top: -6, right: -6, backgroundColor: "#EF4444", borderRadius: 12, minWidth: 22, height: 22, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  tileTitle: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 2 },
  tileSubtitle: { fontSize: 12, color: "#6B7C85" },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1B2B34",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#8ED1FC", marginRight: 10, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#1EA7FD", borderColor: "#1EA7FD" },
  checkLabel: { fontSize: 15, color: "#1B2B34" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  submitButton: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 8, marginBottom: 24 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});

export default SupplierDashboardScreen;
