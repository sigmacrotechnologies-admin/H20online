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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useCart } from "@/src/context/CartContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import { theme } from "@/src/theme";
import ProductRatingsModal from "@/src/components/ProductRatingsModal";
import { useFocusEffect } from "expo-router";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "price", label: "Price" },
  { id: "delivery", label: "Delivery Time" },
  { id: "rating", label: "Rating" },
  { id: "distance", label: "Supplier Distance" },
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

const OrderScreen = () => {
  const router = useRouter();
  const { cartCount, addToCart, setCartForBuyNow, setCheckoutDetails } = useCart();
  const [location, setLocation] = useState("Current location (tap to change)");
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
      .list()
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
  }, []);

  const loadSavedAddresses = useCallback(async () => {
    try {
      const list = await api.addresses.list();
      const safe = Array.isArray(list) ? list : [];
      setSavedAddresses(safe);
      const defaultEntry = safe.find((a) => a.isDefault) || safe[0] || null;
      const defaultAddress = defaultEntry?.fullAddress || "";
      if (defaultAddress && (!location || location.includes("Current location"))) {
        setLocation(defaultAddress);
      }
      if (defaultEntry?.fullAddress && defaultEntry?.phoneNumber) {
        setCheckoutDetails({
          address: defaultEntry.fullAddress,
          receiverPhone: defaultEntry.phoneNumber,
        });
      }
    } catch (_) {
      setSavedAddresses([]);
    }
  }, [location]);

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
    else if (activeFilter === "distance") list = [...list].sort((a, b) => (a.delivery || "").localeCompare(b.delivery || ""));
    return list;
  }, [products, searchQuery, activeFilter, sizeRangeSelected, extraSelected, useCaseSelected, sizeSliderMin, sizeSliderMax]);

  const handleBuyNow = (item) => {
    if (!item.inStock) return;
    const selectedByLocation = savedAddresses.find((a) => (a.fullAddress || "").trim() === (location || "").trim());
    const fallbackDefault = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null;
    const selectedAddress = selectedByLocation || fallbackDefault;
    if (selectedAddress?.fullAddress && selectedAddress?.phoneNumber) {
      setCheckoutDetails({
        address: selectedAddress.fullAddress,
        receiverPhone: selectedAddress.phoneNumber,
      });
    }
    setCartForBuyNow(item, 1);
    router.push("/checkout");
  };

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
  // Default icon if product has no assigned image.
  const defaultProductIcon = require("../../assets/images/Product-icon/Water-Camper.png");
  const getProductImageSource = (item) => {
    if (item?.imageUrl && PRODUCT_ASSET_MAP[item.imageUrl]) return PRODUCT_ASSET_MAP[item.imageUrl];
    if (item?.imageUrl) {
      const raw = String(item.imageUrl).trim();
      const isSafeRemote = raw.startsWith("http://") || raw.startsWith("https://");
      const isSafeLocal = raw.startsWith("file://") || raw.startsWith("content://");
      if (isSafeRemote || isSafeLocal) return { uri: raw };
    }
    return defaultProductIcon;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerOverlay}>
            {HEADER_DROPLETS.map((d, i) => (
              <View key={`order-drop-${i}`} style={[styles.dropletWrap, { left: d.left, right: d.right, top: d.top, width: d.width, height: d.height }]}>
                <Svg width="100%" height="100%" viewBox="0 0 60 80">
                  <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.28)" />
                </Svg>
              </View>
            ))}
          </View>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
              <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.locationRow} onPress={() => setShowLocationPicker(true)} activeOpacity={0.8}>
            <Ionicons name="location-outline" size={22} color={theme.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7C85" />
          </TouchableOpacity>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#6B7C85" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search water suppliers or brands"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowFilterSheet(true)} activeOpacity={0.7}>
              <Ionicons name="options-outline" size={24} color="#1B2B34" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.7}
              >
                <View style={styles.filterChipInner}>
                  <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, filteredAndSortedProducts.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={
          productsLoading ? (
            <View style={styles.emptyWrap}><Text style={styles.emptyText}>Loading products…</Text></View>
          ) : productsError ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Could not load products.</Text>
              <Text style={styles.emptyTextSub}>Backend running? Same Wi‑Fi? In mobile/.env set EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000 then restart Expo (npm start -c)</Text>
              <Text style={[styles.emptyText, { marginTop: 8 }]}>{productsError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setProductsLoading(true); setProductsError(null); api.products.list().then((raw) => { const list = Array.isArray(raw) ? raw : []; setProducts(list.map((p) => ({ ...p, compareSelected: false }))); }).catch((e) => setProductsError(e?.message || "Request failed")).finally(() => setProductsLoading(false)); }} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No products in database.</Text>
              <Text style={styles.emptyTextSub}>In backend folder run: npm run seed</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setProductsLoading(true); api.products.list().then((raw) => { const list = Array.isArray(raw) ? raw : []; setProducts(list.map((p) => ({ ...p, compareSelected: false }))); }).catch((e) => setProductsError(e?.message || "Request failed")).finally(() => setProductsLoading(false)); }} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.badge && (
              <View style={[styles.badge, item.badge === "premium" && styles.badgePremium]}>
                <Text style={styles.badgeText}>{item.badge === "subscription" ? "Available on Subscription" : "Premium Brand"}</Text>
              </View>
            )}
            <View style={styles.cardTopRow}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.supplierName}>{item.supplierName}</Text>
                <Text style={styles.priceText}>₹{item.price} / {item.priceUnit}</Text>
              </View>
              <View style={styles.cardIconWrap}>
                <Image source={getProductImageSource(item)} style={styles.productIconImage} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.ratingText}><Ionicons name="star" size={14} color="#EAB308" /> {item.rating} ({item.reviewCount} Reviews)</Text>
              <TouchableOpacity
                style={styles.viewRatingsLink}
                onPress={() => {
                  setRatingsModalProduct(item);
                  setShowRatingsModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.viewRatingsText}>View ratings</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.deliveryRow}>
              <Ionicons name="time-outline" size={16} color="#6B7C85" />
              <Text style={styles.deliveryText}>Est. {item.delivery}</Text>
            </View>
            {!item.inStock && <Text style={styles.outOfStock}>Out of Stock</Text>}
            <View style={styles.cardActions}>
              {item.inStock ? (
                <>
                  <TouchableOpacity style={styles.addCartBtn} onPress={() => addToCart(item)} activeOpacity={0.8}>
                    <Text style={styles.addCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buyNowBtn} onPress={() => handleBuyNow(item)} activeOpacity={0.8}>
                    <Text style={styles.buyNowBtnText}>Buy Now</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.unavailableBtn} disabled><Text style={styles.unavailableText}>Unavailable</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.notifyBtn} activeOpacity={0.8}><Text style={styles.notifyText}>Notify Me</Text></TouchableOpacity>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.compareRow} onPress={() => toggleCompare(item.id)} activeOpacity={0.7}>
              <View style={[styles.checkbox, item.compareSelected && styles.checkboxChecked]}>
                {item.compareSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.compareLabel}>Compare Supplier</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      </View>

      {comparedSuppliers.length > 0 && (
        <View style={styles.stickyFooter}>
          <Text style={styles.footerLabel}>{comparedSuppliers.length} supplier{comparedSuppliers.length > 1 ? "s" : ""} selected</Text>
          <TouchableOpacity style={styles.compareFooterBtn} onPress={() => setShowCompareModal(true)} activeOpacity={0.8}>
            <Text style={styles.compareFooterBtnText}>Compare</Text>
          </TouchableOpacity>
          <Text style={styles.footerHint}>Tap to compare prices & services</Text>
        </View>
      )}

      {/* Compare Suppliers Modal */}
      <Modal visible={showCompareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.compareModal}>
            <View style={styles.compareModalHeader}>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}><Ionicons name="chevron-back" size={24} color="#1B2B34" /></TouchableOpacity>
              <Text style={styles.compareModalTitle}>Compare Suppliers</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.compareScroll} contentContainerStyle={styles.compareScrollContent}>
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
                {comparedSuppliers.length === 1 && <View style={styles.compareCard}><Text style={styles.compareCardPlaceholder}>Select one more supplier to compare</Text></View>}
              </View>
              {comparedSuppliers.length >= 2 && (
                <>
                  <View style={styles.compareSection}>
                    <Text style={styles.compareSectionTitle}>PRICE PER JAR</Text>
                    <View style={styles.compareSectionRow}>
                      <Text style={styles.compareLeft}>₹{comparedSuppliers[0].price}</Text>
                      <Text style={styles.compareRight}>₹{comparedSuppliers[1].price}  BEST VALUE</Text>
                    </View>
                  </View>
                  <View style={styles.compareSection}>
                    <Text style={styles.compareSectionTitle}>CUSTOMER RATING</Text>
                    <View style={styles.compareSectionRow}>
                      <Text style={styles.compareLeft}>TOP RATED  {comparedSuppliers[0].rating} ★  {comparedSuppliers[0].reviewCount} reviews</Text>
                      <Text style={styles.compareRight}>{comparedSuppliers[1].rating} ★  {comparedSuppliers[1].reviewCount} reviews</Text>
                    </View>
                  </View>
                  <View style={styles.compareSection}>
                    <Text style={styles.compareSectionTitle}>ESTIMATED DELIVERY</Text>
                    <View style={styles.compareSectionRow}>
                      <Text style={styles.compareLeft}>FASTER  {comparedSuppliers[0].delivery}</Text>
                      <Text style={styles.compareRight}>{comparedSuppliers[1].delivery}</Text>
                    </View>
                  </View>
                  <View style={styles.compareSection}>
                    <Text style={styles.compareSectionTitle}>SERVICES & STOCK</Text>
                    <View style={styles.compareSectionRow}>
                      <View><Text style={styles.inStockGreen}>In Stock</Text><TouchableOpacity style={styles.subBtnSmall}><Text style={styles.subBtnSmallText}>Subscription</Text></TouchableOpacity></View>
                      <View><Text style={styles.lowStock}>Low Stock</Text><TouchableOpacity style={styles.subBtnSmall}><Text style={styles.subBtnSmallText}>Subscription</Text></TouchableOpacity></View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter sheet - from bottom */}
      <Modal visible={showFilterSheet} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterSheet(false)}>
          <View style={styles.filterSheetContent} onStartShouldSetResponder={() => true}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
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
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterSheetChipText, selected && styles.filterSheetChipTextActive]}>{r.label}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterSliderRow}>
                <Text style={styles.filterSliderLabel}>Capacity range (L)</Text>
                <View style={styles.filterStepperRow}>
                  <View style={styles.filterStepper}>
                    <Text style={styles.filterStepperLabel}>Min</Text>
                    <View style={styles.filterStepperControls}>
                      <TouchableOpacity style={styles.filterStepperBtn} onPress={() => setSizeSliderMin((m) => Math.max(1, m - 5))}>
                        <Ionicons name="remove" size={20} color="#1B2B34" />
                      </TouchableOpacity>
                      <Text style={styles.filterStepperValue}>{sizeSliderMin}</Text>
                      <TouchableOpacity style={styles.filterStepperBtn} onPress={() => setSizeSliderMin((m) => Math.min(sizeSliderMax - 1, m + 5))}>
                        <Ionicons name="add" size={20} color="#1B2B34" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.filterStepper}>
                    <Text style={styles.filterStepperLabel}>Max</Text>
                    <View style={styles.filterStepperControls}>
                      <TouchableOpacity style={styles.filterStepperBtn} onPress={() => setSizeSliderMax((x) => Math.max(sizeSliderMin + 1, x - 50))}>
                        <Ionicons name="remove" size={20} color="#1B2B34" />
                      </TouchableOpacity>
                      <Text style={styles.filterStepperValue}>{sizeSliderMax}</Text>
                      <TouchableOpacity style={styles.filterStepperBtn} onPress={() => setSizeSliderMax((x) => Math.min(5000, x + 50))}>
                        <Ionicons name="add" size={20} color="#1B2B34" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.filterSectionLabel}>Bulk & tanker</Text>
              <View style={styles.filterOptionsRow}>
                {EXTRA_OPTIONS.map((o) => {
                  const selected = extraSelected.includes(o.id);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={styles.filterOptionRow}
                      onPress={() => toggleFilterOption(extraSelected, setExtraSelected, o.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.filterCheckbox, selected && styles.filterCheckboxChecked]}>
                        {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.filterOptionLabel}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionLabel}>Order for (individual)</Text>
              <View style={styles.filterOptionsRow}>
                {USE_CASE_OPTIONS.map((o) => {
                  const selected = useCaseSelected.includes(o.id);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={styles.filterOptionRow}
                      onPress={() => toggleFilterOption(useCaseSelected, setUseCaseSelected, o.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.filterCheckbox, selected && styles.filterCheckboxChecked]}>
                        {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
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
                onPress={() => { setSizeRangeSelected([]); setExtraSelected([]); setUseCaseSelected([]); setSizeSliderMin(1); setSizeSliderMax(500); }}
                activeOpacity={0.8}
              >
                <Text style={styles.filterClearText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setShowFilterSheet(false)} activeOpacity={0.8}>
                <Text style={styles.filterApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location picker */}
      <Modal visible={showLocationPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLocationPicker(false)}>
          <View style={styles.locationSheetContent} onStartShouldSetResponder={() => true}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Select location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.locationList}>
              <TouchableOpacity
                style={styles.locationOptionRow}
                onPress={() => {
                  setLocation("Current location");
                  setShowLocationPicker(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-circle-outline" size={20} color={theme.primary} />
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
                    setCheckoutDetails({
                      address: a.fullAddress || "",
                      receiverPhone: a.phoneNumber || "",
                    });
                    setShowLocationPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location-outline" size={20} color="#1B2B34" />
                  <Text style={styles.locationOptionText} numberOfLines={2}>{a.fullAddress || "Saved address"}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.locationOptionRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowLocationPicker(false);
                  router.push("/saved-addresses");
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.locationOptionText, { color: theme.primary, fontWeight: "700" }]}>Add address</Text>
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
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerSection: { height: 286, overflow: "hidden", zIndex: 1 },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 10 },
  headerOverlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", position: "relative" },
  cartBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  cartBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    marginHorizontal: 0,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 46,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  locationText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 0, marginBottom: 12, gap: 10, minHeight: 46 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 46,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1B2B34", padding: 0 },
  filterIconBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.78)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  filterScroll: { height: Platform.OS === "android" ? 52 : 48, marginBottom: 8, flexGrow: 0, paddingTop: 0, paddingBottom: 0 },
  filterScrollContent: { paddingHorizontal: 0, flexDirection: "row", alignItems: "center", paddingVertical: Platform.OS === "android" ? 6 : 5 },
  contentSection: {
    marginTop: -10,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    flex: 1,
    overflow: "hidden",
    zIndex: 3,
    elevation: 2,
  },
  filterChip: { borderRadius: 14, backgroundColor: "rgba(255,255,255,0.88)", marginRight: 8, flexShrink: 0, minHeight: Platform.OS === "android" ? 40 : 38, justifyContent: "center", overflow: "visible", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  filterChipActive: { backgroundColor: theme.primary },
  filterChipInner: { paddingHorizontal: 12, paddingVertical: Platform.OS === "android" ? 7 : 6, justifyContent: "center", minHeight: Platform.OS === "android" ? 40 : 38 },
  filterChipText: { fontSize: 12, lineHeight: Platform.OS === "android" ? 16 : 15, fontWeight: "600", color: "#1B2B34", includeFontPadding: false, textAlignVertical: "center" },
  filterChipTextActive: { color: "#FFFFFF" },
  filterSheetContent: {
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: "25%",
    maxHeight: "75%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  filterSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 },
  filterSheetTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  filterSheetScroll: { maxHeight: 400, paddingHorizontal: 20 },
  filterSectionLabel: { fontSize: 14, fontWeight: "700", color: "#6B7C85", marginTop: 16, marginBottom: 10 },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterSheetChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  filterSheetChipActive: { backgroundColor: theme.primary },
  filterSheetChipText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  filterSheetChipTextActive: { color: "#FFFFFF" },
  filterSliderRow: { marginTop: 8, marginBottom: 8 },
  filterSliderLabel: { fontSize: 13, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  filterStepperRow: { flexDirection: "row", gap: 20 },
  filterStepper: { flex: 1 },
  filterStepperLabel: { fontSize: 12, color: "#6B7C85", marginBottom: 6 },
  filterStepperControls: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  filterStepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  filterStepperValue: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1B2B34", textAlign: "center" },
  filterOptionsRow: { gap: 4 },
  filterOptionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  filterCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#9CA3AF", marginRight: 12, justifyContent: "center", alignItems: "center" },
  filterCheckboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterOptionLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  filterSheetFooter: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  filterClearBtn: { flex: 1, backgroundColor: "#f0f7fcd7", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  filterClearText: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  filterApplyBtn: { flex: 1, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  filterApplyText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1 },
  emptyWrap: { paddingVertical: 40, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7C85", textAlign: "center" },
  emptyTextSub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 6 },
  retryBtn: { marginTop: 16, backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 },
  retryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  badge: { alignSelf: "flex-start", backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  badgePremium: { backgroundColor: "#8B5CF6" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitleWrap: { flex: 1, paddingRight: 10 },
  productName: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  supplierName: { fontSize: 13, color: "#6B7C85" },
  cardIconWrap: { width: 66, height: 66, borderRadius: 14, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginTop: 6 },
  productIconImage: { width: 52, height: 52 },
  cardMeta: { marginTop: 10 },
  ratingText: { fontSize: 13, color: "#1B2B34" },
  viewRatingsLink: { marginTop: 4 },
  viewRatingsText: { fontSize: 12, fontWeight: "700", color: theme.primary },
  priceText: { fontSize: 15, fontWeight: "800", color: theme.primary, marginTop: 8 },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  deliveryText: { fontSize: 13, color: "#6B7C85" },
  outOfStock: { fontSize: 13, color: "#EF4444", marginTop: 6, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  addCartBtn: { flex: 1, backgroundColor: theme.medium, paddingVertical: 13, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addCartText: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: "#FFFFFF" },
  buyNowBtn: { flex: 1, backgroundColor: theme.primary, paddingVertical: 13, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buyNowBtnText: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: "#FFFFFF" },
  unavailableBtn: { flex: 1, backgroundColor: "#E5E7EB", paddingVertical: 13, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  unavailableText: { fontSize: 14, lineHeight: 18, color: "#6B7C85" },
  notifyBtn: { flex: 1, backgroundColor: "#10B981", paddingVertical: 13, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifyText: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: "#FFFFFF" },
  compareRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#9CA3AF", justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  compareLabel: { fontSize: 13, color: "#6B7C85" },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: theme.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.35)",
    zIndex: 50,
    elevation: 16,
  },
  footerLabel: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" },
  compareFooterBtn: { backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  compareFooterBtnText: { fontSize: 14, fontWeight: "700", color: theme.primary },
  footerHint: { position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.9)" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  locationSheetContent: {
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 16,
  },
  locationList: { maxHeight: 420, paddingHorizontal: 20 },
  locationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  locationOptionText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  compareModal: {
    backgroundColor: "#E0F2F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  compareModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 12 },
  compareModalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  compareScroll: { flexGrow: 0 },
  compareScrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  compareCardsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  compareCard: {
    flex: 1,
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  compareCardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  compareCardIconImage: { width: 28, height: 28 },
  compareCardName: { fontSize: 14, fontWeight: "700", color: "#1B2B34", textAlign: "center" },
  compareCardProduct: { fontSize: 12, color: "#6B7C85", marginTop: 4, textAlign: "center" },
  compareCardPlaceholder: { fontSize: 13, color: "#6B7C85", textAlign: "center" },
  compareSection: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  compareSectionTitle: { fontSize: 12, fontWeight: "700", color: "#6B7C85", marginBottom: 10, letterSpacing: 0.5 },
  compareSectionRow: { flexDirection: "row", justifyContent: "space-between" },
  compareLeft: { fontSize: 14, color: "#1B2B34", flex: 1 },
  compareRight: { fontSize: 14, color: "#10B981", fontWeight: "600", flex: 1, textAlign: "right" },
  inStockGreen: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  lowStock: { fontSize: 13, color: "#F59E0B", fontWeight: "600" },
  subBtnSmall: { marginTop: 6, alignSelf: "flex-start", backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  subBtnSmallText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
});
