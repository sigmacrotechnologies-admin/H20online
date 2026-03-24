import React, { useState, useEffect } from "react";
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
import { theme } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import WalletModal from "@/src/components/WalletModal";
import { api } from "@/src/api/client";

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
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const dateOptions = React.useMemo(() => {
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
  const hourOptions = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    []
  );
  const minuteOptions = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    []
  );

  useFocusEffect(
    React.useCallback(() => {
      if (cart.length === 0) router.replace("/cart");
      const details = getCheckoutDetails?.();
      if (details?.address) setFullAddress(details.address);
      if (details?.receiverPhone) setReceiverPhone(details.receiverPhone);
      if (!details?.address || !details?.receiverPhone) {
        api.addresses
          .list()
          .then((list) => {
            const safe = Array.isArray(list) ? list : [];
            const defaultEntry = safe.find((a) => a.isDefault) || safe[0] || null;
            if (!details?.address && defaultEntry?.fullAddress) setFullAddress(defaultEntry.fullAddress);
            if (!details?.receiverPhone && defaultEntry?.phoneNumber) setReceiverPhone(defaultEntry.phoneNumber);
          })
          .catch(() => {});
      }
    }, [cart.length])
  );

  const applyCoupon = () => {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}
        >
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <TouchableOpacity style={styles.headerCartBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
              <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="location-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Select address</Text>
              <Text style={styles.headerSubtitle}>Choose delivery address and schedule details</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentSection}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.cartSummary} onPress={() => router.push("/cart")} activeOpacity={0.8}>
          <Ionicons name="cart-outline" size={20} color={theme.primary} />
          <Text style={styles.cartSummaryText}>{cart.length} item{cart.length !== 1 ? "s" : ""} · ₹{cartTotal}</Text>
          <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
        </TouchableOpacity>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color="#9CA3AF" />
          <Text style={styles.mapText}>Map (integrate later)</Text>
          <Text style={styles.mapHint}>Select location on map</Text>
        </View>

        <Text style={styles.sectionLabel}>Full address</Text>
        <TextInput
          style={styles.input}
          value={fullAddress}
          onChangeText={setFullAddress}
          placeholder="House no., building, street, area, city, PIN"
          placeholderTextColor="#9CA3AF"
          multiline
        />

        <Text style={styles.sectionLabel}>Receiver&apos;s contact number</Text>
        <TextInput
          style={styles.input}
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          placeholder="Phone number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Ordering for someone else</Text>
          <Switch value={orderForSomeoneElse} onValueChange={setOrderForSomeoneElse} trackColor={{ false: "#E5E7EB", true: theme.primary }} thumbColor="#FFFFFF" />
        </View>

        {orderForSomeoneElse && (
          <>
            <Text style={styles.sectionLabel}>Receiver&apos;s name</Text>
            <TextInput style={styles.input} value={receiverName} onChangeText={setReceiverName} placeholder="Name" placeholderTextColor="#9CA3AF" />
            <Text style={styles.sectionLabel}>Receiver&apos;s phone number</Text>
            <TextInput style={styles.input} value={receiverPhoneOther} onChangeText={setReceiverPhoneOther} placeholder="Phone" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
            <Text style={styles.sectionLabel}>Account owner phone</Text>
            <TextInput style={styles.input} value={accountOwnerPhone} onChangeText={setAccountOwnerPhone} placeholder="Your number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
          </>
        )}

        <Text style={styles.sectionLabel}>Delivery</Text>
        <View style={styles.deliveryRow}>
          <TouchableOpacity style={[styles.deliveryOption, instantDelivery && styles.deliveryOptionActive]} onPress={() => setInstantDelivery(true)} activeOpacity={0.8}>
            <Ionicons name="flash-outline" size={22} color={instantDelivery ? "#FFFFFF" : "#1B2B34"} />
            <Text style={[styles.deliveryOptionText, instantDelivery && styles.deliveryOptionTextActive]}>Instant delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deliveryOption, !instantDelivery && styles.deliveryOptionActive]} onPress={() => setInstantDelivery(false)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={22} color={!instantDelivery ? "#FFFFFF" : "#1B2B34"} />
            <Text style={[styles.deliveryOptionText, !instantDelivery && styles.deliveryOptionTextActive]}>Schedule for later</Text>
          </TouchableOpacity>
        </View>

        {!instantDelivery && (
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowScheduleModal(true)} activeOpacity={0.8}>
            <Ionicons name="time-outline" size={20} color={theme.primary} />
            <Text style={styles.scheduleBtnText}>
              {scheduledDate ? `${scheduledDate} ${scheduledHour}:${scheduledMinute}` : "Select date & time"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#6B7C85" />
          </TouchableOpacity>
        )}

        <View style={styles.couponRow}>
          <TextInput style={styles.couponInput} value={couponCode} onChangeText={setCouponCode} placeholder="Coupon code" placeholderTextColor="#9CA3AF" />
          <TouchableOpacity style={styles.couponApplyBtn} onPress={applyCoupon} activeOpacity={0.8}>
            <Text style={styles.couponApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.walletCard} onPress={() => setShowWallet(true)} activeOpacity={0.8}>
          <View style={styles.walletRow}>
            <Ionicons name="wallet-outline" size={24} color={theme.primary} />
            <Text style={styles.walletLabel}>Wallet balance</Text>
          </View>
          <Text style={styles.walletBalance}>₹{balance}</Text>
          <Text style={styles.walletTap}>Tap to add or remove amount</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => {
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
              scheduledAt: !instantDelivery && scheduledDate ? new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}:00`).toISOString() : null,
            });
            router.push("/payment");
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.payBtnText}>Proceed to payment</Text>
        </TouchableOpacity>
      </View>

      <WalletModal visible={showWallet} onClose={() => setShowWallet(false)} />

      <Modal visible={showScheduleModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowScheduleModal(false)}>
          <View style={styles.scheduleModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.scheduleModalHeader}>
              <Text style={styles.scheduleModalTitle}>Select date & time</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setShowDateDropdown((prev) => !prev);
                setShowHourDropdown(false);
                setShowMinuteDropdown(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownBtnText}>
                {dateOptions.find((o) => o.value === scheduledDate)?.label || "Select date (next 7 days)"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7C85" />
            </TouchableOpacity>
            {showDateDropdown && (
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {dateOptions.map((o) => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.dropdownItem, scheduledDate === o.value && styles.dropdownItemActive]}
                    onPress={() => {
                      setScheduledDate(o.value);
                      setShowDateDropdown(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownItemText, scheduledDate === o.value && styles.dropdownItemTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Text style={styles.sectionLabel}>Time</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setShowHourDropdown((prev) => !prev);
                    setShowDateDropdown(false);
                    setShowMinuteDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>Hour: {scheduledHour}</Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7C85" />
                </TouchableOpacity>
                {showHourDropdown && (
                  <ScrollView style={styles.dropdownListSmall} nestedScrollEnabled>
                    {hourOptions.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.dropdownItem, scheduledHour === h && styles.dropdownItemActive]}
                        onPress={() => {
                          setScheduledHour(h);
                          setShowHourDropdown(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dropdownItemText, scheduledHour === h && styles.dropdownItemTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setShowMinuteDropdown((prev) => !prev);
                    setShowDateDropdown(false);
                    setShowHourDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>Minute: {scheduledMinute}</Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7C85" />
                </TouchableOpacity>
                {showMinuteDropdown && (
                  <ScrollView style={styles.dropdownListSmall} nestedScrollEnabled>
                    {minuteOptions.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.dropdownItem, scheduledMinute === m && styles.dropdownItemActive]}
                        onPress={() => {
                          setScheduledMinute(m);
                          setShowMinuteDropdown(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dropdownItemText, scheduledMinute === m && styles.dropdownItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.scheduleConfirmBtn} onPress={() => setShowScheduleModal(false)} activeOpacity={0.8}>
              <Text style={styles.scheduleConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerSection: { minHeight: 230, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingHorizontal: 20, paddingBottom: 26 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerCartBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", position: "relative" },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  cartBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  cartBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  contentSection: {
    marginTop: -36,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    flex: 1,
    overflow: "hidden",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  cartSummary: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.78)", padding: 14, borderRadius: 14, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  cartSummaryText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  mapPlaceholder: { height: 180, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  mapText: { fontSize: 14, color: "#6B7C85", marginTop: 8 },
  mapHint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1B2B34", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.78)", padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  deliveryRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  deliveryOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.78)", paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  deliveryOptionActive: { backgroundColor: theme.primary },
  deliveryOptionText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  deliveryOptionTextActive: { color: "#FFFFFF" },
  scheduleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.78)", padding: 16, borderRadius: 14, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  scheduleBtnText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  couponRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  couponInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1B2B34", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  couponApplyBtn: { backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, justifyContent: "center" },
  couponApplyText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  walletCard: { backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  walletLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  walletBalance: { fontSize: 22, fontWeight: "800", color: theme.primary },
  walletTap: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: theme.screenBackground },
  payBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  scheduleModalContent: { backgroundColor: theme.screenBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  scheduleModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  scheduleModalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  dropdownBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", marginBottom: 8 },
  dropdownBtnText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  dropdownList: { maxHeight: 180, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
  dropdownListSmall: { maxHeight: 140, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 4 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemActive: { backgroundColor: theme.selectedTint },
  dropdownItemText: { fontSize: 14, color: "#1B2B34" },
  dropdownItemTextActive: { color: theme.primary, fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 10 },
  scheduleConfirmBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 },
  scheduleConfirmText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
