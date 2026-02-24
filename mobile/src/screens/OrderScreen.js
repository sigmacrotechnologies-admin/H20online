import React, { useState, useMemo } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "price", label: "Price" },
  { id: "delivery", label: "Delivery Time" },
  { id: "rating", label: "Rating" },
  { id: "distance", label: "Supplier Distance" },
];

// capacityL = main size in liters for filtering; categories: party, office, bulk, tanker
const INITIAL_PRODUCTS = [
  { id: "1", productName: "AquaPure Premium 20L Jar", supplierName: "AquaPure Water Co.", supplierId: "s1", badge: "subscription", rating: 4.8, reviewCount: "1.2k", price: 180, priceUnit: "20L Jar", delivery: "20-30 min", inStock: true, capacityL: 20, categories: ["party", "office"] },
  { id: "2", productName: "BlueSprings Local 20L Jar", supplierName: "BlueSprings Hydration Hub", supplierId: "s2", rating: 4.2, reviewCount: "450", price: 120, priceUnit: "20L Jar", delivery: "45 min", inStock: true, capacityL: 20, categories: ["office"] },
  { id: "3", productName: "Himalayan Mineral Pack (12x Bottles)", supplierName: "Himalayan Springs Pvt. Ltd.", supplierId: "s3", badge: "premium", rating: 4.9, reviewCount: "2.1k", price: 340, priceUnit: "Box (12x)", delivery: "Next Day", inStock: true, capacityL: 12, categories: ["party"] },
  { id: "4", productName: "Crystal Clear 20L Jar", supplierName: "Crystal Hydration Services", supplierId: "s4", rating: 3.8, reviewCount: "120", price: 140, priceUnit: "20L Jar", delivery: "60 min", inStock: false, capacityL: 20, categories: [] },
  { id: "5", productName: "PureDrop 20L Jar", supplierName: "AquaPure Water Co.", supplierId: "s1", rating: 4.5, reviewCount: "890", price: 165, priceUnit: "20L Jar", delivery: "25-35 min", inStock: true, capacityL: 20, categories: ["party", "office"] },
  { id: "6", productName: "Mountain Fresh 1L Bottles (24x)", supplierName: "Himalayan Springs Pvt. Ltd.", supplierId: "s3", badge: "premium", rating: 4.7, reviewCount: "560", price: 399, priceUnit: "Case", delivery: "Next Day", inStock: true, capacityL: 1, categories: ["party"] },
  { id: "7", productName: "Bulk Water 500L Tank", supplierName: "AquaPure Water Co.", supplierId: "s1", rating: 4.6, reviewCount: "89", price: 2500, priceUnit: "500L", delivery: "1-2 days", inStock: true, capacityL: 500, categories: ["bulk"] },
  { id: "8", productName: "Water Tanker 2000L", supplierName: "Crystal Hydration Services", supplierId: "s4", rating: 4.4, reviewCount: "56", price: 8000, priceUnit: "2000L", delivery: "2-3 days", inStock: true, capacityL: 2000, categories: ["tanker"] },
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

const OrderScreen = () => {
  const router = useRouter();
  const { cartCount, addToCart } = useCart();
  const [location, setLocation] = useState("Current location (tap to change)");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [products, setProducts] = useState(INITIAL_PRODUCTS.map((p) => ({ ...p, compareSelected: false })));
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeProduct, setSubscribeProduct] = useState(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sizeRangeSelected, setSizeRangeSelected] = useState([]);
  const [extraSelected, setExtraSelected] = useState([]);
  const [useCaseSelected, setUseCaseSelected] = useState([]);
  const [sizeSliderMin, setSizeSliderMin] = useState(1);
  const [sizeSliderMax, setSizeSliderMax] = useState(500);

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
    const unique = [];
    const seen = new Set();
    selected.forEach((p) => {
      if (!seen.has(p.supplierId)) {
        seen.add(p.supplierId);
        unique.push(p);
      }
    });
    return unique.slice(0, 2);
  }, [products]);

  const toggleFilterOption = (arr, setArr, id) => {
    setArr((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredAndSortedProducts = useMemo(() => {
    let list = products.filter(
      (p) =>
        p.productName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase().trim())
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
    else if (activeFilter === "distance") list = [...list].sort((a, b) => a.delivery.localeCompare(b.delivery));
    return list;
  }, [products, searchQuery, activeFilter, sizeRangeSelected, extraSelected, useCaseSelected, sizeSliderMin, sizeSliderMax]);

  const openSubscribe = (product) => {
    setSubscribeProduct(product);
    setShowSubscribeModal(true);
  };

  const handleSubscribeSave = () => {
    setShowSubscribeModal(false);
    setSubscribeProduct(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1B2B34" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Water</Text>
        <TouchableOpacity style={styles.cartIconBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
          <Ionicons name="cart-outline" size={24} color="#1B2B34" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.locationRow} onPress={() => {}} activeOpacity={0.8}>
        <Ionicons name="location-outline" size={22} color="#0EA5E9" />
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

      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
              </View>
              <View style={styles.cardIconWrap}>
                <Ionicons name={item.badge === "premium" ? "sparkles" : "water"} size={28} color="#0EA5E9" />
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.ratingText}><Ionicons name="star" size={14} color="#EAB308" /> {item.rating} ({item.reviewCount} Reviews)</Text>
            </View>
            <Text style={styles.priceText}>₹{item.price} / {item.priceUnit}</Text>
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
                  <TouchableOpacity style={styles.subscribeBtn} onPress={() => openSubscribe(item)} activeOpacity={0.8}>
                    <Text style={styles.subscribeBtnText}>Subscribe</Text>
                    <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
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
                    <View style={styles.compareCardIcon}><Ionicons name="water" size={28} color="#0EA5E9" /></View>
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

      {/* Subscribe Modal - calendar / dates placeholder */}
      <Modal visible={showSubscribeModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSubscribeModal(false)}>
          <View style={styles.subscribeModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.subscribeModalHeader}>
              <Text style={styles.subscribeModalTitle}>Subscribe</Text>
              <TouchableOpacity onPress={() => setShowSubscribeModal(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            {subscribeProduct && (
              <>
                <Text style={styles.subscribeProductName}>{subscribeProduct.productName}</Text>
                <Text style={styles.subscribeHint}>Monthly subscription. Select delivery dates (e.g. 1st, 15th). Calendar integration can be added later.</Text>
                <TouchableOpacity style={styles.subscribeSaveBtn} onPress={handleSubscribeSave} activeOpacity={0.8}>
                  <Text style={styles.subscribeSaveText}>Save subscription</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
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
    </SafeAreaView>
  );
};

export default OrderScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  cartIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", position: "relative" },
  cartBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#0EA5E9", justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  cartBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  locationRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 16, gap: 10 },
  locationText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 8, gap: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1B2B34", padding: 0 },
  filterIconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center" },
  filterScroll: { marginBottom: 16, flexGrow: 0, paddingTop: 4, paddingBottom: 4 },
  filterScrollContent: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  filterChip: { borderRadius: 20, backgroundColor: "#f0f7fcd7", marginRight: 10, flexShrink: 0, minHeight: 44, justifyContent: "center", overflow: "hidden" },
  filterChipActive: { backgroundColor: "#0EA5E9" },
  filterChipInner: { paddingHorizontal: 18, paddingVertical: 12, justifyContent: "center", minHeight: 44 },
  filterChipText: { fontSize: 15, fontWeight: "600", color: "#1B2B34", includeFontPadding: false },
  filterChipTextActive: { color: "#FFFFFF" },
  filterSheetContent: { backgroundColor: "#c6e2fa", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: "25%", maxHeight: "75%", paddingBottom: 24 },
  filterSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 },
  filterSheetTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  filterSheetScroll: { maxHeight: 400, paddingHorizontal: 20 },
  filterSectionLabel: { fontSize: 14, fontWeight: "700", color: "#6B7C85", marginTop: 16, marginBottom: 10 },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterSheetChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  filterSheetChipActive: { backgroundColor: "#0EA5E9" },
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
  filterCheckboxChecked: { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" },
  filterOptionLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  filterSheetFooter: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  filterClearBtn: { flex: 1, backgroundColor: "#f0f7fcd7", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  filterClearText: { fontSize: 16, fontWeight: "600", color: "#1B2B34" },
  filterApplyBtn: { flex: 1, backgroundColor: "#0EA5E9", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  filterApplyText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2 },
  badge: { alignSelf: "flex-start", backgroundColor: "#0EA5E9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  badgePremium: { backgroundColor: "#8B5CF6" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitleWrap: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "700", color: "#1B2B34", marginBottom: 4 },
  supplierName: { fontSize: 13, color: "#6B7C85" },
  cardIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  cardMeta: { marginTop: 10 },
  ratingText: { fontSize: 13, color: "#1B2B34" },
  priceText: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginTop: 8 },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  deliveryText: { fontSize: 13, color: "#6B7C85" },
  outOfStock: { fontSize: 13, color: "#EF4444", marginTop: 6, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  addCartBtn: { flex: 1, backgroundColor: "#10B981", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  addCartText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  subscribeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#0EA5E9", paddingVertical: 12, borderRadius: 12 },
  subscribeBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  unavailableBtn: { flex: 1, backgroundColor: "#E5E7EB", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  unavailableText: { fontSize: 14, color: "#6B7C85" },
  notifyBtn: { flex: 1, backgroundColor: "#10B981", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  notifyText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  compareRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#9CA3AF", justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" },
  compareLabel: { fontSize: 13, color: "#6B7C85" },
  stickyFooter: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, backgroundColor: "#1E40AF", marginHorizontal: 11 },
  footerLabel: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" },
  compareFooterBtn: { backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  compareFooterBtnText: { fontSize: 14, fontWeight: "700", color: "#1E40AF" },
  footerHint: { position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.9)" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  compareModal: { backgroundColor: "#E0F2F7", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingBottom: 24 },
  compareModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 12 },
  compareModalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  compareScroll: { flexGrow: 0 },
  compareScrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  compareCardsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  compareCard: { flex: 1, backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 16, alignItems: "center" },
  compareCardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  compareCardName: { fontSize: 14, fontWeight: "700", color: "#1B2B34", textAlign: "center" },
  compareCardProduct: { fontSize: 12, color: "#6B7C85", marginTop: 4, textAlign: "center" },
  compareCardPlaceholder: { fontSize: 13, color: "#6B7C85", textAlign: "center" },
  compareSection: { backgroundColor: "#f0f7fcd7", borderRadius: 12, padding: 16, marginBottom: 12 },
  compareSectionTitle: { fontSize: 12, fontWeight: "700", color: "#6B7C85", marginBottom: 10, letterSpacing: 0.5 },
  compareSectionRow: { flexDirection: "row", justifyContent: "space-between" },
  compareLeft: { fontSize: 14, color: "#1B2B34", flex: 1 },
  compareRight: { fontSize: 14, color: "#10B981", fontWeight: "600", flex: 1, textAlign: "right" },
  inStockGreen: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  lowStock: { fontSize: 13, color: "#F59E0B", fontWeight: "600" },
  subBtnSmall: { marginTop: 6, alignSelf: "flex-start", backgroundColor: "#0EA5E9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  subBtnSmallText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  subscribeModalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, marginTop: "40%" },
  subscribeModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  subscribeModalTitle: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  subscribeProductName: { fontSize: 16, color: "#1B2B34", marginBottom: 12 },
  subscribeHint: { fontSize: 13, color: "#6B7C85", marginBottom: 20 },
  subscribeSaveBtn: { backgroundColor: "#0EA5E9", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  subscribeSaveText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
