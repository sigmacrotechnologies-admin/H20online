import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import { theme } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import WalletModal from "@/src/components/WalletModal";
import { api } from "@/src/api/client";
import { ModernInput } from "@/src/components/modern";
import RouteMapPreview from "@/src/components/RouteMapPreview";
import StoreTravelBadge from "@/src/components/StoreTravelBadge";
import { useStoreTravelInfo } from "@/src/hooks/useStoreTravel";

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const CheckoutScreen = () => {
  const router = useRouter();
  const { cart, cartCount, cartTotal, setCheckoutDetails, getCheckoutDetails } = useCart();
  const { balance } = useWallet();
  const [fullAddress, setFullAddress] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [orderForSomeoneElse, setOrderForSomeoneElse] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhoneOther, setReceiverPhoneOther] = useState("");
  const [accountOwnerPhone, setAccountOwnerPhone] = useState("+91 98765 43210");
  const [instantDelivery, setInstantDelivery] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledHour, setScheduledHour] = useState("09");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [couponCode, setCouponCode] = useState("");
  const [showWallet, setShowWallet] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);
  const [customerCoords, setCustomerCoords] = useState(null);
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const dateOptions = useMemo(() => {
    const base = new Date();
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const isoDate = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        weekday: "short",
      });
      out.push({ value: isoDate, label });
    }
    return out;
  }, []);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

  useFocusEffect(
    useCallback(() => {
      if (cart.length === 0) router.replace("/cart");
      const details = getCheckoutDetails?.();
      if (details?.address) setFullAddress(details.address);
      if (details?.receiverPhone) setReceiverPhone(details.receiverPhone);
      if (details?.customerLatitude != null && details?.customerLongitude != null) {
        setCustomerCoords({ latitude: details.customerLatitude, longitude: details.customerLongitude });
      }
      if (!details?.address || !details?.receiverPhone) {
        api.addresses
          .list()
          .then((list) => {
            const safe = Array.isArray(list) ? list : [];
            const defaultEntry = safe.find((a) => a.isDefault) || safe[0] || null;
            if (!details?.address && defaultEntry?.fullAddress) setFullAddress(defaultEntry.fullAddress);
            if (!details?.receiverPhone && defaultEntry?.phoneNumber) setReceiverPhone(defaultEntry.phoneNumber);
            if (defaultEntry?.latitude != null && defaultEntry?.longitude != null) {
              setCustomerCoords({ latitude: defaultEntry.latitude, longitude: defaultEntry.longitude });
            }
          })
          .catch(() => {});
      }
    }, [cart.length, getCheckoutDetails, router])
  );

  const storeDestinations = useMemo(() => {
    const map = new Map();
    cart.forEach((i) => {
      if (i.hasRegisteredStore && i.storeId && i.storeLatitude != null && i.storeLongitude != null) {
        map.set(i.storeId, {
          id: i.storeId,
          lat: i.storeLatitude,
          lng: i.storeLongitude,
          name: i.storeName || "",
        });
      }
    });
    return [...map.values()];
  }, [cart]);
  const { travelByStore, loading: travelLoading } = useStoreTravelInfo(customerCoords, storeDestinations);
  const primaryTravel = useMemo(() => {
    const first = cart.find((i) => i.hasRegisteredStore && i.storeId);
    return first ? travelByStore[first.storeId] : null;
  }, [cart, travelByStore]);

  const applyCoupon = () => {};

  const handleProceed = () => {
    if (!fullAddress.trim()) {
      alert("Please select or enter full address.");
      return;
    }
    if (!orderForSomeoneElse && !receiverPhone.trim()) {
      alert("Receiver contact number is required.");
      return;
    }
    if (orderForSomeoneElse && !receiverPhoneOther.trim()) {
      alert("Receiver phone number is required.");
      return;
    }
    if (!instantDelivery && !scheduledDate) {
      alert("Please select schedule date and time.");
      return;
    }
    setCheckoutDetails({
      address: fullAddress,
      receiverName: orderForSomeoneElse ? receiverName : null,
      receiverPhone: orderForSomeoneElse ? receiverPhoneOther : receiverPhone,
      customerLatitude: customerCoords?.latitude ?? null,
      customerLongitude: customerCoords?.longitude ?? null,
      scheduledAt:
        !instantDelivery && scheduledDate
          ? new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}:00`).toISOString()
          : null,
    });
    router.push("/payment");
  };

  const scheduleLabel = scheduledDate
    ? `${dateOptions.find((o) => o.value === scheduledDate)?.label || scheduledDate} · ${scheduledHour}:${scheduledMinute}`
    : "Select date & time";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBackground, { paddingTop: 12 + androidTopInset }]}
          >
            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerCartBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
                <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
                {cartCount > 0 ? (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSubtitle}>Review order, address & delivery preferences</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.orderSummaryCard} onPress={() => router.push("/cart")} activeOpacity={0.88}>
              <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orderSummaryGradient}>
                <View style={styles.orderSummaryLeft}>
                  <View style={styles.orderSummaryIcon}>
                    <Ionicons name="bag-check-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.orderSummaryLabel}>Your order</Text>
                    <Text style={styles.orderSummaryCount}>
                      {cart.length} item{cart.length !== 1 ? "s" : ""} in cart
                    </Text>
                  </View>
                </View>
                <View style={styles.orderSummaryRight}>
                  <Text style={styles.orderSummaryTotal}>₹{cartTotal}</Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
                </View>
              </LinearGradient>
              {cart.slice(0, 2).map((item) => (
                <View key={item.id} style={styles.orderItemRow}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.qty || 1}× {item.productName}
                  </Text>
                  <Text style={styles.orderItemPrice}>₹{(item.price || 0) * (item.qty || 1)}</Text>
                </View>
              ))}
              {cart.length > 2 ? <Text style={styles.orderMoreText}>+{cart.length - 2} more item{cart.length - 2 !== 1 ? "s" : ""}</Text> : null}
            </TouchableOpacity>

            <SectionCard icon="navigate-outline" title="Store distance & ETA" subtitle="From your location to fulfilment store">
              {customerCoords && primaryTravel ? (
                <>
                  <RouteMapPreview
                    fromLatitude={customerCoords.latitude}
                    fromLongitude={customerCoords.longitude}
                    toLatitude={primaryTravel.storeLatitude}
                    toLongitude={primaryTravel.storeLongitude}
                    height={160}
                  />
                  <StoreTravelBadge info={primaryTravel} loading={travelLoading} />
                </>
              ) : (
                <Text style={styles.mapHint}>
                  {cart.some((i) => !i.hasRegisteredStore)
                    ? "Some items have no registered store — distance & live tracking unavailable for those."
                    : customerCoords
                      ? "Add approved stores to products to see distance and ETA."
                      : "Pin your delivery address on the map in Saved Addresses to see distance and ETA."}
                </Text>
              )}
              {cart.filter((i) => i.hasRegisteredStore && i.storeId).length > 0 ? (
                <View style={styles.travelList}>
                  {cart
                    .filter((i) => i.hasRegisteredStore && i.storeId)
                    .map((item) => (
                      <View key={item.id + item.storeId} style={styles.travelListRow}>
                        <Text style={styles.travelListName} numberOfLines={1}>
                          {item.storeName || item.supplierName || "Store"}
                        </Text>
                        <StoreTravelBadge info={travelByStore[item.storeId]} loading={travelLoading} compact />
                      </View>
                    ))}
                </View>
              ) : null}
            </SectionCard>

            <SectionCard icon="location-outline" title="Delivery address" subtitle="Where should we deliver?">
              <TouchableOpacity style={styles.mapBtn} onPress={() => router.push("/saved-addresses")} activeOpacity={0.85}>
                <Text style={styles.mapBtnText}>Manage saved addresses</Text>
              </TouchableOpacity>
              <ModernInput
                label="Full address"
                icon="home-outline"
                value={fullAddress}
                onChangeText={setFullAddress}
                placeholder="House, street, area, city, PIN"
                multiline
                numberOfLines={3}
              />
              <ModernInput
                label="Receiver contact"
                icon="call-outline"
                value={receiverPhone}
                onChangeText={setReceiverPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <View style={styles.toggleCard}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleLabel}>Ordering for someone else</Text>
                  <Text style={styles.toggleHint}>Add receiver details below</Text>
                </View>
                <Switch
                  value={orderForSomeoneElse}
                  onValueChange={setOrderForSomeoneElse}
                  trackColor={{ false: "#D1D5DB", true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {orderForSomeoneElse ? (
                <>
                  <ModernInput label="Receiver name" icon="person-outline" value={receiverName} onChangeText={setReceiverName} placeholder="Full name" />
                  <ModernInput
                    label="Receiver phone"
                    icon="call-outline"
                    value={receiverPhoneOther}
                    onChangeText={setReceiverPhoneOther}
                    placeholder="Their mobile number"
                    keyboardType="phone-pad"
                  />
                  <ModernInput
                    label="Your phone (account)"
                    icon="phone-portrait-outline"
                    value={accountOwnerPhone}
                    onChangeText={setAccountOwnerPhone}
                    placeholder="Your number"
                    keyboardType="phone-pad"
                  />
                </>
              ) : null}
            </SectionCard>

            <SectionCard icon="time-outline" title="Delivery timing" subtitle="When do you want it?">
              <View style={styles.deliveryRow}>
                <TouchableOpacity style={styles.deliveryOptionWrap} onPress={() => setInstantDelivery(true)} activeOpacity={0.88}>
                  {instantDelivery ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.deliveryOption}>
                      <Ionicons name="flash" size={20} color="#FFFFFF" />
                      <Text style={styles.deliveryOptionTextActive}>Instant</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.deliveryOptionInactive}>
                      <Ionicons name="flash-outline" size={20} color={theme.textMuted} />
                      <Text style={styles.deliveryOptionText}>Instant</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.deliveryOptionWrap} onPress={() => setInstantDelivery(false)} activeOpacity={0.88}>
                  {!instantDelivery ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.deliveryOption}>
                      <Ionicons name="calendar" size={20} color="#FFFFFF" />
                      <Text style={styles.deliveryOptionTextActive}>Schedule</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.deliveryOptionInactive}>
                      <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
                      <Text style={styles.deliveryOptionText}>Schedule</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {!instantDelivery ? (
                <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowScheduleModal(true)} activeOpacity={0.85}>
                  <Ionicons name="time-outline" size={18} color={theme.accent} />
                  <Text style={styles.scheduleBtnText}>{scheduleLabel}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.instantNote}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
                  <Text style={styles.instantNoteText}>Estimated delivery within 30–45 minutes</Text>
                </View>
              )}
            </SectionCard>

            <SectionCard icon="pricetag-outline" title="Offers" subtitle="Apply a coupon code">
              <View style={styles.couponRow}>
                <View style={styles.couponInputWrap}>
                  <Ionicons name="ticket-outline" size={18} color={theme.textMuted} style={styles.couponIcon} />
                  <TextInput
                    style={styles.couponInput}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder="Enter coupon code"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity style={styles.couponApplyWrap} onPress={applyCoupon} activeOpacity={0.9}>
                  <LinearGradient colors={[theme.medium, theme.accent]} style={styles.couponApplyBtn}>
                    <Text style={styles.couponApplyText}>Apply</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SectionCard>

            <TouchableOpacity style={styles.walletCard} onPress={() => setShowWallet(true)} activeOpacity={0.88}>
              <LinearGradient colors={["#059669", "#047857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletGradient}>
                <View style={styles.walletLeft}>
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.walletLabel}>H2 Wallet</Text>
                    <Text style={styles.walletTap}>Tap to add or use balance</Text>
                  </View>
                </View>
                <Text style={styles.walletBalance}>₹{balance}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerLabel}>Order total</Text>
          <Text style={styles.footerTotal}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity style={styles.payBtnWrap} onPress={handleProceed} activeOpacity={0.9}>
          <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtn}>
            <Text style={styles.payBtnText}>Proceed to payment</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <WalletModal visible={showWallet} onClose={() => setShowWallet(false)} />

      <Modal visible={showScheduleModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowScheduleModal(false)}>
          <View style={styles.scheduleModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.scheduleModalHeader}>
              <Text style={styles.scheduleModalTitle}>Schedule delivery</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setShowDateDropdown((prev) => !prev);
                setShowHourDropdown(false);
                setShowMinuteDropdown(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.dropdownBtnText}>
                {dateOptions.find((o) => o.value === scheduledDate)?.label || "Select date (next 7 days)"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            {showDateDropdown ? (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {dateOptions.map((o) => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.dropdownItem, scheduledDate === o.value && styles.dropdownItemActive]}
                    onPress={() => {
                      setScheduledDate(o.value);
                      setShowDateDropdown(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.dropdownItemText, scheduledDate === o.value && styles.dropdownItemTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <Text style={styles.modalLabel}>Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setShowHourDropdown((prev) => !prev);
                    setShowDateDropdown(false);
                    setShowMinuteDropdown(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownBtnText}>Hour: {scheduledHour}</Text>
                  <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                </TouchableOpacity>
                {showHourDropdown ? (
                  <ScrollView style={styles.dropdownListSmall} nestedScrollEnabled>
                    {hourOptions.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.dropdownItem, scheduledHour === h && styles.dropdownItemActive]}
                        onPress={() => {
                          setScheduledHour(h);
                          setShowHourDropdown(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.dropdownItemText, scheduledHour === h && styles.dropdownItemTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
              <View style={styles.timeCol}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setShowMinuteDropdown((prev) => !prev);
                    setShowDateDropdown(false);
                    setShowHourDropdown(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownBtnText}>Min: {scheduledMinute}</Text>
                  <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                </TouchableOpacity>
                {showMinuteDropdown ? (
                  <ScrollView style={styles.dropdownListSmall} nestedScrollEnabled>
                    {minuteOptions.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.dropdownItem, scheduledMinute === m && styles.dropdownItemActive]}
                        onPress={() => {
                          setScheduledMinute(m);
                          setShowMinuteDropdown(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.dropdownItemText, scheduledMinute === m && styles.dropdownItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.scheduleConfirmWrap} onPress={() => setShowScheduleModal(false)} activeOpacity={0.9}>
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.scheduleConfirmBtn}>
                <Text style={styles.scheduleConfirmText}>Confirm schedule</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  headerSection: { flexShrink: 0, overflow: "hidden" },
  gradientBackground: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerLogoLight: { width: 108, height: 30 },
  headerCartBtn: {
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

  orderSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 0 },
    }),
  },
  orderSummaryGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  orderSummaryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  orderSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  orderSummaryLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  orderSummaryCount: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  orderSummaryRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderSummaryTotal: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  orderItemName: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.textPrimary, marginRight: 8 },
  orderItemPrice: { fontSize: 13, fontWeight: "700", color: theme.accent },
  orderMoreText: { fontSize: 12, color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 12 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.15)",
  },
  mapTextWrap: { flex: 1 },
  mapTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  mapHint: { fontSize: 12, color: theme.textMuted, marginTop: 2, lineHeight: 18 },
  travelList: { marginTop: 10, gap: 8 },
  travelListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  travelListName: { fontSize: 13, fontWeight: "600", color: theme.textPrimary, flex: 1 },
  mapBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  mapBtnText: { fontSize: 12, fontWeight: "700", color: theme.link },

  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(51,175,193,0.06)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    marginTop: -4,
  },
  toggleTextWrap: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  toggleHint: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  deliveryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  deliveryOptionWrap: { flex: 1 },
  deliveryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  deliveryOptionInactive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  deliveryOptionText: { fontSize: 14, fontWeight: "600", color: theme.textMuted },
  deliveryOptionTextActive: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  scheduleBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  instantNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 12,
    padding: 12,
  },
  instantNoteText: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 17 },

  couponRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  couponInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  couponIcon: { marginRight: 8 },
  couponInput: { flex: 1, fontSize: 15, color: theme.textPrimary, padding: 0 },
  couponApplyWrap: { borderRadius: 16, overflow: "hidden" },
  couponApplyBtn: { paddingHorizontal: 20, paddingVertical: 14, justifyContent: "center" },
  couponApplyText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  walletCard: { borderRadius: 20, overflow: "hidden", marginBottom: 8 },
  walletGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  walletTap: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  walletBalance: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },

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
  payBtnWrap: { borderRadius: 16, overflow: "hidden" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  scheduleModalContent: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  scheduleModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  scheduleModalTitle: { fontSize: 20, fontWeight: "800", color: theme.textPrimary },
  modalLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 8, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    marginBottom: 8,
  },
  dropdownBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  dropdownList: { maxHeight: 180, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "rgba(214,234,242,0.95)", marginBottom: 10 },
  dropdownListSmall: { maxHeight: 140, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "rgba(214,234,242,0.95)", marginTop: 4 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(214,234,242,0.6)" },
  dropdownItemActive: { backgroundColor: "rgba(51,175,193,0.1)" },
  dropdownItemText: { fontSize: 14, color: theme.textPrimary },
  dropdownItemTextActive: { color: theme.accent, fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeCol: { flex: 1 },
  scheduleConfirmWrap: { borderRadius: 16, overflow: "hidden", marginTop: 12 },
  scheduleConfirmBtn: { paddingVertical: 14, alignItems: "center" },
  scheduleConfirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
