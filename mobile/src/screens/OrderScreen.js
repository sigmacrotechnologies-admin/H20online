import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useCart } from "@/src/context/CartContext";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import { theme } from "@/src/theme";
import ProductRatingsModal from "@/src/components/ProductRatingsModal";
import StoreTravelBadge from "@/src/components/StoreTravelBadge";
import { useStoreTravelInfo, getCurrentLocationCoords } from "@/src/hooks/useStoreTravel";
import { addressToCheckoutFields } from "@/src/utils/checkoutAddress";

const FILTERS = [
  { id: "all", label: "All", icon: "grid-outline" },
  { id: "price", label: "Price", icon: "pricetag-outline" },
  { id: "delivery", label: "Fastest", icon: "flash-outline" },
  { id: "rating", label: "Top rated", icon: "star-outline" },
  { id: "distance", label: "Nearest", icon: "navigate-outline" },
];

const SIZE_RANGES = [
  { id: "1-5", label: "1–5 L", minL: 1, maxL: 5 },
  { id: "5-10", label: "5–10 L", minL: 5, maxL: 10 },
  { id: "10-15", label: "10–15 L", minL: 10, maxL: 15 },
  { id: "15-20", label: "15–20 L", minL: 15, maxL: 20 },
  { id: "20+", label: "20+ L", minL: 20, maxL: 9999 },
];
const EXTRA_OPTIONS = [
  { id: "bulk", label: "Bulk orders (500+ L)" },
  { id: "tanker", label: "Tanker" },
];
const USE_CASE_OPTIONS = [
  { id: "party", label: "Party & function" },
  { id: "office", label: "Order in office" },
];
const HEADER_DROPLETS = [
  { left: 18, top: 52, width: 14, height: 20 },
  { left: 62, top: 24, width: 16, height: 22 },
  { left: 110, top: 84, width: 12, height: 18 },
  { right: 118, top: 34, width: 16, height: 22 },
  { right: 66, top: 78, width: 14, height: 20 },
  { right: 18, top: 26, width: 18, height: 24 },
];

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
const defaultProductIcon = require("../../assets/images/Product-icon/Water-Camper.png");

function getProductImageSource(item) {
  if (item?.imageUrl && PRODUCT_ASSET_MAP[item.imageUrl]) return PRODUCT_ASSET_MAP[item.imageUrl];
  if (item?.imageUrl) {
    const raw = String(item.imageUrl).trim();
    const isSafeRemote = raw.startsWith("http://") || raw.startsWith("https://");
    const isSafeLocal = raw.startsWith("file://") || raw.startsWith("content://");
    if (isSafeRemote || isSafeLocal) return { uri: raw };
  }
  return defaultProductIcon;
}

function ProductCard({ item, onAddToCart, onBuyNow, onToggleCompare, onViewRatings, travelInfo, travelLoading }) {
  const badgeLabel =
    item.badge === "subscription" ? "Sub" : item.badge === "premium" ? "Pro" : null;

  return (
    <View style={styles.gridCard}>
      <View style={styles.gridImageWrap}>
        <LinearGradient colors={["#E0F7FA", "#F8FDFF"]} style={styles.gridImageBg}>
          <Image source={getProductImageSource(item)} style={styles.gridImage} resizeMode="contain" />
        </LinearGradient>
        {badgeLabel ? (
          <View style={[styles.gridBadge, item.badge === "premium" && styles.gridBadgePremium]}>
            <Text style={styles.gridBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.gridCompareBtn, item.compareSelected && styles.gridCompareBtnActive]}
          onPress={() => onToggleCompare(item.id)}
          activeOpacity={0.8}
        >
          <Ionicons name={item.compareSelected ? "git-compare" : "git-compare-outline"} size={14} color={item.compareSelected ? "#FFFFFF" : theme.accent} />
        </TouchableOpacity>
        {!item.inStock ? (
          <View style={styles.gridStockOverlay}>
            <Text style={styles.gridStockText}>Out</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity onPress={() => onViewRatings(item)} activeOpacity={0.85}>
        <View style={styles.gridRatingRow}>
          <Ionicons name="star" size={11} color="#EAB308" />
          <Text style={styles.gridRatingText}>{item.rating}</Text>
          <Text style={styles.gridRatingCount}>({item.reviewCount})</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.gridName} numberOfLines={2}>{item.productName}</Text>
      <Text style={styles.gridSupplier} numberOfLines={1}>{item.supplierName}</Text>

      <View style={styles.gridMetaRow}>
        <Ionicons name="time-outline" size={11} color={theme.textMuted} />
        <Text style={styles.gridMetaText} numberOfLines={1}>
          {travelInfo?.durationText || item.delivery}
        </Text>
      </View>
      {item.hasRegisteredStore ? (
        <StoreTravelBadge info={travelInfo} loading={travelLoading} compact />
      ) : (
        <Text style={styles.noStoreHint}>Store not registered — tracking unavailable</Text>
      )}

      <Text style={styles.gridPrice}>₹{item.price}</Text>
      <Text style={styles.gridPriceUnit}>per {item.priceUnit || "unit"}</Text>

      {item.inStock ? (
        <View style={styles.gridActions}>
          <TouchableOpacity style={styles.gridCartBtn} onPress={() => onAddToCart(item)} activeOpacity={0.85}>
            <Ionicons name="cart-outline" size={16} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBuyWrap} onPress={() => onBuyNow(item)} activeOpacity={0.9}>
            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.gridBuyBtn}>
              <Text style={styles.gridBuyText}>Buy</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gridActions}>
          <View style={styles.gridUnavailable}>
            <Text style={styles.gridUnavailableText}>Unavailable</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const OrderScreen = () => {
  const router = useRouter();
  const portal = useCustomerPortal();
  const { cartCount, addToCart, setCartForBuyNow, setCheckoutDetails, getCheckoutDetails, checkoutDetails } = useCart();
  const productListParams = portal.isSociety ? { audience: "society" } : {};
  const [location, setLocation] = useState("Current location (tap to change)");
  const [customerCoords, setCustomerCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  useEffect(() => {
    setProductsError(null);
    api.products
      .list(productListParams)
      .then((raw) => {
        setProductsError(null);
        const list = Array.isArray(raw) ? raw : [];
        setProducts(list.map((p) => ({ ...p, compareSelected: false })));
      })
      .catch((err) => {
        setProductsError(err?.message || "Request failed");
        setProducts([]);
      })
      .finally(() => setProductsLoading(false));
  }, [portal.isSociety]);

  const loadSavedAddresses = useCallback(async () => {
    try {
      const list = await api.addresses.list();
      const safe = Array.isArray(list) ? list : [];
      setSavedAddresses(safe);
      const defaultEntry = safe.find((a) => a.isDefault) || safe[0] || null;
      const defaultAddress = defaultEntry?.fullAddress || "";
      if (defaultAddress) {
        setLocation((prev) => {
          if (!prev || prev.includes("Current location")) return defaultAddress;
          return prev;
        });
      }
      if (defaultEntry?.latitude != null && defaultEntry?.longitude != null) {
        setCustomerCoords((prev) => {
          const lat = defaultEntry.latitude;
          const lng = defaultEntry.longitude;
          if (prev?.latitude === lat && prev?.longitude === lng) return prev;
          return { latitude: lat, longitude: lng };
        });
      }
      if (defaultEntry?.fullAddress && defaultEntry?.phoneNumber) {
        const nextDetails = {
          address: defaultEntry.fullAddress,
          pinCode: defaultEntry.pinCode || "",
          city: defaultEntry.city || "",
          state: defaultEntry.state || "",
          receiverPhone: defaultEntry.phoneNumber,
          customerLatitude: defaultEntry.latitude ?? null,
          customerLongitude: defaultEntry.longitude ?? null,
        };
        const prev = checkoutDetails;
        const same =
          prev?.address === nextDetails.address &&
          prev?.pinCode === nextDetails.pinCode &&
          prev?.city === nextDetails.city &&
          prev?.state === nextDetails.state &&
          prev?.receiverPhone === nextDetails.receiverPhone &&
          prev?.customerLatitude === nextDetails.customerLatitude &&
          prev?.customerLongitude === nextDetails.customerLongitude;
        if (!same) setCheckoutDetails(nextDetails);
      }
    } catch (_) {
      setSavedAddresses([]);
    }
  }, [checkoutDetails, setCheckoutDetails]);

  useFocusEffect(
    useCallback(() => {
      loadSavedAddresses();
    }, [loadSavedAddresses])
  );

  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sizeRangeSelected, setSizeRangeSelected] = useState([]);
  const [extraSelected, setExtraSelected] = useState([]);
  const [useCaseSelected, setUseCaseSelected] = useState([]);
  const [sizeSliderMin, setSizeSliderMin] = useState(1);
  const [sizeSliderMax, setSizeSliderMax] = useState(500);
  const [ratingsModalProduct, setRatingsModalProduct] = useState(null);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const toggleCompare = (id) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, compareSelected: !p.compareSelected } : p));
      const selected = next.filter((p) => p.compareSelected);
      if (selected.length > 2) {
        const firstId = selected.find((s) => s.id !== id)?.id;
        return next.map((p) => (p.id === firstId ? { ...p, compareSelected: false } : p));
      }
      return next;
    });
  };

  const storeDestinations = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.hasRegisteredStore && p.storeId && p.storeLatitude != null && p.storeLongitude != null) {
        map.set(p.storeId, {
          id: p.storeId,
          lat: p.storeLatitude,
          lng: p.storeLongitude,
          name: p.storeName || "",
        });
      }
    });
    return [...map.values()];
  }, [products]);
  const { travelByStore, loading: travelLoading } = useStoreTravelInfo(customerCoords, storeDestinations);

  const comparedSuppliers = useMemo(() => {
    const selected = products.filter((p) => p.compareSelected);
    return selected.slice(0, 2);
  }, [products]);

  const toggleFilterOption = (arr, setArr, id) => {
    setArr((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredAndSortedProducts = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    let list = products.filter(
      (p) =>
        (p.productName || "").toLowerCase().includes(q) ||
        (p.supplierName || "").toLowerCase().includes(q)
    );
    list = list.filter((p) => {
      const capacityL = p.capacityL ?? 20;
      const categories = p.categories || [];
      if (sizeRangeSelected.length > 0) {
        const inRange = sizeRangeSelected.some((rid) => {
          const r = SIZE_RANGES.find((x) => x.id === rid);
          return r && capacityL >= r.minL && capacityL <= r.maxL;
        });
        if (!inRange) return false;
      }
      if (sizeSliderMin > 1 || sizeSliderMax < 500) {
        if (capacityL < sizeSliderMin || capacityL > sizeSliderMax) return false;
      }
      if (extraSelected.length > 0) {
        const matchBulk = extraSelected.includes("bulk") && (categories.includes("bulk") || capacityL >= 500);
        const matchTanker = extraSelected.includes("tanker") && (categories.includes("tanker") || capacityL >= 2000);
        if (!matchBulk && !matchTanker) return false;
      }
      if (useCaseSelected.length > 0) {
        const hasUseCase = useCaseSelected.some((u) => categories.includes(u));
        if (!hasUseCase) return false;
      }
      return true;
    });
    if (activeFilter === "price") list = [...list].sort((a, b) => a.price - b.price);
    else if (activeFilter === "delivery") list = [...list].sort((a, b) => (a.delivery < b.delivery ? -1 : 1));
    else if (activeFilter === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (activeFilter === "distance") {
      list = [...list].sort((a, b) => {
        const da = a.hasRegisteredStore
          ? travelByStore[a.storeId]?.durationSeconds ?? 999999
          : 999999;
        const db = b.hasRegisteredStore
          ? travelByStore[b.storeId]?.durationSeconds ?? 999999
          : 999999;
        return da - db;
      });
    }
    return list;
  }, [products, searchQuery, activeFilter, sizeRangeSelected, extraSelected, useCaseSelected, sizeSliderMin, sizeSliderMax, travelByStore]);

  const activeFilterCount =
    sizeRangeSelected.length + extraSelected.length + useCaseSelected.length + (sizeSliderMin > 1 || sizeSliderMax < 500 ? 1 : 0);

  const handleBuyNow = (item) => {
    if (!item.inStock) return;
    const selectedByLocation = savedAddresses.find((a) => (a.fullAddress || "").trim() === (location || "").trim());
    const fallbackDefault = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null;
    const selectedAddress = selectedByLocation || fallbackDefault;
    if (selectedAddress?.fullAddress && selectedAddress?.phoneNumber) {
      setCheckoutDetails({
        address: selectedAddress.fullAddress,
        receiverPhone: selectedAddress.phoneNumber,
        customerLatitude: selectedAddress.latitude ?? null,
        customerLongitude: selectedAddress.longitude ?? null,
      });
    }
    setCartForBuyNow(item, 1);
    router.push("/checkout");
  };

  const retryLoadProducts = () => {
    setProductsLoading(true);
    setProductsError(null);
    api.products
      .list(productListParams)
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : [];
        setProducts(list.map((p) => ({ ...p, compareSelected: false })));
      })
      .catch((e) => setProductsError(e?.message || "Request failed"))
      .finally(() => setProductsLoading(false));
  };

  const renderEmpty = () => {
    if (productsLoading) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.emptyTitle}>Loading products</Text>
          <Text style={styles.emptyText}>Finding the best water suppliers near you…</Text>
        </View>
      );
    }
    if (productsError) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cloud-offline-outline" size={32} color={theme.accent} />
          </View>
          <Text style={styles.emptyTitle}>Could not load products</Text>
          <Text style={styles.emptyText}>{productsError}</Text>
          <Text style={styles.emptyTextSub}>Check backend is running and EXPO_PUBLIC_API_URL in mobile/.env</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryLoadProducts} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="water-outline" size={32} color={theme.accent} />
        </View>
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptyText}>Try adjusting filters or run npm run seed in the backend folder.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retryLoadProducts} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}>
            <View style={styles.headerOverlay} pointerEvents="none">
              {HEADER_DROPLETS.map((d, i) => (
                <View key={`order-drop-${i}`} style={[styles.dropletWrap, { left: d.left, right: d.right, top: d.top, width: d.width, height: d.height }]}>
                  <Svg width="100%" height="100%" viewBox="0 0 60 80">
                    <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.28)" />
                  </Svg>
                </View>
              ))}
            </View>

            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
                <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
                {cartCount > 0 ? (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle}>{portal.isSociety ? "Order tankers" : "Order water"}</Text>
            <TouchableOpacity style={styles.locationCard} onPress={() => setShowLocationPicker(true)} activeOpacity={0.88}>
              <LinearGradient colors={["rgba(255,255,255,0.96)", "#FFFFFF"]} style={styles.locationCardInner}>
                <View style={styles.locationIconWrap}>
                  <Ionicons name="location" size={18} color={theme.accent} />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabel}>Deliver to</Text>
                  <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.headerSearchSection}>
              <View style={styles.headerSearchBox}>
                <Ionicons name="search-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={styles.headerSearchInput}
                  placeholder="Search products or suppliers"
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.headerFilterBtn} onPress={() => setShowFilterSheet(true)} activeOpacity={0.85}>
                <Ionicons name="options-outline" size={18} color={theme.accent} />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.headerSortContent}>
              {FILTERS.map((f) => {
                const active = activeFilter === f.id;
                return (
                  <TouchableOpacity key={f.id} onPress={() => setActiveFilter(f.id)} activeOpacity={0.88}>
                    {active ? (
                      <LinearGradient colors={["rgba(255,255,255,0.95)", "#FFFFFF"]} style={styles.headerFilterChipActive}>
                        <Ionicons name={f.icon} size={13} color={theme.accent} />
                        <Text style={styles.headerFilterChipTextActive}>{f.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.headerFilterChip}>
                        <Ionicons name={f.icon} size={13} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.headerFilterChipText}>{f.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <FlatList
            key={filteredAndSortedProducts.length === 0 ? "order-empty" : "order-grid"}
            style={styles.productList}
            data={filteredAndSortedProducts}
            keyExtractor={(item) => String(item.id)}
            numColumns={filteredAndSortedProducts.length === 0 ? 1 : 2}
            columnWrapperStyle={filteredAndSortedProducts.length > 0 ? styles.gridRow : undefined}
            contentContainerStyle={[
              styles.listContent,
              filteredAndSortedProducts.length === 0 && styles.listContentEmpty,
              comparedSuppliers.length > 0 && styles.listContentWithFooter,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              productsLoading ? null : filteredAndSortedProducts.length > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderTitle}>{filteredAndSortedProducts.length} products</Text>
                  <Text style={styles.listHeaderSub}>Compare up to 2 items</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={renderEmpty}
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                onAddToCart={addToCart}
                onBuyNow={handleBuyNow}
                onToggleCompare={toggleCompare}
                onViewRatings={(product) => {
                  setRatingsModalProduct(product);
                  setShowRatingsModal(true);
                }}
                travelInfo={item.hasRegisteredStore ? travelByStore[item.storeId] : null}
                travelLoading={travelLoading}
              />
            )}
          />
        </View>
      </View>

      {comparedSuppliers.length > 0 ? (
        <View style={styles.stickyFooter}>
          <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stickyFooterGradient}>
            <View>
              <Text style={styles.footerLabel}>{comparedSuppliers.length} selected for compare</Text>
              <Text style={styles.footerHint}>Compare price, rating & delivery</Text>
            </View>
            <TouchableOpacity style={styles.compareFooterBtn} onPress={() => setShowCompareModal(true)} activeOpacity={0.85}>
              <Text style={styles.compareFooterBtnText}>Compare</Text>
              <Ionicons name="git-compare-outline" size={16} color={theme.accent} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : null}

      <Modal visible={showCompareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.compareModal}>
            <View style={styles.sheetHandle} />
            <View style={styles.compareModalHeader}>
              <Text style={styles.compareModalTitle}>Compare suppliers</Text>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.compareScroll} contentContainerStyle={styles.compareScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.compareCardsRow}>
                {comparedSuppliers.map((p) => (
                  <View key={p.id} style={styles.compareCard}>
                    <View style={styles.compareCardIcon}>
                      <Image source={getProductImageSource(p)} style={styles.compareCardIconImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.compareCardName} numberOfLines={2}>{p.supplierName}</Text>
                    <Text style={styles.compareCardProduct} numberOfLines={2}>{p.productName}</Text>
                  </View>
                ))}
                {comparedSuppliers.length === 1 ? (
                  <View style={styles.compareCard}>
                    <Ionicons name="add-circle-outline" size={28} color={theme.textMuted} />
                    <Text style={styles.compareCardPlaceholder}>Select one more product</Text>
                  </View>
                ) : null}
              </View>
              {comparedSuppliers.length >= 2 ? (
                <>
                  {[
                    { title: "Price per unit", left: `₹${comparedSuppliers[0].price}`, right: `₹${comparedSuppliers[1].price}`, best: comparedSuppliers[1].price <= comparedSuppliers[0].price ? "right" : "left" },
                    { title: "Customer rating", left: `${comparedSuppliers[0].rating} ★ (${comparedSuppliers[0].reviewCount})`, right: `${comparedSuppliers[1].rating} ★ (${comparedSuppliers[1].reviewCount})`, best: comparedSuppliers[1].rating >= comparedSuppliers[0].rating ? "right" : "left" },
                    { title: "Estimated delivery", left: comparedSuppliers[0].delivery, right: comparedSuppliers[1].delivery, best: null },
                  ].map((row) => (
                    <View key={row.title} style={styles.compareSection}>
                      <Text style={styles.compareSectionTitle}>{row.title}</Text>
                      <View style={styles.compareSectionRow}>
                        <Text style={[styles.compareCell, row.best === "left" && styles.compareCellBest]}>{row.left}</Text>
                        <Text style={[styles.compareCell, styles.compareCellRight, row.best === "right" && styles.compareCellBest]}>{row.right}</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterSheet(false)}>
          <View style={styles.filterSheetContent} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter products</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterSheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionLabel}>Size (jar / bottle)</Text>
              <View style={styles.filterChipsRow}>
                {SIZE_RANGES.map((r) => {
                  const selected = sizeRangeSelected.includes(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.filterSheetChip, selected && styles.filterSheetChipActive]}
                      onPress={() => toggleFilterOption(sizeRangeSelected, setSizeRangeSelected, r.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.filterSheetChipText, selected && styles.filterSheetChipTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterSliderRow}>
                <Text style={styles.filterSliderLabel}>Capacity range (L)</Text>
                <View style={styles.filterStepperRow}>
                  {[
                    { label: "Min", value: sizeSliderMin, dec: () => setSizeSliderMin((m) => Math.max(1, m - 5)), inc: () => setSizeSliderMin((m) => Math.min(sizeSliderMax - 1, m + 5)) },
                    { label: "Max", value: sizeSliderMax, dec: () => setSizeSliderMax((x) => Math.max(sizeSliderMin + 1, x - 50)), inc: () => setSizeSliderMax((x) => Math.min(5000, x + 50)) },
                  ].map((step) => (
                    <View key={step.label} style={styles.filterStepper}>
                      <Text style={styles.filterStepperLabel}>{step.label}</Text>
                      <View style={styles.filterStepperControls}>
                        <TouchableOpacity style={styles.filterStepperBtn} onPress={step.dec}>
                          <Ionicons name="remove" size={18} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.filterStepperValue}>{step.value}</Text>
                        <TouchableOpacity style={styles.filterStepperBtn} onPress={step.inc}>
                          <Ionicons name="add" size={18} color={theme.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.filterSectionLabel}>Bulk & tanker</Text>
              <View style={styles.filterOptionsRow}>
                {EXTRA_OPTIONS.map((o) => {
                  const selected = extraSelected.includes(o.id);
                  return (
                    <TouchableOpacity key={o.id} style={styles.filterOptionRow} onPress={() => toggleFilterOption(extraSelected, setExtraSelected, o.id)} activeOpacity={0.85}>
                      <View style={[styles.filterCheckbox, selected && styles.filterCheckboxChecked]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                      <Text style={styles.filterOptionLabel}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.filterSectionLabel}>Order for</Text>
              <View style={styles.filterOptionsRow}>
                {USE_CASE_OPTIONS.map((o) => {
                  const selected = useCaseSelected.includes(o.id);
                  return (
                    <TouchableOpacity key={o.id} style={styles.filterOptionRow} onPress={() => toggleFilterOption(useCaseSelected, setUseCaseSelected, o.id)} activeOpacity={0.85}>
                      <View style={[styles.filterCheckbox, selected && styles.filterCheckboxChecked]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                      <Text style={styles.filterOptionLabel}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.filterSheetFooter}>
              <TouchableOpacity
                style={styles.filterClearBtn}
                onPress={() => {
                  setSizeRangeSelected([]);
                  setExtraSelected([]);
                  setUseCaseSelected([]);
                  setSizeSliderMin(1);
                  setSizeSliderMax(500);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.filterClearText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilterSheet(false)} activeOpacity={0.9}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.filterApplyGradient}>
                  <Text style={styles.filterApplyText}>Apply filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showLocationPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLocationPicker(false)}>
          <View style={styles.locationSheetContent} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Delivery location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.locationOptionRow}
                onPress={async () => {
                  setShowLocationPicker(false);
                  try {
                    const coords = await getCurrentLocationCoords();
                    setCustomerCoords(coords);
                    setLocation("Current location");
                    const prev = getCheckoutDetails?.() || {};
                    setCheckoutDetails({
                      ...prev,
                      customerLatitude: coords.latitude,
                      customerLongitude: coords.longitude,
                    });
                  } catch (err) {
                    alert(err.message || "Could not get current location");
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.locationOptionIcon}>
                  <Ionicons name="navigate-circle-outline" size={20} color={theme.accent} />
                </View>
                <Text style={styles.locationOptionText}>Use current location</Text>
              </TouchableOpacity>
              {savedAddresses.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.locationOptionRow}
                  onPress={() => {
                    if (!String(a.phoneNumber || "").trim()) {
                      setShowLocationPicker(false);
                      alert("Selected address has no phone number. Please update it in Saved Addresses.");
                      router.push("/saved-addresses");
                      return;
                    }
                    setLocation(a.fullAddress || "Saved address");
                    if (a.latitude != null && a.longitude != null) {
                      setCustomerCoords({ latitude: a.latitude, longitude: a.longitude });
                    }
                    const prev = getCheckoutDetails?.() || {};
                    const fields = addressToCheckoutFields(a);
                    setCheckoutDetails({ ...prev, ...fields });
                    setShowLocationPicker(false);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.locationOptionIcon}>
                    <Ionicons name="location-outline" size={20} color={theme.accent} />
                  </View>
                  <Text style={styles.locationOptionText} numberOfLines={2}>{a.fullAddress || "Saved address"}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.locationOptionRow, styles.locationOptionRowLast]}
                onPress={() => {
                  setShowLocationPicker(false);
                  router.push("/saved-addresses");
                }}
                activeOpacity={0.85}
              >
                <View style={styles.locationOptionIcon}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
                </View>
                <Text style={[styles.locationOptionText, styles.locationOptionAdd]}>Add new address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ProductRatingsModal
        visible={showRatingsModal}
        onClose={() => {
          setShowRatingsModal(false);
          setRatingsModalProduct(null);
        }}
        product={ratingsModalProduct}
      />
    </SafeAreaView>
  );
};

export default OrderScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden", zIndex: 1 },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.accent,
  },
  cartBadgeText: { fontSize: 10, fontWeight: "800", color: theme.accent },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4, marginBottom: 12 },
  locationCard: { borderRadius: 18, overflow: "hidden" },
  locationCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextWrap: { flex: 1, minWidth: 0 },
  locationLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  locationText: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginTop: 2 },

  headerSearchSection: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 10 },
  headerSearchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    padding: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : {}),
  },
  headerFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    flexShrink: 0,
  },
  headerSortContent: { paddingBottom: 4, alignItems: "center", paddingRight: 12 },
  headerFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  headerFilterChipActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  headerFilterChipText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.95)" },
  headerFilterChipTextActive: { fontSize: 12, fontWeight: "700", color: theme.accent },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    zIndex: 2,
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 0 },
    }),
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF" },

  productList: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 },
  listContentEmpty: { flexGrow: 1, paddingBottom: 40 },
  listContentWithFooter: { paddingBottom: 110 },
  listHeader: { marginBottom: 12, paddingHorizontal: 4 },
  listHeaderTitle: { fontSize: 15, fontWeight: "800", color: theme.textPrimary },
  listHeaderSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  gridRow: { justifyContent: "space-between", gap: 10, marginBottom: 10 },
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  gridImageWrap: { position: "relative", height: 118 },
  gridImageBg: { flex: 1, alignItems: "center", justifyContent: "center" },
  gridImage: { width: 72, height: 72 },
  gridBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: theme.accent,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridBadgePremium: { backgroundColor: "#7C3AED" },
  gridBadgeText: { fontSize: 8, fontWeight: "800", color: "#FFFFFF", textTransform: "uppercase" },
  gridCompareBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  gridCompareBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  gridStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridStockText: { fontSize: 11, fontWeight: "800", color: "#DC2626" },
  gridRatingRow: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingTop: 8 },
  gridRatingText: { fontSize: 11, fontWeight: "800", color: theme.textPrimary },
  gridRatingCount: { fontSize: 10, color: theme.textMuted },
  gridName: { fontSize: 13, fontWeight: "700", color: theme.textPrimary, lineHeight: 17, paddingHorizontal: 10, marginTop: 4, minHeight: 34 },
  gridSupplier: { fontSize: 10, fontWeight: "600", color: theme.accent, paddingHorizontal: 10, marginTop: 2 },
  gridMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, marginTop: 4 },
  gridMetaText: { flex: 1, fontSize: 10, color: theme.textMuted },
  noStoreHint: { fontSize: 10, color: "#B45309", marginTop: 2, lineHeight: 14 },
  gridPrice: { fontSize: 18, fontWeight: "800", color: theme.accent, paddingHorizontal: 10, marginTop: 6 },
  gridPriceUnit: { fontSize: 10, color: theme.textMuted, paddingHorizontal: 10, marginTop: 1 },
  gridActions: { flexDirection: "row", gap: 6, padding: 10, paddingTop: 8 },
  gridCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(51,175,193,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  gridBuyWrap: { flex: 1 },
  gridBuyBtn: { height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gridBuyText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  gridUnavailable: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  gridUnavailableText: { fontSize: 12, fontWeight: "600", color: theme.textMuted },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 28 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", lineHeight: 20 },
  emptyTextSub: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 8, lineHeight: 18 },
  retryBtn: {
    marginTop: 18,
    backgroundColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50 },
  stickyFooterGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  footerLabel: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  footerHint: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  compareFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  compareFooterBtnText: { fontSize: 14, fontWeight: "800", color: theme.accent },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  filterSheetContent: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingBottom: 20,
  },
  filterSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  filterSheetTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary },
  filterSheetScroll: { maxHeight: 420, paddingHorizontal: 20 },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
    marginTop: 14,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterSheetChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  filterSheetChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  filterSheetChipText: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
  filterSheetChipTextActive: { color: "#FFFFFF" },
  filterSliderRow: { marginTop: 8, marginBottom: 8 },
  filterSliderLabel: { fontSize: 13, fontWeight: "600", color: theme.textPrimary, marginBottom: 10 },
  filterStepperRow: { flexDirection: "row", gap: 12 },
  filterStepper: { flex: 1 },
  filterStepperLabel: { fontSize: 11, fontWeight: "600", color: theme.textMuted, marginBottom: 6 },
  filterStepperControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  filterStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterStepperValue: { flex: 1, fontSize: 16, fontWeight: "800", color: theme.textPrimary, textAlign: "center" },
  filterOptionsRow: { gap: 2 },
  filterOptionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  filterCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterCheckboxChecked: { backgroundColor: theme.accent, borderColor: theme.accent },
  filterOptionLabel: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  filterSheetFooter: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  filterClearBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  filterClearText: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  filterApplyBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
  filterApplyGradient: { paddingVertical: 14, alignItems: "center" },
  filterApplyText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  locationSheetContent: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "72%",
    paddingBottom: 16,
  },
  locationList: { maxHeight: 420, paddingHorizontal: 20 },
  locationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,234,242,0.95)",
  },
  locationOptionRowLast: { borderBottomWidth: 0 },
  locationOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationOptionText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary, lineHeight: 19 },
  locationOptionAdd: { color: theme.link, fontWeight: "700" },

  compareModal: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  compareModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  compareModalTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary },
  compareScroll: { flexGrow: 0 },
  compareScrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  compareCardsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  compareCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  compareCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  compareCardIconImage: { width: 36, height: 36 },
  compareCardName: { fontSize: 13, fontWeight: "800", color: theme.textPrimary, textAlign: "center" },
  compareCardProduct: { fontSize: 11, color: theme.textMuted, marginTop: 4, textAlign: "center" },
  compareCardPlaceholder: { fontSize: 12, color: theme.textMuted, textAlign: "center", marginTop: 8 },
  compareSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  compareSectionTitle: { fontSize: 11, fontWeight: "700", color: theme.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  compareSectionRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  compareCell: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.textPrimary },
  compareCellRight: { textAlign: "right" },
  compareCellBest: { color: "#059669", fontWeight: "800" },
});
