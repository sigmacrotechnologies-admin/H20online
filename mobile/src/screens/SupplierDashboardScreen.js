import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & set ETA", icon: "cart-outline", route: "supplier-incoming-orders", badge: true },
  { key: "history", title: "Order history", subtitle: "Past orders & filters", icon: "time-outline", route: "supplier-order-history" },
  { key: "products", title: "My products", subtitle: "Add or remove products", icon: "cube-outline", route: "supplier-products" },
  { key: "addProduct", title: "Add product", subtitle: "New product to catalog", icon: "add-circle-outline", route: "supplier-dashboard", action: "addProduct" },
  { key: "financials", title: "Financials", subtitle: "Orders, revenue, earnings", icon: "stats-chart-outline", route: "supplier-financials" },
  { key: "wallet", title: "Wallet", subtitle: "Balance & transactions", icon: "wallet-outline", route: "supplier-wallet" },
  { key: "support", title: "Support", subtitle: "Message admin", icon: "chatbubble-ellipses-outline", route: "supplier-support" },
];
const HEADER_DROPLETS = [
  { left: -12, top: 20, width: 18, height: 24, phase: "a" },
  { left: 14, top: 62, width: 16, height: 22, phase: "b" },
  { left: 52, top: 28, width: 20, height: 28, phase: "c" },
  { left: 88, top: 94, width: 14, height: 20, phase: "a" },
  { left: 124, top: 44, width: 22, height: 30, phase: "b" },
  { left: 164, top: 12, width: 16, height: 22, phase: "c" },
  { left: 206, top: 74, width: 18, height: 24, phase: "a" },
  { left: 34, top: 150, width: 18, height: 24, phase: "c" },
  { right: 146, top: 36, width: 20, height: 28, phase: "c" },
  { right: 110, top: 8, width: 16, height: 22, phase: "a" },
  { right: 76, top: 66, width: 18, height: 24, phase: "b" },
  { right: 42, top: 30, width: 22, height: 30, phase: "c" },
  { right: 8, top: 98, width: 16, height: 22, phase: "a" },
  { right: 62, top: 154, width: 18, height: 24, phase: "b" },
  { right: -10, top: 18, width: 18, height: 24, phase: "b" },
];

const SupplierDashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const [todayDeliveredCount, setTodayDeliveredCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400), b = loop(dropletAnimB, 4200), c = loop(dropletAnimC, 3800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);
  const getDropletAnim = (phase) => phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA;

  useEffect(() => {
    api.supplier.ordersIncoming().then((list) => setIncomingCount(list?.length || 0)).catch(() => {});
    api.supplier
      .ordersHistory({ status: "delivered", page: 1, limit: 50 })
      .then((res) => {
        const list = Array.isArray(res?.orders) ? res.orders : [];
        const todayKey = new Date().toISOString().slice(0, 10);
        const todays = list.filter((o) => {
          if (!o?.createdAt) return false;
          const d = new Date(o.createdAt);
          if (Number.isNaN(d.getTime())) return false;
          return d.toISOString().slice(0, 10) === todayKey;
        });
        setTodayDeliveredCount(todays.length);
        const earnings = todays.reduce((sum, o) => sum + Number(o.myTotal || o.total || 0), 0);
        setTodayEarnings(earnings);
      })
      .catch(() => {
        setTodayDeliveredCount(0);
        setTodayEarnings(0);
      });
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
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
          >
            <View style={styles.headerOverlay}>
              {HEADER_DROPLETS.map((drop, idx) => {
                const dropAnim = getDropletAnim(drop.phase);
                return (
                  <Animated.View
                    key={`supplier-drop-${idx}`}
                    style={[styles.dropletWrap, {
                      left: drop.left, right: drop.right, top: drop.top, width: drop.width, height: drop.height,
                      opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
                      transform: [
                        { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                        { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] }) },
                      ],
                    }]}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 60 80">
                      <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.3)" />
                    </Svg>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.headerTopRow}>
              <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
              <View style={styles.headerTopSpacer} />
            </View>
            <View style={styles.headerInfoRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="storefront-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Supplier Dashboard</Text>
                <Text style={styles.welcomeText}>{user?.name || "Supplier"}</Text>
              </View>
            </View>
            <View style={styles.todayStatsRow}>
              <View style={styles.todayStatCard}>
                <View style={styles.todayStatIcon}>
                  <Ionicons name="cash-outline" size={15} color="#065F46" />
                </View>
                <View style={styles.todayStatTextWrap}>
                  <Text style={styles.todayStatLabel}>Today's earnings</Text>
                  <Text style={styles.todayStatValue}>₹{Number(todayEarnings || 0).toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.todayStatCard}>
                <View style={styles.todayStatIcon}>
                  <Ionicons name="checkmark-done-outline" size={15} color="#1D4ED8" />
                </View>
                <View style={styles.todayStatTextWrap}>
                  <Text style={styles.todayStatLabel}>Delivered today</Text>
                  <Text style={styles.todayStatValue}>{todayDeliveredCount}</Text>
                </View>
              </View>
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
                    <Ionicons name={tile.icon} size={32} color={theme.primary} />
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
const PRODUCT_TYPES = ["jar", "bottle", "can", "tanker", "other"];
const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/400x300?text=H2O+Product";
const PRODUCT_IMAGE_OPTIONS = [
  { key: "water-camper", label: "Water Camper", source: require("../../assets/images/Product-icon/Water-Camper.png"), storedValue: "asset://water-camper" },
  { key: "water-bottle", label: "Water Bottle", source: require("../../assets/images/Product-icon/water-bottle.png"), storedValue: "asset://water-bottle" },
  { key: "plastic-bottle", label: "Plastic Bottle", source: require("../../assets/images/Product-icon/plastic-bottle.png"), storedValue: "asset://plastic-bottle" },
  { key: "gallon-bottle", label: "Gallon Bottle", source: require("../../assets/images/Product-icon/gallon-bottle.png"), storedValue: "asset://gallon-bottle" },
  { key: "gallon-1", label: "Gallon 1", source: require("../../assets/images/Product-icon/gallon (1).png"), storedValue: "asset://gallon-1" },
  { key: "gallon-2", label: "Gallon 2", source: require("../../assets/images/Product-icon/gallon2.png"), storedValue: "asset://gallon-2" },
  { key: "gallon-3", label: "Gallon 3", source: require("../../assets/images/Product-icon/gallon3.png"), storedValue: "asset://gallon-3" },
  { key: "water-dispenser", label: "Dispenser", source: require("../../assets/images/Product-icon/water-dispenser.png"), storedValue: "asset://water-dispenser" },
  { key: "tank-truck", label: "Tank Truck", source: require("../../assets/images/Product-icon/tank-truck.png"), storedValue: "asset://tank-truck" },
];

function SupplierAddProductView({ onClose, onAdded }) {
  let ImagePicker = null;
  try {
    ImagePicker = require("expo-image-picker");
  } catch (_) {
    ImagePicker = null;
  }
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("jar");
  const [imageMode, setImageMode] = useState("library");
  const [selectedAssetImage, setSelectedAssetImage] = useState(PRODUCT_IMAGE_OPTIONS[0].storedValue);
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("20L Jar");
  const [delivery, setDelivery] = useState("20-30 min");
  const [inStock, setInStock] = useState(true);
  const [capacityL, setCapacityL] = useState("20");
  const [categories, setCategories] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [badge, setBadge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const pickProductImage = async () => {
    if (!ImagePicker) {
      Alert.alert("Image picker unavailable", "Install expo-image-picker to upload product images.");
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow access to photos to attach product image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Image error", e.message || "Failed to pick image");
    }
  };

  const handleAdd = async () => {
    setError("");
    const nameTrim = productName.trim();
    const priceNum = parseFloat(price);
    const priceUnitTrim = (priceUnit || "").trim();
    const deliveryTrim = (delivery || "").trim();
    const capacityNum = parseInt(capacityL, 10);
    const stockNum = parseInt(stockQty, 10);
    const categoriesList = categories.trim() ? categories.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (!nameTrim) { setError("Product name is required"); return; }
    if (!productType || !String(productType).trim()) { setError("Product type is required"); return; }
    if (isNaN(priceNum) || priceNum < 0) { setError("Valid price is required"); return; }
    if (!priceUnitTrim) { setError("Price unit is required"); return; }
    if (!deliveryTrim) { setError("Delivery time is required"); return; }
    if (Number.isNaN(capacityNum) || capacityNum <= 0) { setError("Valid capacity is required"); return; }
    if (Number.isNaN(stockNum) || stockNum < 0) { setError("Valid available stock units are required"); return; }
    if (categoriesList.length === 0) { setError("At least one category is required"); return; }
    setLoading(true);
    const finalImageValue = imageMode === "upload" ? (imageUrl.trim() || DEFAULT_PRODUCT_IMAGE) : (selectedAssetImage || DEFAULT_PRODUCT_IMAGE);
    try {
      await api.products.create({
        productName: nameTrim,
        productType: productType || "jar",
        imageUrl: finalImageValue,
        price: priceNum,
        priceUnit: priceUnitTrim,
        delivery: deliveryTrim,
        inStock,
        stockQty: stockNum,
        capacityL: capacityNum,
        categories: categoriesList,
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
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, styles.addProductGradientBackground, { paddingTop: 20 + androidTopInset }]}>
            <View style={styles.headerTopRow}>
              <BackButton onPress={onClose} />
              <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
              <View style={styles.headerTopSpacer} />
            </View>
            <View style={styles.headerInfoRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Add product</Text>
                <Text style={styles.welcomeText}>Create a new product for your catalog</Text>
              </View>
            </View>
            <Text style={styles.productTypeLabelTop}>Product type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topTypeChipScroll} contentContainerStyle={styles.topTypeChipContent}>
              {PRODUCT_TYPES.map((type) => (
                <TouchableOpacity key={type} style={[styles.choiceChip, productType === type && styles.choiceChipSelected]} onPress={() => setProductType(type)}>
                  <Text style={[styles.choiceChipText, productType === type && styles.choiceChipTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
        <View style={styles.contentPanel}>
          <Text style={styles.label}>Product name *</Text>
          <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Pure Water 20L" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Product image</Text>
          <View style={styles.imageModeRow}>
            <TouchableOpacity style={[styles.imageModeChip, imageMode === "library" && styles.imageModeChipSelected]} onPress={() => setImageMode("library")}>
              <Text style={[styles.imageModeChipText, imageMode === "library" && styles.imageModeChipTextSelected]}>Select from list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.imageModeChip, imageMode === "upload" && styles.imageModeChipSelected]} onPress={() => setImageMode("upload")}>
              <Text style={[styles.imageModeChipText, imageMode === "upload" && styles.imageModeChipTextSelected]}>Upload image</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.imagePickerRow}>
            <Image
              source={
                imageMode === "upload"
                  ? { uri: imageUrl || DEFAULT_PRODUCT_IMAGE }
                  : (PRODUCT_IMAGE_OPTIONS.find((img) => img.storedValue === selectedAssetImage)?.source || PRODUCT_IMAGE_OPTIONS[0].source)
              }
              style={styles.productPreviewImage}
            />
            <View style={styles.imagePickerActions}>
              {imageMode === "upload" ? (
                <>
                  <TouchableOpacity style={styles.imagePickBtn} onPress={pickProductImage}>
                    <Text style={styles.imagePickBtnText}>{imageUrl ? "Change image" : "Upload image"}</Text>
                  </TouchableOpacity>
                  {imageUrl ? (
                    <TouchableOpacity style={styles.imageUseDefaultBtn} onPress={() => setImageUrl("")}>
                      <Text style={styles.imageUseDefaultBtnText}>Use default image</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <Text style={styles.imagePickHint}>Choose one from product image list below.</Text>
              )}
            </View>
          </View>
          <Text style={styles.assetListTitle}>Available product images</Text>
          <View style={styles.assetGrid}>
            {PRODUCT_IMAGE_OPTIONS.map((img) => {
              const selected = selectedAssetImage === img.storedValue;
              return (
                <TouchableOpacity key={img.key} style={[styles.assetCard, selected && styles.assetCardSelected]} onPress={() => { setSelectedAssetImage(img.storedValue); setImageMode("library"); }}>
                  <Image source={img.source} style={styles.assetThumb} />
                  <Text style={[styles.assetLabel, selected && styles.assetLabelSelected]} numberOfLines={1}>{img.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Price unit</Text>
          <TextInput style={styles.input} value={priceUnit} onChangeText={setPriceUnit} placeholder="20L Jar" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Delivery (e.g. 20-30 min)</Text>
          <TextInput style={styles.input} value={delivery} onChangeText={setDelivery} placeholder="20-30 min" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Capacity (L)</Text>
          <TextInput style={styles.input} value={capacityL} onChangeText={setCapacityL} placeholder="20" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Available units (stock)</Text>
          <TextInput style={styles.input} value={stockQty} onChangeText={setStockQty} placeholder="0" keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  scrollContent: { paddingBottom: 30 },
  headerPanel: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 28, paddingHorizontal: 20 },
  addProductGradientBackground: { paddingBottom: 20 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  welcomeText: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  productTypeLabelTop: { marginTop: 10, marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  topTypeChipScroll: { marginBottom: 12 },
  topTypeChipContent: { paddingRight: 10 },
  todayStatsRow: { marginTop: 14, flexDirection: "row", gap: 8 },
  todayStatCard: {
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
  todayStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  todayStatTextWrap: { flex: 1 },
  todayStatLabel: { fontSize: 11, color: "#456173" },
  todayStatValue: { fontSize: 14, fontWeight: "800", color: "#1B2B34", marginTop: 1 },
  contentPanel: { marginTop: -14, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    elevation: 0,
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
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.primaryLight, marginRight: 10, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkLabel: { fontSize: 15, color: "#1B2B34" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  submitButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 8, marginBottom: 24 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  choiceChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  choiceChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  choiceChipText: { fontSize: 13, color: "#1B2B34", textTransform: "capitalize" },
  choiceChipTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 10,
  },
  imageModeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  imageModeChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  imageModeChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  imageModeChipText: { fontSize: 12, color: "#1B2B34", fontWeight: "600" },
  imageModeChipTextSelected: { color: "#FFFFFF" },
  productPreviewImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#EAF2F8" },
  imagePickerActions: { flex: 1, marginLeft: 12 },
  imagePickHint: { fontSize: 12, color: "#6B7C85" },
  imagePickBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, alignItems: "center" },
  imagePickBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  imageUseDefaultBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 8, alignItems: "center" },
  imageUseDefaultBtnText: { color: theme.primary, fontSize: 12, fontWeight: "600" },
  assetListTitle: { fontSize: 12, color: "#6B7C85", marginBottom: 8 },
  assetGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  assetCard: {
    width: "31%",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  assetCardSelected: { borderColor: theme.primary, backgroundColor: "rgba(14,165,233,0.08)" },
  assetThumb: { width: "100%", height: 56, borderRadius: 8, backgroundColor: "#EAF2F8", marginBottom: 6 },
  assetLabel: { fontSize: 11, color: "#1B2B34", textAlign: "center" },
  assetLabelSelected: { color: theme.primary, fontWeight: "700" },
});

export default SupplierDashboardScreen;
