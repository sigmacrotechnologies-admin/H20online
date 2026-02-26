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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/src/context/CartContext";
import { useWallet } from "@/src/context/WalletContext";
import WalletModal from "@/src/components/WalletModal";

const CheckoutScreen = () => {
  const router = useRouter();
  const { cart, cartCount, cartTotal } = useCart();
  const { balance } = useWallet();
  const [fullAddress, setFullAddress] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [orderForSomeoneElse, setOrderForSomeoneElse] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhoneOther, setReceiverPhoneOther] = useState("");
  const [accountOwnerPhone, setAccountOwnerPhone] = useState("+91 98765 43210");
  const [instantDelivery, setInstantDelivery] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [showWallet, setShowWallet] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (cart.length === 0) router.replace("/cart");
  }, [cart.length]);

  const applyCoupon = () => {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1B2B34" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select address</Text>
        <TouchableOpacity style={styles.cartIconBtn} onPress={() => router.push("/cart")} activeOpacity={0.7}>
          <Ionicons name="cart-outline" size={24} color="#1B2B34" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.cartSummary} onPress={() => router.push("/cart")} activeOpacity={0.8}>
          <Ionicons name="cart-outline" size={20} color="#0EA5E9" />
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
          <Switch value={orderForSomeoneElse} onValueChange={setOrderForSomeoneElse} trackColor={{ false: "#E5E7EB", true: "#0EA5E9" }} thumbColor="#FFFFFF" />
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
            <Ionicons name="time-outline" size={20} color="#0EA5E9" />
            <Text style={styles.scheduleBtnText}>{scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}` : "Select date & time"}</Text>
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
            <Ionicons name="wallet-outline" size={24} color="#0EA5E9" />
            <Text style={styles.walletLabel}>Wallet balance</Text>
          </View>
          <Text style={styles.walletBalance}>₹{balance}</Text>
          <Text style={styles.walletTap}>Tap to add or remove amount</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={() => router.push("/payment")} activeOpacity={0.8}>
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
            <TextInput style={styles.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="e.g. 25 Feb 2026" placeholderTextColor="#9CA3AF" />
            <Text style={styles.sectionLabel}>Time</Text>
            <TextInput style={styles.input} value={scheduledTime} onChangeText={setScheduledTime} placeholder="e.g. 2:00 PM" placeholderTextColor="#9CA3AF" />
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
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  cartIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f0f7fcd7", justifyContent: "center", alignItems: "center", position: "relative" },
  cartBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#0EA5E9", justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  cartBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, marginLeft: 11, marginRight: 11 },
  cartSummary: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", padding: 14, borderRadius: 14, marginBottom: 16, gap: 10 },
  cartSummaryText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  mapPlaceholder: { height: 180, backgroundColor: "#f0f7fcd7", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  mapText: { fontSize: 14, color: "#6B7C85", marginTop: 8 },
  mapHint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: "#f0f7fcd7", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1B2B34", marginBottom: 12 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f0f7fcd7", padding: 16, borderRadius: 14, marginBottom: 12 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  deliveryRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  deliveryOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0f7fcd7", paddingVertical: 14, borderRadius: 14 },
  deliveryOptionActive: { backgroundColor: "#0EA5E9" },
  deliveryOptionText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  deliveryOptionTextActive: { color: "#FFFFFF" },
  scheduleBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f7fcd7", padding: 16, borderRadius: 14, marginBottom: 16, gap: 10 },
  scheduleBtnText: { flex: 1, fontSize: 15, color: "#1B2B34" },
  couponRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  couponInput: { flex: 1, backgroundColor: "#f0f7fcd7", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1B2B34" },
  couponApplyBtn: { backgroundColor: "#0EA5E9", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, justifyContent: "center" },
  couponApplyText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  walletCard: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 20, marginBottom: 16 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  walletLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  walletBalance: { fontSize: 22, fontWeight: "800", color: "#0EA5E9" },
  walletTap: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28, backgroundColor: "#c6e2fa", marginLeft: 11, marginRight: 11 },
  payBtn: { backgroundColor: "#0EA5E9", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  scheduleModalContent: { backgroundColor: "#c6e2fa", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  scheduleModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  scheduleModalTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  scheduleConfirmBtn: { backgroundColor: "#0EA5E9", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 },
  scheduleConfirmText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
