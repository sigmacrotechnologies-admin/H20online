import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "@/src/context/CartContext";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import { useAppBack } from "@/src/utils/navigation";
import { theme } from "@/src/theme";

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
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("file://") || raw.startsWith("content://")) {
      return { uri: raw };
    }
  }
  return defaultProductIcon;
}

function CartHeader({ cartCount, onBack, showSubtitle = true }) {
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  return (
    <View style={styles.headerSection}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
      >
        <View style={styles.headerTopRow}>
          <BackButton onPress={onBack} fallback="/order" />
          <AppLogo size="header" />
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.headerTitle}>My cart</Text>
        {showSubtitle ? (
          <Text style={styles.headerSubtitle}>
            {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""} ready for checkout` : "Your cart is empty"}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function CartItemCard({ item, onDecrease, onIncrease, onRemove }) {
  const qty = item.qty || 1;
  const lineTotal = (item.price || 0) * qty;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemMainRow}>
        <View style={styles.itemImageWrap}>
          <LinearGradient colors={["#E0F7FA", "#F8FDFF"]} style={styles.itemImageBg}>
            <Image source={getProductImageSource(item)} style={styles.itemImage} resizeMode="contain" />
          </LinearGradient>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
          <View style={styles.supplierRow}>
            <Ionicons name="storefront-outline" size={12} color={theme.accent} />
            <Text style={styles.itemSupplier} numberOfLines={1}>{item.supplierName}</Text>
          </View>
          <Text style={styles.itemUnitPrice}>₹{item.price} each</Text>
          <Text style={styles.itemLineTotal}>₹{lineTotal}</Text>
        </View>
      </View>

      <View style={styles.itemActionsRow}>
        <View style={styles.qtyStepper}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} activeOpacity={0.8}>
            <Ionicons name="remove" size={18} color={theme.accent} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CartScreen = () => {
  const router = useRouter();
  const handleBack = useAppBack("/order");
  const { cart, cartTotal, updateCartQty, removeFromCart } = useCart();

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pageBody}>
          <CartHeader cartCount={0} onBack={handleBack} />
          <View style={styles.contentSection}>
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cart-outline" size={40} color={theme.accent} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptyText}>Browse products and add water jars or bottles to get started.</Text>
              <TouchableOpacity style={styles.shopBtnWrap} onPress={() => router.replace("/order")} activeOpacity={0.9}>
                <LinearGradient colors={[theme.medium, theme.accent]} style={styles.shopBtn}>
                  <Text style={styles.shopBtnText}>Browse products</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const itemCount = cart.reduce((sum, i) => sum + (i.qty || 1), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <CartHeader cartCount={itemCount} onBack={handleBack} />

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryBanner}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                <View style={styles.summaryBannerIcon}>
                  <Ionicons name="bag-handle-outline" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.summaryBannerLabel}>Cart summary</Text>
                  <Text style={styles.summaryBannerValue}>{itemCount} item{itemCount !== 1 ? "s" : ""} · ₹{cartTotal}</Text>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.sectionEyebrow}>Items</Text>
            {cart.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onDecrease={() => updateCartQty(item.id, (item.qty || 1) - 1)}
                onIncrease={() => updateCartQty(item.id, (item.qty || 1) + 1)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}

            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill details</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total</Text>
                <Text style={styles.billValue}>₹{cartTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery</Text>
                <Text style={styles.billValueFree}>Calculated at checkout</Text>
              </View>
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>To pay</Text>
                <Text style={styles.billTotalValue}>₹{cartTotal}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.continueLink} onPress={() => router.replace("/order")} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color={theme.link} />
              <Text style={styles.continueLinkText}>Add more products</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerLabel}>{itemCount} items</Text>
          <Text style={styles.footerTotal}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtnWrap} onPress={() => router.push("/checkout")} activeOpacity={0.9}>
          <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkoutBtn}>
            <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 18 },

  contentSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 130 },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  summaryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBannerLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryBannerValue: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  itemMainRow: { flexDirection: "row", gap: 12 },
  itemImageWrap: { width: 76, height: 76, borderRadius: 16, overflow: "hidden" },
  itemImageBg: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemImage: { width: 52, height: 52 },
  itemDetails: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 15, fontWeight: "800", color: theme.textPrimary, lineHeight: 19 },
  supplierRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  itemSupplier: { flex: 1, fontSize: 11, fontWeight: "600", color: theme.accent },
  itemUnitPrice: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  itemLineTotal: { fontSize: 18, fontWeight: "800", color: theme.accent, marginTop: 2 },
  itemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  qtyValue: { fontSize: 16, fontWeight: "800", color: theme.textPrimary, minWidth: 28, textAlign: "center" },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
  removeText: { fontSize: 13, color: "#EF4444", fontWeight: "700" },

  billCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  billTitle: { fontSize: 16, fontWeight: "800", color: theme.textPrimary, marginBottom: 14 },
  billRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  billLabel: { fontSize: 14, color: theme.textMuted },
  billValue: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  billValueFree: { fontSize: 13, fontWeight: "600", color: theme.accent },
  billDivider: { height: 1, backgroundColor: "rgba(214,234,242,0.95)", marginVertical: 8 },
  billTotalLabel: { fontSize: 15, fontWeight: "800", color: theme.textPrimary },
  billTotalValue: { fontSize: 22, fontWeight: "800", color: theme.accent },

  continueLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 8,
  },
  continueLinkText: { fontSize: 14, fontWeight: "700", color: theme.link },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: "center", lineHeight: 20 },
  shopBtnWrap: { marginTop: 24, borderRadius: 16, overflow: "hidden", alignSelf: "stretch" },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  shopBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  footerSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  footerLabel: { fontSize: 13, fontWeight: "600", color: theme.textMuted },
  footerTotal: { fontSize: 22, fontWeight: "800", color: theme.accent },
  checkoutBtnWrap: { borderRadius: 16, overflow: "hidden" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  checkoutBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
