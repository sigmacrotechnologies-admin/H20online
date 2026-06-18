import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import {
  SectionCard,
  GradientButton,
  FilterChip,
  SupplierPageHeader,
  ui,
} from "@/src/components/supplier/supplierUi";
import { theme } from "@/src/theme";

const TILES = [
  { key: "incoming", title: "Incoming orders", subtitle: "Accept & set ETA", icon: "cart-outline", route: "supplier-incoming-orders", badge: true, accent: "#DC2626" },
  { key: "history", title: "Order history", subtitle: "Past orders & filters", icon: "time-outline", route: "supplier-order-history", accent: theme.accent },
  { key: "products", title: "My products", subtitle: "Add or remove products", icon: "cube-outline", route: "supplier-products", accent: "#7C3AED" },
  { key: "addProduct", title: "Add product", subtitle: "New product to catalog", icon: "add-circle-outline", route: "supplier-dashboard", action: "addProduct", accent: "#059669" },
  { key: "financials", title: "Financials", subtitle: "Orders, revenue, earnings", icon: "stats-chart-outline", route: "supplier-financials", accent: "#D97706" },
  { key: "wallet", title: "Wallet", subtitle: "Balance & transactions", icon: "wallet-outline", route: "supplier-wallet", accent: "#0E7490" },
  { key: "support", title: "Support", subtitle: "Message admin", icon: "chatbubble-ellipses-outline", route: "supplier-support", accent: "#6366F1" },
];

function getInitials(name) {
  const parts = String(name || "S").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SupplierDashboardScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const [todayDeliveredCount, setTodayDeliveredCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);

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

  const displayName = user?.name || "Supplier";
  const firstName = displayName.split(" ")[0] || displayName;

  const headerHero = (
    <View style={styles.headerHero}>
      <View style={styles.welcomeRow}>
        <View style={styles.avatarRing}>
          <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.12)"]} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.welcomeTextWrap}>
          <Text style={styles.welcomeLabel}>Welcome back</Text>
          <Text style={styles.welcomeName}>{firstName}</Text>
          <Text style={styles.welcomeSub}>Supplier hub · orders, catalog & earnings</Text>
        </View>
        <View style={styles.supplierBadge}>
          <Ionicons name="storefront" size={14} color="#FFFFFF" />
          <Text style={styles.supplierBadgeText}>Partner</Text>
        </View>
      </View>

      <View style={styles.headerStatsRow}>
        <View style={styles.headerStatCard}>
          <View style={styles.headerStatIcon}>
            <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Today's earnings</Text>
          <Text style={styles.headerStatValue}>₹{Number(todayEarnings || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.headerStatCard}>
          <View style={styles.headerStatIcon}>
            <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Delivered today</Text>
          <Text style={styles.headerStatValue}>{todayDeliveredCount}</Text>
        </View>
        <View style={[styles.headerStatCard, incomingCount > 0 && styles.headerStatCardAlert]}>
          <View style={[styles.headerStatIcon, incomingCount > 0 && styles.headerStatIconAlert]}>
            <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerStatLabel}>Incoming</Text>
          <Text style={styles.headerStatValue}>{incomingCount}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SupplierScreenShell showBack={false} tallHeader showMenu headerExtra={headerHero}>
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false}>
        {incomingCount > 0 ? (
          <TouchableOpacity
            style={styles.alertBannerWrap}
            onPress={() => router.push("/supplier-incoming-orders")}
            activeOpacity={0.9}
          >
            <LinearGradient colors={["#EF4444", "#DC2626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.alertBanner}>
              <View style={styles.alertBannerIcon}>
                <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.alertBannerText}>
                <Text style={styles.alertBannerTitle}>{incomingCount} incoming order{incomingCount !== 1 ? "s" : ""}</Text>
                <Text style={styles.alertBannerSub}>Tap to review and accept</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        <SectionCard icon="grid-outline" title="Quick actions" subtitle="Manage your supplier operations">
          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const count = tile.badge ? incomingCount : null;
              const isFeatured = tile.key === "incoming" && count > 0;
              return (
                <TouchableOpacity
                  key={tile.key}
                  style={styles.tileWrap}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.88}
                >
                  {isFeatured ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileGradientBorder}>
                      <View style={styles.tileInner}>
                        <DashboardTile tile={tile} count={count} featured />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tile}>
                      <DashboardTile tile={tile} count={count} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>
      </ScrollView>
    </SupplierScreenShell>
  );
};

function DashboardTile({ tile, count, featured = false }) {
  return (
    <>
      <View style={styles.tileTopRow}>
        <LinearGradient
          colors={featured ? [theme.medium, theme.accent] : [`${tile.accent}22`, `${tile.accent}10`]}
          style={styles.tileIconCircle}
        >
          <Ionicons name={tile.icon} size={22} color={featured ? "#FFFFFF" : tile.accent} />
        </LinearGradient>
        {count != null && count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        )}
      </View>
      <Text style={[styles.tileTitle, featured && styles.tileTitleFeatured]}>{tile.title}</Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>{tile.subtitle}</Text>
      <View style={styles.tileFooter}>
        <View style={[styles.tileDot, featured && styles.tileDotActive]} />
        <Text style={[styles.tileFooterText, featured && styles.tileFooterTextActive]}>
          {featured ? "Action needed" : "Open"}
        </Text>
      </View>
    </>
  );
}

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
    <SupplierScreenShell
      onBack={onClose}
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="add-circle-outline"
          title="Add product"
          subtitle="Create a new product for your catalog"
          stats={[
            { icon: "pricetag-outline", label: "Type", value: (productType || "jar").toUpperCase() },
            { icon: "cube-outline", label: "Stock", value: stockQty || "0" },
            { icon: "checkmark-circle-outline", label: "Status", value: inStock ? "In stock" : "Out" },
          ]}
        />
      }
    >
      <ScrollView contentContainerStyle={ui.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionCard icon="layers-outline" title="Product type" subtitle="Required">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.filterRow}>
            {PRODUCT_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={type}
                selected={productType === type}
                onPress={() => setProductType(type)}
              />
            ))}
          </ScrollView>
        </SectionCard>

        <SectionCard icon="pricetag-outline" title="Basic details" subtitle="Name and availability">
          <Text style={ui.inputLabel}>Product name *</Text>
          <TextInput
            style={ui.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g. Pure Water 20L"
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity onPress={() => setInStock(!inStock)} style={styles.checkRow} activeOpacity={0.85}>
            <View style={[styles.checkbox, inStock && styles.checkboxChecked]}>
              {inStock ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
            </View>
            <Text style={styles.checkLabel}>In stock</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard icon="image-outline" title="Product image" subtitle="Library or upload">
          <View style={ui.filterRow}>
            <FilterChip
              label="Select from list"
              selected={imageMode === "library"}
              onPress={() => setImageMode("library")}
            />
            <FilterChip
              label="Upload image"
              selected={imageMode === "upload"}
              onPress={() => setImageMode("upload")}
            />
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
                  <GradientButton label={imageUrl ? "Change image" : "Upload image"} onPress={pickProductImage} icon="cloud-upload-outline" />
                  {imageUrl ? (
                    <GradientButton label="Use default image" onPress={() => setImageUrl("")} variant="outline" style={{ marginTop: 8 }} />
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
                <TouchableOpacity
                  key={img.key}
                  style={[styles.assetCard, selected && styles.assetCardSelected]}
                  onPress={() => { setSelectedAssetImage(img.storedValue); setImageMode("library"); }}
                  activeOpacity={0.85}
                >
                  <Image source={img.source} style={styles.assetThumb} />
                  <Text style={[styles.assetLabel, selected && styles.assetLabelSelected]} numberOfLines={1}>{img.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard icon="cash-outline" title="Pricing & delivery" subtitle="Price, capacity and stock">
          <Text style={ui.inputLabel}>Price (₹) *</Text>
          <TextInput style={ui.input} value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={theme.textMuted} />
          <Text style={ui.inputLabel}>Price unit</Text>
          <TextInput style={ui.input} value={priceUnit} onChangeText={setPriceUnit} placeholder="20L Jar" placeholderTextColor={theme.textMuted} />
          <Text style={ui.inputLabel}>Delivery (e.g. 20-30 min)</Text>
          <TextInput style={ui.input} value={delivery} onChangeText={setDelivery} placeholder="20-30 min" placeholderTextColor={theme.textMuted} />
          <Text style={ui.inputLabel}>Capacity (L)</Text>
          <TextInput style={ui.input} value={capacityL} onChangeText={setCapacityL} placeholder="20" keyboardType="number-pad" placeholderTextColor={theme.textMuted} />
          <Text style={ui.inputLabel}>Available units (stock)</Text>
          <TextInput style={ui.input} value={stockQty} onChangeText={setStockQty} placeholder="0" keyboardType="number-pad" placeholderTextColor={theme.textMuted} />
        </SectionCard>

        <SectionCard icon="list-outline" title="Categories" subtitle="Comma-separated tags">
          <Text style={ui.inputLabel}>Categories (comma-separated) *</Text>
          <TextInput style={ui.input} value={categories} onChangeText={setCategories} placeholder="drinking, mineral" placeholderTextColor={theme.textMuted} />
        </SectionCard>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <GradientButton
          label={loading ? "Saving..." : "Save product"}
          onPress={handleAdd}
          disabled={loading}
          loading={loading}
          icon="checkmark-circle-outline"
          style={{ marginBottom: 8 }}
        />
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  headerHero: { marginTop: 4 },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarRing: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    padding: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  welcomeTextWrap: { flex: 1, minWidth: 0 },
  welcomeLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.88)" },
  welcomeName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5, marginTop: 2 },
  welcomeSub: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 4, lineHeight: 16 },
  supplierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  supplierBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  headerStatsRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  headerStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  headerStatCardAlert: {
    backgroundColor: "rgba(239,68,68,0.22)",
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerStatIconAlert: { backgroundColor: "rgba(255,255,255,0.24)" },
  headerStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
  headerStatValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginTop: 3 },
  alertBannerWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  alertBanner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  alertBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertBannerText: { flex: 1 },
  alertBannerTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  alertBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tileWrap: { width: "48%", marginBottom: 14 },
  tileGradientBorder: { borderRadius: 22, padding: 2 },
  tileInner: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    minHeight: 158,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    minHeight: 158,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  tileTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  tileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  tileTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginBottom: 4 },
  tileTitleFeatured: { color: theme.accent },
  tileSubtitle: { fontSize: 12, color: theme.textMuted, lineHeight: 16, minHeight: 32 },
  tileFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  tileDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(107,124,133,0.35)" },
  tileDotActive: { backgroundColor: theme.medium },
  tileFooterText: { fontSize: 11, fontWeight: "600", color: theme.textMuted },
  tileFooterTextActive: { color: theme.accent },
  checkRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.primaryLight,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkLabel: { fontSize: 15, color: theme.textPrimary },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    padding: 10,
  },
  productPreviewImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#EAF2F8" },
  imagePickerActions: { flex: 1, marginLeft: 12 },
  imagePickHint: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  assetListTitle: { fontSize: 12, color: theme.textMuted, marginBottom: 8 },
  assetGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  assetCard: {
    width: "31%",
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    backgroundColor: theme.contentPanelBackground,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  assetCardSelected: { borderColor: theme.accent, backgroundColor: "rgba(30,143,177,0.08)" },
  assetThumb: { width: "100%", height: 56, borderRadius: 8, backgroundColor: "#EAF2F8", marginBottom: 6 },
  assetLabel: { fontSize: 11, color: theme.textPrimary, textAlign: "center" },
  assetLabelSelected: { color: theme.accent, fontWeight: "700" },
});

export default SupplierDashboardScreen;
