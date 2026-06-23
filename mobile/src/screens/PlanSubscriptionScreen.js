import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { api } from "@/src/api/client";
import { goBackOr } from "@/src/utils/navigation";
import { useCustomerPortal } from "@/src/utils/customerPortal";
import { useAuth } from "@/src/context/AuthContext";
import { theme } from "@/src/theme";

const PLAN_ICON_BY_SLUG = {
  basic: "water-outline",
  family: "people-outline",
  active: "fitness-outline",
  premium: "diamond-outline",
  bulk: "bus-outline",
  "society-tanker": "home-outline",
};

const FREQUENCIES = [
  { key: "daily", label: "Daily", icon: "today-outline" },
  { key: "weekly", label: "Weekly", icon: "calendar-outline" },
  { key: "monthly", label: "Monthly", icon: "repeat-outline" },
];

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

function GradientChip({ label, selected, onPress, disabled }) {
  if (selected) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} disabled={disabled}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.gradientChip}>
          <Text style={styles.gradientChipTextActive}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.gradientChipInactive} onPress={onPress} activeOpacity={0.88} disabled={disabled}>
      <Text style={styles.gradientChipText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BottomSheetModal({ visible, onClose, title, children, maxHeight = 360 }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetContent, { maxHeight }]} onStartShouldSetResponder={() => true}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Preferred delivery time: hour (1-12), minute (00, 15, 30, 45), AM/PM — dropdown only, no manual input
function getPreferredTimeOptions() {
  const options = [{ value: "", label: "Select time" }];
  for (const ampm of ["AM", "PM"]) {
    for (let h = 1; h <= 12; h++) {
      for (const m of ["00", "15", "30", "45"]) {
        options.push({ value: `${h}:${m} ${ampm}`, label: `${h}:${m} ${ampm}` });
      }
    }
  }
  return options;
}
const PREFERRED_TIME_OPTIONS = getPreferredTimeOptions();

function getProductIcon(prod) {
  const label = (prod?.productLabel || "").toLowerCase();
  const key = (prod?.productKey || "").toLowerCase();
  const combined = label + " " + key;
  // Jar → mug (cup)
  if (combined.includes("jar")) return "cafe-outline";
  // Bottle → bottle outline
  if (combined.includes("bottle") || combined.includes("1l") || combined.includes("1 l") || combined.includes("litre") || combined.includes("liter")) return "wine-outline";
  // Can / big jar → big jar (nutrition jar style)
  if (combined.includes("can") || combined.includes("canister") || combined.includes("20") || combined.includes("bulk")) return "nutrition-outline";
  return "water-outline";
}

function getDaysInMonth(year, month) {
  const d = new Date(year, month + 1, 0);
  return d.getDate();
}

function getMonthDates(year, month) {
  const days = getDaysInMonth(year, month);
  const arr = [];
  for (let d = 1; d <= days; d++) arr.push({ year, month, day: d, key: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  return arr;
}

function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function getEntireMonthDates(year, month) {
  return getMonthDates(year, month).map((x) => x.key);
}

function getWeekdayNames() {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

const PlanSubscriptionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const portal = useCustomerPortal();
  const { user } = useAuth();
  const isSupplier = user?.role === "supplier";
  const categoryParam = typeof params.category === "string" ? params.category : null;
  const planCategory =
    categoryParam && ["individual", "bulk", "society"].includes(categoryParam)
      ? categoryParam
      : portal.isSociety
        ? "society"
        : "individual";
  const homeRoute = isSupplier ? "/supplier-dashboard" : portal.home;
  const [plans, setPlans] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("basic");
  const [planProducts, setPlanProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedDates, setSelectedDates] = useState([]);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0); // 0 = current month, 1 = next, 2 = next+1
  const [weeklyWeekdays, setWeeklyWeekdays] = useState([]); // 0-6
  const [weeklyWeeks, setWeeklyWeeks] = useState(4);
  const [monthlyDays, setMonthlyDays] = useState([1, 15]); // days of month
  const [monthlyMonths, setMonthlyMonths] = useState(3);
  const [subscribeRange, setSubscribeRange] = useState(null); // "month" | "3months" | "custom"
  const [preferredTimeRangeStart, setPreferredTimeRangeStart] = useState(""); // e.g. "11:00 AM" - user-given window start
  const [preferredTimeRangeEnd, setPreferredTimeRangeEnd] = useState("");     // e.g. "12:00 PM" - user-given window end
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTimeStartPicker, setShowTimeStartPicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [activePlansDropdownOpen, setActivePlansDropdownOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const fetchActiveSubscriptions = useCallback(async () => {
    try {
      const list = await api.subscriptions.list();
      setActiveSubscriptions(list);
    } catch (_) {
      setActiveSubscriptions([]);
    }
  }, []);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      const list = await api.addresses.list();
      setSavedAddresses(list || []);
      setSelectedAddressId((prev) => {
        if (!list?.length) return "";
        if (prev && list.some((a) => a.id === prev)) return prev;
        return list.find((a) => a.isDefault)?.id || list[0]?.id || "";
      });
    } catch (_) {
      setSavedAddresses([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActiveSubscriptions();
      fetchSavedAddresses();
    }, [fetchActiveSubscriptions, fetchSavedAddresses])
  );

  const loadPlans = useCallback(async () => {
    try {
      const data = await api.plans.list({ category: planCategory });
      const list = Array.isArray(data) ? data : [];
      setPlans(list);
      const firstActive = list.find((p) => !p.comingSoon);
      if (firstActive) setSelectedSlug(firstActive.slug);
    } catch (_) {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [planCategory]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const loadPlanProducts = useCallback(async (slug) => {
    if (!slug) return;
    setProductsLoading(true);
    try {
      const data = await api.plans.products(slug);
      setPlanProducts(data);
      setSelectedProduct(data.products?.[0] || null);
      setSelectedDates([]);
      setSubscribeRange(null);
    } catch (_) {
      setPlanProducts(null);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    const plan = plans.find((p) => p.slug === selectedSlug);
    if (selectedSlug && plan && !plan.comingSoon) {
      loadPlanProducts(selectedSlug);
    } else {
      setPlanProducts(null);
    }
  }, [selectedSlug, plans, loadPlanProducts]);

  const planInfo = plans.find((p) => p.slug === selectedSlug);
  const isComingSoon = planInfo?.comingSoon ?? false;
  const maxQty = planInfo?.maxQuantityPerProduct ?? 5;

  const unitPrice = selectedProduct
    ? frequency === "daily"
      ? selectedProduct.priceDaily
      : frequency === "weekly"
        ? selectedProduct.priceWeekly
        : selectedProduct.priceMonthly
    : 0;

  const today = new Date();
  const displayMonth = addMonths(today, calendarMonthOffset);
  const displayYear = displayMonth.getFullYear();
  const displayMonthIndex = displayMonth.getMonth();
  const monthDates = getMonthDates(displayYear, displayMonthIndex);
  const firstDayOfWeek = new Date(displayYear, displayMonthIndex, 1).getDay();

  const toggleDate = (key) => {
    setSubscribeRange("custom");
    setSelectedDates((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key].sort()));
  };

  const applyRange = (range) => {
    setSubscribeRange(range);
    if (range === "custom") {
      setSelectedDates([]);
      return;
    }
    const keys = [];
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const numMonths = range === "month" ? 1 : 3;
    for (let m = 0; m < numMonths; m++) {
      const d = addMonths(start, m);
      keys.push(...getEntireMonthDates(d.getFullYear(), d.getMonth()));
    }
    const todayKey = dateToKey(today);
    setSelectedDates(keys.filter((k) => k >= todayKey).sort());
  };

  const clearDateSelection = () => {
    setSelectedDates([]);
    setSubscribeRange(null);
  };

  const getWeeklySelectedDates = () => {
    if (weeklyWeekdays.length === 0) return [];
    const dates = [];
    const start = new Date(today);
    const todayKey = dateToKey(today);
    for (let i = 0; i < weeklyWeeks * 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      if (weeklyWeekdays.includes(day.getDay())) {
        const key = dateToKey(day);
        if (key >= todayKey) dates.push(key);
      }
    }
    return dates.sort().slice(0, 90);
  };

  const getMonthlySelectedDates = () => {
    const dates = [];
    for (let m = 0; m < monthlyMonths; m++) {
      const d = addMonths(today, m);
      for (const day of monthlyDays) {
        const maxD = getDaysInMonth(d.getFullYear(), d.getMonth());
        if (day <= maxD) dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      }
    }
    return dates.filter((k) => k >= dateToKey(today)).sort();
  };

  const resolvedDates =
    frequency === "daily"
      ? selectedDates
      : frequency === "weekly"
        ? getWeeklySelectedDates()
        : getMonthlySelectedDates();

  const totalPrice = Math.round(unitPrice * quantity * (resolvedDates.length || 1));
  const canSubscribe =
    !isComingSoon &&
    selectedProduct &&
    selectedAddressId &&
    ((frequency === "daily" && selectedDates.length > 0) ||
      (frequency === "weekly" && weeklyWeekdays.length > 0) ||
      (frequency === "monthly" && monthlyDays.length > 0));

  const handleSubscribe = async () => {
    if (!canSubscribe || !planInfo) return;
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }
    if (preferredTimeRangeStart && !preferredTimeRangeEnd) {
      setError("Please select both start and end time for delivery window.");
      return;
    }
    if (preferredTimeRangeEnd && !preferredTimeRangeStart) {
      setError("Please select both start and end time for delivery window.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.subscriptions.create({
        planId: planInfo.id,
        planName: planInfo.name,
        productKey: selectedProduct.productKey,
        productLabel: selectedProduct.productLabel,
        productId: selectedProduct.productId || undefined,
        frequency,
        unitPrice,
        quantity,
        selectedDates: resolvedDates,
        addressId: selectedAddressId,
        preferredTimeRangeStart: preferredTimeRangeStart.trim() || undefined,
        preferredTimeRangeEnd: preferredTimeRangeEnd.trim() || undefined,
        planCategory,
      });
      goBackOr(homeRoute);
    } catch (err) {
      setError(err.message || "Failed to subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWeekday = (day) => {
    setWeeklyWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const weekdayNames = getWeekdayNames();
  const showSubscribeForm = !isComingSoon && !!planInfo && !planInfo.comingSoon;
  const showStickyFooter = showSubscribeForm && !productsLoading && !!planProducts?.products?.length;

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
            <DropletOverlay />
            <View style={styles.headerTopRow}>
              <BackButton />
              <AppLogo size="header" />
              <TouchableOpacity style={styles.headerMenuBtn} activeOpacity={0.7} onPress={() => setShowMenuModal(true)}>
                <Ionicons name="menu" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>
              {planCategory === "bulk" ? "Bulk supply plan" : planCategory === "society" ? "Society tanker plan" : "My Plan"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {planCategory === "bulk"
                ? "Schedule tankers and commercial bulk deliveries"
                : planCategory === "society"
                  ? "Schedule recurring tanker deliveries for your society"
                  : "Manage subscriptions or set up a new delivery plan"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {activeSubscriptions.length > 0 ? (
              <View style={styles.activeSummaryBanner}>
                <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeSummaryGradient}>
                  <View style={styles.activeSummaryIcon}>
                    <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.activeSummaryLabel}>Active subscriptions</Text>
                    <Text style={styles.activeSummaryValue}>
                      {activeSubscriptions.length} plan{activeSubscriptions.length > 1 ? "s" : ""} running
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ) : null}

            <SectionCard icon="layers-outline" title="Active plans" subtitle="Your current subscriptions">
              <TouchableOpacity
                style={styles.activePlansDropdown}
                onPress={() => setActivePlansDropdownOpen((open) => !open)}
                activeOpacity={0.85}
              >
                <Text style={styles.activePlansDropdownText} numberOfLines={1}>
                  {activeSubscriptions.length === 0
                    ? "No active plans yet"
                    : `${activeSubscriptions.length} active plan${activeSubscriptions.length > 1 ? "s" : ""}`}
                </Text>
                <Ionicons name={activePlansDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
              </TouchableOpacity>
              {activePlansDropdownOpen ? (
                activeSubscriptions.length === 0 ? (
                  <Text style={styles.emptyActiveText}>Subscribe below to start regular water deliveries.</Text>
                ) : (
                  activeSubscriptions.map((sub) => (
                    <View key={sub.id} style={styles.activePlanItem}>
                      <Text style={styles.activePlanItemName}>{sub.planName} – {sub.productLabel}</Text>
                      <Text style={styles.activePlanItemMeta}>
                        {sub.subscriptionId ? `ID: ${sub.subscriptionId} · ` : ""}
                        {sub.frequency} • ₹{sub.totalPrice} • {sub.selectedDates?.length || 0} dates
                      </Text>
                    </View>
                  ))
                )
              ) : null}
            </SectionCard>

            <Text style={styles.sectionEyebrow}>Choose a plan</Text>
            <View style={styles.planTilesRow}>
            {plans.map((p) => {
              const isSelected = selectedSlug === p.slug;
              const comingSoon = p.comingSoon;
              const iconName = PLAN_ICON_BY_SLUG[p.slug] || "document-text-outline";
              return (
                <TouchableOpacity
                  key={p.slug}
                  style={[styles.planTileWrap, isSelected && styles.planTileWrapSelected]}
                  onPress={() => setSelectedSlug(p.slug)}
                  activeOpacity={0.88}
                >
                  {isSelected ? (
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.planTile}>
                      <View style={styles.planTileIconWrapActive}>
                        <Ionicons name={iconName} size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.planTileNameWhite} numberOfLines={2}>{p.name}</Text>
                      {comingSoon ? <Text style={styles.comingSoonBadgeWhite}>Coming soon</Text> : null}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.planTile, comingSoon && styles.planTileMuted]}>
                      <View style={styles.planTileIconWrap}>
                        <Ionicons name={iconName} size={24} color={comingSoon ? "#9CA3AF" : theme.accent} />
                      </View>
                      <Text style={[styles.planTileName, comingSoon && styles.planTileNameMuted]} numberOfLines={2}>{p.name}</Text>
                      {comingSoon ? <Text style={styles.comingSoonBadge}>Coming soon</Text> : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isComingSoon ? (
            <View style={styles.comingSoonCard}>
              <View style={styles.comingSoonIcon}>
                <Ionicons name="time-outline" size={36} color={theme.accent} />
              </View>
              <Text style={styles.comingSoonTitle}>Coming soon</Text>
              <Text style={styles.comingSoonText}>This plan is not available yet. Choose another plan from the list above.</Text>
            </View>
          ) : null}

          {showSubscribeForm ? (
            <>
              {productsLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={theme.accent} />
                </View>
              ) : planProducts?.products?.length ? (
                <>
                  <SectionCard icon="pulse-outline" title="Delivery frequency" subtitle="How often should we deliver?">
                    <View style={styles.frequencyRow}>
                      {FREQUENCIES.map((f) => (
                        <GradientChip key={f.key} label={f.label} selected={frequency === f.key} onPress={() => setFrequency(f.key)} />
                      ))}
                    </View>
                  </SectionCard>

                  <SectionCard icon="cube-outline" title="Product" subtitle="Pick size and pricing">
                    <View style={styles.productGrid}>
                    {planProducts.products.map((prod) => {
                      const price = frequency === "daily" ? prod.priceDaily : frequency === "weekly" ? prod.priceWeekly : prod.priceMonthly;
                      const isSelected = selectedProduct?.productKey === prod.productKey;
                      const iconName = getProductIcon(prod);
                      return (
                        <TouchableOpacity
                          key={prod.id}
                          style={styles.productCardWrapper}
                          onPress={() => setSelectedProduct(prod)}
                          activeOpacity={0.88}
                        >
                          {isSelected ? (
                            <LinearGradient colors={[theme.medium, theme.accent]} style={styles.productCard}>
                              <View style={styles.productCardIconWrapActive}>
                                <Ionicons name={iconName} size={26} color="#FFFFFF" />
                              </View>
                              <Text style={styles.productCardLabelActive} numberOfLines={2}>{prod.productLabel}</Text>
                              <Text style={styles.productCardPriceActive}>
                                ₹{price} / {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.productCard}>
                              <View style={styles.productCardIconWrap}>
                                <Ionicons name={iconName} size={26} color={theme.accent} />
                              </View>
                              <Text style={styles.productCardLabel} numberOfLines={2}>{prod.productLabel}</Text>
                              <Text style={styles.productCardPrice}>
                                ₹{price} / {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    </View>

                    <View style={styles.quantityRow}>
                      <Text style={styles.quantityLabel}>Quantity (max {maxQty})</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                          <Ionicons name="remove" size={18} color={quantity <= 1 ? "#9CA3AF" : theme.accent} />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{quantity}</Text>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}>
                          <Ionicons name="add" size={18} color={quantity >= maxQty ? "#9CA3AF" : theme.accent} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </SectionCard>

                  <SectionCard
                    icon="calendar-outline"
                    title="Delivery schedule"
                    subtitle={
                      frequency === "daily"
                        ? "Select dates up to 3 months ahead"
                        : frequency === "weekly"
                          ? "Choose weekdays and duration"
                          : "Choose days of month and duration"
                    }
                  >
                    {frequency === "daily" ? (
                      <>
                        <View style={styles.rangeToggles}>
                          <GradientChip label="Entire month" selected={subscribeRange === "month"} onPress={() => applyRange("month")} />
                          <GradientChip label="3 months" selected={subscribeRange === "3months"} onPress={() => applyRange("3months")} />
                          <GradientChip label="Custom" selected={subscribeRange === "custom"} onPress={() => applyRange("custom")} />
                        </View>
                        {(subscribeRange === "month" || subscribeRange === "3months") && selectedDates.length > 0 ? (
                          <TouchableOpacity style={styles.clearSelectionBtn} onPress={clearDateSelection} activeOpacity={0.8}>
                            <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
                            <Text style={styles.clearSelectionText}>Clear selection</Text>
                          </TouchableOpacity>
                        ) : null}
                        <View style={styles.calendarWrapper}>
                          <View style={styles.calendarNav}>
                            <TouchableOpacity onPress={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))} disabled={calendarMonthOffset <= 0} style={styles.calendarNavBtn}>
                              <Ionicons name="chevron-back" size={22} color={calendarMonthOffset <= 0 ? "#9CA3AF" : theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthLabel}>{displayMonth.toLocaleString("default", { month: "long", year: "numeric" })}</Text>
                            <TouchableOpacity onPress={() => setCalendarMonthOffset((o) => Math.min(2, o + 1))} disabled={calendarMonthOffset >= 2} style={styles.calendarNavBtn}>
                              <Ionicons name="chevron-forward" size={22} color={calendarMonthOffset >= 2 ? "#9CA3AF" : theme.textPrimary} />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.weekdayRow}>
                            {weekdayNames.map((name) => (
                              <Text key={name} style={styles.weekdayHead}>{name}</Text>
                            ))}
                          </View>
                          <View style={styles.calendarGrid}>
                            {Array.from({ length: firstDayOfWeek }, (_, i) => (
                              <View key={`pad-${i}`} style={styles.calendarDay} />
                            ))}
                            {monthDates.map((d) => {
                              const isSelected = selectedDates.includes(d.key);
                              const isPast = d.key < dateToKey(today);
                              return (
                                <TouchableOpacity key={d.key} style={styles.calendarDay} onPress={() => !isPast && toggleDate(d.key)} disabled={isPast} activeOpacity={0.7}>
                                  {isSelected ? (
                                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.calendarDayInner}>
                                      <Text style={styles.calendarDayTextSelected}>{d.day}</Text>
                                    </LinearGradient>
                                  ) : (
                                    <View style={[styles.calendarDayInner, isPast && styles.calendarDayInnerPast]}>
                                      <Text style={[styles.calendarDayText, isPast && styles.calendarDayTextPast]}>{d.day}</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </>
                    ) : null}

                    {frequency === "weekly" ? (
                      <View style={styles.weeklySection}>
                        <Text style={styles.hint}>Select weekdays for delivery</Text>
                        <View style={styles.weekdayChips}>
                          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                            <GradientChip key={day} label={weekdayNames[day]} selected={weeklyWeekdays.includes(day)} onPress={() => toggleWeekday(day)} />
                          ))}
                        </View>
                        <Text style={styles.hint}>Number of weeks</Text>
                        <View style={styles.weeksStepper}>
                          <TouchableOpacity style={styles.quantityBtn} onPress={() => setWeeklyWeeks((w) => Math.max(1, w - 1))}>
                            <Ionicons name="remove" size={18} color={theme.accent} />
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>{weeklyWeeks}</Text>
                          <TouchableOpacity style={styles.quantityBtn} onPress={() => setWeeklyWeeks((w) => Math.min(52, w + 1))}>
                            <Ionicons name="add" size={18} color={theme.accent} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {frequency === "monthly" ? (
                      <View style={styles.monthlySection}>
                        <Text style={styles.hint}>Delivery days of month (e.g. 1, 15)</Text>
                        <View style={styles.monthlyDaysRow}>
                          {[1, 5, 10, 15, 20, 25].map((day) => (
                            <GradientChip
                              key={day}
                              label={String(day)}
                              selected={monthlyDays.includes(day)}
                              onPress={() =>
                                setMonthlyDays((prev) =>
                                  prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
                                )
                              }
                            />
                          ))}
                        </View>
                        <Text style={styles.hint}>Number of months</Text>
                        <View style={styles.weeksStepper}>
                          <TouchableOpacity style={styles.quantityBtn} onPress={() => setMonthlyMonths((m) => Math.max(1, m - 1))}>
                            <Ionicons name="remove" size={18} color={theme.accent} />
                          </TouchableOpacity>
                          <Text style={styles.quantityValue}>{monthlyMonths}</Text>
                          <TouchableOpacity style={styles.quantityBtn} onPress={() => setMonthlyMonths((m) => Math.min(12, m + 1))}>
                            <Ionicons name="add" size={18} color={theme.accent} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </SectionCard>

                  <SectionCard icon="location-outline" title="Delivery address" subtitle="Where should we deliver your subscription?">
                    {savedAddresses.length === 0 ? (
                      <View style={styles.noAddressBox}>
                        <Ionicons name="location-outline" size={24} color={theme.accent} />
                        <Text style={styles.noAddressText}>No saved addresses yet. Add one to continue.</Text>
                        <TouchableOpacity style={styles.noAddressBtnWrap} onPress={() => router.push("/saved-addresses")} activeOpacity={0.9}>
                          <LinearGradient colors={[theme.medium, theme.accent]} style={styles.noAddressBtn}>
                            <Text style={styles.noAddressBtnText}>Go to Saved Addresses</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.pickerInput} onPress={() => setShowAddressPicker(true)} activeOpacity={0.85}>
                        <Ionicons name="home-outline" size={18} color={theme.accent} />
                        <Text style={[styles.pickerInputText, !selectedAddressId && styles.pickerInputPlaceholder]} numberOfLines={2}>
                          {selectedAddressId ? savedAddresses.find((a) => a.id === selectedAddressId)?.fullAddress || "Select address" : "Select address"}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </SectionCard>

                  <SectionCard icon="time-outline" title="Preferred delivery window" subtitle="Choose a 1-hour slot (e.g. 11:00 AM – 12:00 PM)">
                    <View style={styles.timeRangeRow}>
                      <TouchableOpacity style={styles.pickerInput} onPress={() => setShowTimeStartPicker(true)} activeOpacity={0.85}>
                        <Ionicons name="sunny-outline" size={18} color={theme.accent} />
                        <Text style={[styles.pickerInputText, !preferredTimeRangeStart && styles.pickerInputPlaceholder]}>{preferredTimeRangeStart || "From"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.pickerInput} onPress={() => setShowTimeEndPicker(true)} activeOpacity={0.85}>
                        <Ionicons name="moon-outline" size={18} color={theme.accent} />
                        <Text style={[styles.pickerInputText, !preferredTimeRangeEnd && styles.pickerInputPlaceholder]}>{preferredTimeRangeEnd || "To"}</Text>
                      </TouchableOpacity>
                    </View>
                  </SectionCard>

                  <View style={styles.summaryCard}>
                    <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryGradient}>
                      <View style={styles.summaryLeft}>
                        <View style={styles.summaryIconWrap}>
                          <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text style={styles.summaryLabel}>Estimated total</Text>
                          <Text style={styles.summaryMeta}>
                            {selectedProduct?.productLabel} × {quantity} × {resolvedDates.length} deliveries
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.summaryPrice}>₹{totalPrice}</Text>
                    </LinearGradient>
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </>
              ) : !productsLoading ? (
                <Text style={styles.noProducts}>No products for this plan.</Text>
              ) : null}
            </>
          ) : null}
          </ScrollView>
        </View>
      </View>

      {showStickyFooter ? (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>Plan total</Text>
            <Text style={styles.footerTotal}>₹{totalPrice}</Text>
          </View>
          <TouchableOpacity
            style={[styles.subscribeBtnWrap, (!canSubscribe || submitting) && styles.subscribeBtnDisabled]}
            onPress={handleSubscribe}
            disabled={!canSubscribe || submitting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={!canSubscribe || submitting ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribeBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={!canSubscribe ? "#8A9AA3" : "#FFFFFF"} />
                  <Text style={[styles.subscribeBtnText, !canSubscribe && styles.subscribeBtnTextDisabled]}>Subscribe</Text>
                  <Ionicons name="arrow-forward" size={18} color={!canSubscribe ? "#8A9AA3" : "#FFFFFF"} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      <BottomSheetModal visible={showAddressPicker} onClose={() => setShowAddressPicker(false)} title="Select address" maxHeight={400}>
        <ScrollView style={styles.sheetList} nestedScrollEnabled>
          {savedAddresses.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.sheetItem, selectedAddressId === a.id && styles.sheetItemActive]}
              onPress={() => { setSelectedAddressId(a.id); setShowAddressPicker(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetItemText} numberOfLines={2}>{a.fullAddress || "—"}</Text>
              {selectedAddressId === a.id ? <Ionicons name="checkmark-circle" size={20} color={theme.accent} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheetModal>

      <BottomSheetModal visible={showTimeStartPicker} onClose={() => setShowTimeStartPicker(false)} title="From (start)" maxHeight={360}>
        <ScrollView style={styles.sheetList} nestedScrollEnabled>
          {PREFERRED_TIME_OPTIONS.filter((o) => o.value).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetItem, preferredTimeRangeStart === opt.value && styles.sheetItemActive]}
              onPress={() => { setPreferredTimeRangeStart(opt.value); setShowTimeStartPicker(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetItemText}>{opt.label}</Text>
              {preferredTimeRangeStart === opt.value ? <Ionicons name="checkmark-circle" size={20} color={theme.accent} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheetModal>

      <BottomSheetModal visible={showTimeEndPicker} onClose={() => setShowTimeEndPicker(false)} title="To (end)" maxHeight={360}>
        <ScrollView style={styles.sheetList} nestedScrollEnabled>
          {PREFERRED_TIME_OPTIONS.filter((o) => o.value).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetItem, preferredTimeRangeEnd === opt.value && styles.sheetItemActive]}
              onPress={() => { setPreferredTimeRangeEnd(opt.value); setShowTimeEndPicker(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetItemText}>{opt.label}</Text>
              {preferredTimeRangeEnd === opt.value ? <Ionicons name="checkmark-circle" size={20} color={theme.accent} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheetModal>

      <BottomSheetModal visible={showMenuModal} onClose={() => setShowMenuModal(false)} title="Quick links" maxHeight={320}>
        <TouchableOpacity style={styles.sheetItem} onPress={() => { setShowMenuModal(false); router.push(isSupplier ? "/supplier-dashboard" : portal.profile); }} activeOpacity={0.85}>
          <Ionicons name="person-outline" size={20} color={theme.textPrimary} />
          <Text style={styles.sheetItemText}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sheetItem} onPress={() => { setShowMenuModal(false); router.push("/order-history"); }} activeOpacity={0.85}>
          <Ionicons name="receipt-outline" size={20} color={theme.textPrimary} />
          <Text style={styles.sheetItemText}>Order History</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        {!portal.isSociety ? (
          <TouchableOpacity style={styles.sheetItem} onPress={() => { setShowMenuModal(false); router.push("/water-intake"); }} activeOpacity={0.85}>
            <Ionicons name="water-outline" size={20} color={theme.textPrimary} />
            <Text style={styles.sheetItemText}>Water Intake</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.sheetItem} onPress={() => { setShowMenuModal(false); router.push(homeRoute); }} activeOpacity={0.85}>
          <Ionicons name="home-outline" size={20} color={theme.textPrimary} />
          <Text style={styles.sheetItemText}>Dashboard</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </BottomSheetModal>
    </SafeAreaView>
  );
};

export default PlanSubscriptionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground },
  pageBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
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
  headerMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    justifyContent: "center",
    alignItems: "center",
  },
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

  activeSummaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  activeSummaryGradient: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  activeSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeSummaryLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  activeSummaryValue: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 0 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  activePlansDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FCFD",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  activePlansDropdownText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary, marginRight: 8 },
  emptyActiveText: { fontSize: 13, color: theme.textMuted, marginTop: 10, lineHeight: 18 },
  activePlanItem: {
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    paddingTop: 12,
    marginTop: 12,
  },
  activePlanItemName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  activePlanItemMeta: { fontSize: 12, color: theme.textMuted, marginTop: 4 },

  planTilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  planTileWrap: { width: "48%", minWidth: 140, borderRadius: 18, overflow: "hidden" },
  planTileWrapSelected: {
    ...Platform.select({
      ios: { shadowColor: theme.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 0 },
    }),
  },
  planTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    minHeight: 128,
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
  },
  planTileMuted: { opacity: 0.75 },
  planTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  planTileIconWrapActive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  planTileName: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  planTileNameMuted: { color: theme.textMuted },
  planTileNameWhite: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  comingSoonBadge: { fontSize: 11, color: theme.accent, marginTop: 6, fontWeight: "600" },
  comingSoonBadgeWhite: { fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: "600" },

  comingSoonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  comingSoonIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary, marginTop: 14 },
  comingSoonText: { fontSize: 14, color: theme.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20 },

  loadingWrap: { padding: 40, alignItems: "center" },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gradientChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  gradientChipInactive: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F8FCFD",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  gradientChipText: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
  gradientChipTextActive: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  productGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 4 },
  productCardWrapper: { width: "33.33%", paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8, minWidth: 0 },
  productCard: {
    backgroundColor: "#F8FCFD",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    minHeight: 118,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    flex: 1,
  },
  productCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  productCardIconWrapActive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  productCardLabel: { fontSize: 11, fontWeight: "600", color: theme.textPrimary, textAlign: "center", marginBottom: 4 },
  productCardLabelActive: { fontSize: 11, fontWeight: "600", color: "#FFFFFF", textAlign: "center", marginBottom: 4 },
  productCardPrice: { fontSize: 11, fontWeight: "700", color: theme.accent },
  productCardPriceActive: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  quantityLabel: { fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: { fontSize: 17, fontWeight: "800", color: theme.textPrimary, minWidth: 28, textAlign: "center" },

  rangeToggles: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  clearSelectionBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 12, gap: 6 },
  clearSelectionText: { fontSize: 13, fontWeight: "600", color: theme.textMuted },

  calendarWrapper: {
    backgroundColor: "#F8FCFD",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  calendarNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calendarNavBtn: { padding: 6 },
  calendarMonthLabel: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  weekdayRow: { flexDirection: "row", marginBottom: 6 },
  weekdayHead: { flex: 1, fontSize: 11, fontWeight: "600", color: theme.textMuted, textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", padding: 2 },
  calendarDayInner: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  calendarDayInnerPast: { opacity: 0.35 },
  calendarDayText: { fontSize: 12, fontWeight: "600", color: theme.textPrimary },
  calendarDayTextSelected: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  calendarDayTextPast: { color: "#9CA3AF" },

  hint: { fontSize: 13, color: theme.textMuted, marginBottom: 8 },
  weeklySection: { marginBottom: 4 },
  weekdayChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  weeksStepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  monthlySection: { marginBottom: 4 },
  monthlyDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },

  pickerInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FCFD",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    flex: 1,
  },
  pickerInputText: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.textPrimary },
  pickerInputPlaceholder: { color: "#9CA3AF", fontWeight: "500" },
  timeRangeRow: { flexDirection: "row", gap: 10 },

  noAddressBox: {
    backgroundColor: "#F8FCFD",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  noAddressText: { fontSize: 14, color: theme.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  noAddressBtnWrap: { marginTop: 14, borderRadius: 12, overflow: "hidden", alignSelf: "stretch" },
  noAddressBtn: { paddingVertical: 12, alignItems: "center" },
  noAddressBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  summaryCard: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  summaryGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryMeta: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  summaryPrice: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },

  errorText: { fontSize: 14, color: "#EF4444", marginBottom: 12, textAlign: "center" },
  noProducts: { fontSize: 14, color: theme.textMuted, textAlign: "center", paddingVertical: 20 },

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
  subscribeBtnWrap: { borderRadius: 16, overflow: "hidden" },
  subscribeBtnDisabled: { opacity: 0.95 },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 54,
  },
  subscribeBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", flex: 1, textAlign: "center" },
  subscribeBtnTextDisabled: { color: "#8A9AA3" },

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetContent: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(107,124,133,0.35)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary },
  sheetList: { maxHeight: 300 },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,234,242,0.95)",
  },
  sheetItemActive: { backgroundColor: "rgba(51,175,193,0.08)", borderRadius: 12, paddingHorizontal: 10 },
  sheetItemText: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.textPrimary },
});
