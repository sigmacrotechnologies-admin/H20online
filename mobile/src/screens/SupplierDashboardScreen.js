import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

const PRICE_UNITS = ["20L Jar", "1L Bottle", "5L Can", "500ml", "Bulk"];
const BADGES = ["", "subscription", "premium"];

const SupplierDashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("20L Jar");
  const [delivery, setDelivery] = useState("20-30 min");
  const [inStock, setInStock] = useState(true);
  const [capacityL, setCapacityL] = useState("20");
  const [categories, setCategories] = useState("");
  const [badge, setBadge] = useState("");
  const [rating, setRating] = useState("4");
  const [reviewCount, setReviewCount] = useState("0");

  const resetForm = () => {
    setProductName("");
    setPrice("");
    setPriceUnit("20L Jar");
    setDelivery("20-30 min");
    setInStock(true);
    setCapacityL("20");
    setCategories("");
    setBadge("");
    setRating("4");
    setReviewCount("0");
    setError("");
    setShowAddProduct(false);
  };

  const handleAddProduct = async () => {
    setError("");
    const nameTrim = productName.trim();
    const priceNum = parseFloat(price);
    if (!nameTrim) {
      setError("Product name is required");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Valid price is required");
      return;
    }
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
        rating: parseFloat(rating) || 4,
        reviewCount: reviewCount.trim() || "0",
      });
      Alert.alert("Success", "Product added. It will appear on the order page for customers.");
      resetForm();
    } catch (err) {
      setError(err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

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
              <Text style={styles.headerTitle}>Supplier Dashboard</Text>
            </View>
            <Text style={styles.welcomeText}>Hello, {user?.name || "Supplier"}</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentPanel}>
          {!showAddProduct ? (
            <>
              <Text style={styles.sectionTitle}>Quick actions</Text>
              <TouchableOpacity
                style={styles.tile}
                onPress={() => setShowAddProduct(true)}
                activeOpacity={0.8}
              >
                <View style={styles.tileIconWrap}>
                  <Ionicons name="add-circle-outline" size={40} color="#1EA7FD" />
                </View>
                <Text style={styles.tileTitle}>Add Product</Text>
                <Text style={styles.tileSubtitle}>Add a new product to your catalog. It will be visible to customers on the order page.</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.formHeader}>
                <Text style={styles.sectionTitle}>Add Product</Text>
                <TouchableOpacity onPress={resetForm}>
                  <Ionicons name="close-circle-outline" size={28} color="#6B7C85" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Product Name *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="pricetag-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="e.g. Pure Water 20L"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Price (₹) *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="cash-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Price Unit</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="cube-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={priceUnit}
                    onChangeText={setPriceUnit}
                    placeholder="20L Jar"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Delivery (e.g. 20-30 min)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="time-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={delivery}
                    onChangeText={setDelivery}
                    placeholder="20-30 min"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Capacity (L)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="water-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={capacityL}
                    onChangeText={setCapacityL}
                    placeholder="20"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Categories (comma-separated)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="list-outline" size={20} color="#6B7C85" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={categories}
                    onChangeText={setCategories}
                    placeholder="e.g. drinking, mineral"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>Badge (optional)</Text>
                <View style={styles.badgeRow}>
                  {BADGES.map((b) => (
                    <TouchableOpacity
                      key={b || "none"}
                      style={[styles.badgeChip, badge === b && styles.badgeChipSelected]}
                      onPress={() => setBadge(b)}
                    >
                      <Text style={[styles.badgeChipText, badge === b && styles.badgeChipTextSelected]}>
                        {b || "None"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>In Stock</Text>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setInStock(!inStock)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, inStock && styles.checkboxChecked]}>
                    {inStock ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.checkLabel}>Product is in stock</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddProduct}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Product</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SupplierDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 30 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginLeft: 12 },
  welcomeText: { marginTop: 12, fontSize: 16, color: "rgba(255,255,255,0.95)" },
  contentPanel: { marginTop: -20, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 16 },
  tile: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    elevation: 3,
  },
  tileIconWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  tileTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  tileSubtitle: { fontSize: 14, color: "#6B7C85" },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#1B2B34", padding: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  badgeChipSelected: { backgroundColor: "#E0F2FE", borderColor: "#8ED1FC" },
  badgeChipText: { fontSize: 14, fontWeight: "600", color: "#6B7C85" },
  badgeChipTextSelected: { color: "#0EA5E9" },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#8ED1FC", marginRight: 12, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#1EA7FD", borderColor: "#1EA7FD" },
  checkLabel: { fontSize: 15, color: "#1B2B34" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12, fontWeight: "500" },
  submitButton: { marginTop: 12, marginBottom: 24, backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 3 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
