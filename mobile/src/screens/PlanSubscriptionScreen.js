import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const PLAN_SLUGS = [
  { slug: "basic", name: "Basic Plan", icon: "water-outline" },
  { slug: "family", name: "Family Pack", icon: "people-outline" },
  { slug: "active", name: "Active Plan", icon: "fitness-outline" },
  { slug: "premium", name: "Premium Plan", icon: "diamond-outline" },
];

const FREQUENCIES = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

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
      const data = await api.plans.list();
      setPlans(data);
    } catch (_) {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (selectedSlug && (selectedSlug === "basic" || selectedSlug === "family")) {
      loadPlanProducts(selectedSlug);
    } else {
      setPlanProducts(null);
    }
  }, [selectedSlug, loadPlanProducts]);

  const planInfo = plans.find((p) => p.slug === selectedSlug);
  const isComingSoon = planInfo?.comingSoon ?? (selectedSlug === "active" || selectedSlug === "premium");
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
      });
      router.back();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.headerTopRow}>
              <BackButton onPress={() => router.back()} />
              <TouchableOpacity
                style={styles.headerMenuBtn}
                activeOpacity={0.7}
                onPress={() => setShowMenuModal(true)}
              >
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="document-text-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>My Plan</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          {/* Active plans - dropdown showing count and list (display only) */}
          <Text style={styles.sectionLabel}>Active plans</Text>
          <View style={styles.activePlansCard}>
            <TouchableOpacity
              style={styles.activePlansDropdown}
              onPress={() => setActivePlansDropdownOpen((open) => !open)}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
              <Text style={styles.activePlansDropdownText} numberOfLines={1}>
                {activeSubscriptions.length === 0
                  ? "No active plans"
                  : `${activeSubscriptions.length} plan${activeSubscriptions.length > 1 ? "s" : ""} (tap to view)`}
              </Text>
              <Ionicons name={activePlansDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#6B7C85" />
            </TouchableOpacity>
            {activePlansDropdownOpen &&
              activeSubscriptions.map((sub) => (
                <View key={sub.id} style={styles.activePlanItem}>
                  <Text style={styles.activePlanItemName}>{sub.planName} – {sub.productLabel}</Text>
                  <Text style={styles.activePlanItemMeta}>
                    {sub.subscriptionId ? `ID: ${sub.subscriptionId} · ` : ""}{sub.frequency} • ₹{sub.totalPrice} • {sub.selectedDates?.length || 0} dates
                  </Text>
                </View>
              ))}
          </View>

          <Text style={styles.sectionLabel}>Select new plan</Text>
          <View style={styles.planTilesRow}>
            {PLAN_SLUGS.map((p) => {
              const isSelected = selectedSlug === p.slug;
              const comingSoon = p.slug === "active" || p.slug === "premium";
              return (
                <TouchableOpacity
                  key={p.slug}
                  style={[styles.planTile, isSelected && styles.planTileSelected]}
                  onPress={() => setSelectedSlug(p.slug)}
                  activeOpacity={1}
                >
                  <View style={[styles.planTileIconWrap, isSelected && styles.planTileIconWrapDark]}>
                    <Ionicons
                      name={p.icon}
                      size={24}
                      color={isSelected ? "#FFFFFF" : comingSoon ? "#9CA3AF" : theme.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.planTileName,
                      comingSoon && !isSelected && styles.planTileNameMuted,
                      isSelected && styles.planTileNameWhite,
                    ]}
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  {comingSoon && (
                    <Text style={[styles.comingSoonBadge, isSelected && styles.comingSoonBadgeWhite]}>
                      Coming soon
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isComingSoon && (
            <View style={styles.comingSoonCard}>
              <Ionicons name="time-outline" size={48} color="#6B7C85" />
              <Text style={styles.comingSoonTitle}>Coming soon</Text>
              <Text style={styles.comingSoonText}>This plan is not available yet. Choose Basic Plan or Family Pack.</Text>
            </View>
          )}

          {!isComingSoon && (selectedSlug === "basic" || selectedSlug === "family") && (
            <>
              {productsLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : planProducts?.products?.length ? (
                <>
                  <Text style={styles.sectionLabel}>Frequency</Text>
                  <View style={styles.frequencyRow}>
                    {FREQUENCIES.map((f) => (
                      <TouchableOpacity
                        key={f.key}
                        style={[styles.freqChip, frequency === f.key && styles.freqChipSelected]}
                        onPress={() => setFrequency(f.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.freqChipText, frequency === f.key && styles.freqChipTextSelected]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>Product</Text>
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
                          activeOpacity={1}
                        >
                          <View style={[styles.productCard, isSelected && styles.productCardSelected]}>
                            <View style={[styles.productCardIconWrap, isSelected && styles.productCardIconWrapSelected]}>
                              <Ionicons name={iconName} size={28} color={isSelected ? "#FFFFFF" : theme.primary} />
                            </View>
                            <Text style={[styles.productCardLabel, isSelected && styles.productCardLabelSelected]} numberOfLines={2}>
                              {prod.productLabel}
                            </Text>
                            <Text style={[styles.productCardPrice, isSelected && styles.productCardPriceSelected]}>
                              ₹{price} / {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.quantityRow}>
                      <Text style={styles.sectionLabel}>Quantity (max {maxQty})</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                        >
                          <Ionicons name="remove" size={22} color={quantity <= 1 ? "#9CA3AF" : "#1B2B34"} />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          disabled={quantity >= maxQty}
                        >
                          <Ionicons name="add" size={22} color={quantity >= maxQty ? "#9CA3AF" : "#1B2B34"} />
                        </TouchableOpacity>
                      </View>
                    </View>

                  <Text style={styles.sectionLabel}>
                    {frequency === "daily" ? "Select delivery dates (up to 3 months)" : frequency === "weekly" ? "Select weekdays & number of weeks" : "Select days of month & number of months"}
                  </Text>

                  {frequency === "daily" && (
                    <>
                      <View style={styles.rangeToggles}>
                        <TouchableOpacity
                          style={[styles.rangeBtn, subscribeRange === "month" && styles.rangeBtnSelected]}
                          onPress={() => applyRange("month")}
                        >
                          <Text style={[styles.rangeBtnText, subscribeRange === "month" && styles.rangeBtnTextSelected]}>Entire month</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rangeBtn, subscribeRange === "3months" && styles.rangeBtnSelected]}
                          onPress={() => applyRange("3months")}
                        >
                          <Text style={[styles.rangeBtnText, subscribeRange === "3months" && styles.rangeBtnTextSelected]}>3 months</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rangeBtn, subscribeRange === "custom" && styles.rangeBtnSelected]}
                          onPress={() => applyRange("custom")}
                        >
                          <Text style={[styles.rangeBtnText, subscribeRange === "custom" && styles.rangeBtnTextSelected]}>Custom</Text>
                        </TouchableOpacity>
                      </View>
                      {(subscribeRange === "month" || subscribeRange === "3months") && selectedDates.length > 0 && (
                        <TouchableOpacity style={styles.clearSelectionBtn} onPress={clearDateSelection} activeOpacity={0.8}>
                          <Ionicons name="close-circle-outline" size={18} color="#6B7C85" />
                          <Text style={styles.clearSelectionText}>Clear selection</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.calendarWrapper}>
                      <View style={styles.calendarNav}>
                        <TouchableOpacity
                          onPress={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))}
                          disabled={calendarMonthOffset <= 0}
                          style={styles.calendarNavBtn}
                        >
                          <Ionicons name="chevron-back" size={24} color={calendarMonthOffset <= 0 ? "#9CA3AF" : "#1B2B34"} />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthLabel}>
                          {displayMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setCalendarMonthOffset((o) => Math.min(2, o + 1))}
                          disabled={calendarMonthOffset >= 2}
                          style={styles.calendarNavBtn}
                        >
                          <Ionicons name="chevron-forward" size={24} color={calendarMonthOffset >= 2 ? "#9CA3AF" : "#1B2B34"} />
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
                            <TouchableOpacity
                              key={d.key}
                              style={styles.calendarDay}
                              onPress={() => !isPast && toggleDate(d.key)}
                              disabled={isPast}
                              activeOpacity={0.7}
                            >
                              <View style={[
                                styles.calendarDayInner,
                                isSelected && styles.calendarDayInnerSelected,
                                isPast && styles.calendarDayInnerPast,
                              ]}>
                                <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isPast && styles.calendarDayTextPast]}>
                                  {d.day}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      </View>
                    </>
                  )}

                  {frequency === "weekly" && (
                    <View style={styles.weeklySection}>
                      <Text style={styles.hint}>Select weekdays for delivery</Text>
                      <View style={styles.weekdayChips}>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.weekdayChip, weeklyWeekdays.includes(day) && styles.weekdayChipSelected]}
                            onPress={() => toggleWeekday(day)}
                          >
                            <Text style={[styles.weekdayChipText, weeklyWeekdays.includes(day) && styles.weekdayChipTextSelected]}>
                              {weekdayNames[day]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.hint}>Number of weeks</Text>
                      <View style={styles.weeksStepper}>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setWeeklyWeeks((w) => Math.max(1, w - 1))}>
                          <Ionicons name="remove" size={22} color="#1B2B34" />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{weeklyWeeks}</Text>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setWeeklyWeeks((w) => Math.min(52, w + 1))}>
                          <Ionicons name="add" size={22} color="#1B2B34" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {frequency === "monthly" && (
                    <View style={styles.monthlySection}>
                      <Text style={styles.hint}>Delivery days of month (e.g. 1, 15)</Text>
                      <View style={styles.monthlyDaysRow}>
                        {[1, 5, 10, 15, 20, 25].map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[styles.monthlyDayChip, monthlyDays.includes(day) && styles.monthlyDayChipSelected]}
                            onPress={() =>
                              setMonthlyDays((prev) =>
                                prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
                              )
                            }
                          >
                            <Text style={[styles.monthlyDayChipText, monthlyDays.includes(day) && styles.monthlyDayChipTextSelected]}>{day}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.hint}>Number of months</Text>
                      <View style={styles.weeksStepper}>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setMonthlyMonths((m) => Math.max(1, m - 1))}>
                          <Ionicons name="remove" size={22} color="#1B2B34" />
                        </TouchableOpacity>
                        <Text style={styles.quantityValue}>{monthlyMonths}</Text>
                        <TouchableOpacity style={styles.quantityBtn} onPress={() => setMonthlyMonths((m) => Math.min(12, m + 1))}>
                          <Ionicons name="add" size={22} color="#1B2B34" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={styles.sectionLabel}>Delivery address</Text>
                  <Text style={[styles.hint, { marginBottom: 8 }]}>Select the address for subscription delivery. You can add or edit addresses in Profile → Saved Addresses.</Text>
                  {savedAddresses.length === 0 ? (
                    <View style={styles.noAddressBox}>
                      <Ionicons name="location-outline" size={24} color="#6B7C85" />
                      <Text style={styles.noAddressText}>No saved addresses. Add one in Profile → Saved Addresses to continue.</Text>
                      <TouchableOpacity style={styles.noAddressBtn} onPress={() => router.push("/saved-addresses")} activeOpacity={0.8}>
                        <Text style={styles.noAddressBtnText}>Go to Saved Addresses</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.deliveryTimeInput} onPress={() => setShowAddressPicker(true)} activeOpacity={0.8}>
                        <Text style={{ color: selectedAddressId ? "#1B2B34" : "#9CA3AF", fontSize: 15 }} numberOfLines={2}>
                          {selectedAddressId ? (savedAddresses.find((a) => a.id === selectedAddressId)?.fullAddress || "Select address") : "Select address"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7C85" style={{ position: "absolute", right: 12, top: 14 }} />
                      </TouchableOpacity>
                      <Modal visible={showAddressPicker} transparent animationType="slide">
                        <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPress={() => setShowAddressPicker(false)}>
                          <View style={[styles.menuModalContent, { maxHeight: 360 }]} onStartShouldSetResponder={() => true}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2B34" }}>Select address</Text>
                              <TouchableOpacity onPress={() => setShowAddressPicker(false)}><Ionicons name="close" size={24} color="#6B7C85" /></TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 300 }}>
                              {savedAddresses.map((a) => (
                                <TouchableOpacity
                                  key={a.id}
                                  style={[styles.menuModalItem, selectedAddressId === a.id && { backgroundColor: "#E0F2FE" }]}
                                  onPress={() => { setSelectedAddressId(a.id); setShowAddressPicker(false); }}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.menuModalItemText} numberOfLines={2}>{a.fullAddress || "—"}</Text>
                                  {selectedAddressId === a.id && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        </TouchableOpacity>
                      </Modal>
                    </>
                  )}

                  <Text style={styles.sectionLabel}>Preferred delivery time range</Text>
                  <Text style={[styles.hint, { marginBottom: 8 }]}>Choose a 1-hour window when you want delivery (e.g. 11:00 AM – 12:00 PM). Set by you when selecting the plan.</Text>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                    <TouchableOpacity style={[styles.deliveryTimeInput, { flex: 1 }]} onPress={() => setShowTimeStartPicker(true)} activeOpacity={0.8}>
                      <Text style={{ color: preferredTimeRangeStart ? "#1B2B34" : "#9CA3AF", fontSize: 15 }}>{preferredTimeRangeStart || "From"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.deliveryTimeInput, { flex: 1 }]} onPress={() => setShowTimeEndPicker(true)} activeOpacity={0.8}>
                      <Text style={{ color: preferredTimeRangeEnd ? "#1B2B34" : "#9CA3AF", fontSize: 15 }}>{preferredTimeRangeEnd || "To"}</Text>
                    </TouchableOpacity>
                  </View>
                  <Modal visible={showTimeStartPicker} transparent animationType="slide">
                    <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPress={() => setShowTimeStartPicker(false)}>
                      <View style={[styles.menuModalContent, { maxHeight: 320 }]} onStartShouldSetResponder={() => true}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2B34" }}>From (start)</Text>
                          <TouchableOpacity onPress={() => setShowTimeStartPicker(false)}><Ionicons name="close" size={24} color="#6B7C85" /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 260 }}>
                          {PREFERRED_TIME_OPTIONS.filter((o) => o.value).map((opt) => (
                            <TouchableOpacity key={opt.value} style={[styles.menuModalItem, preferredTimeRangeStart === opt.value && { backgroundColor: "#E0F2FE" }]} onPress={() => { setPreferredTimeRangeStart(opt.value); setShowTimeStartPicker(false); }} activeOpacity={0.8}>
                              <Text style={styles.menuModalItemText}>{opt.label}</Text>
                              {preferredTimeRangeStart === opt.value && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                  <Modal visible={showTimeEndPicker} transparent animationType="slide">
                    <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPress={() => setShowTimeEndPicker(false)}>
                      <View style={[styles.menuModalContent, { maxHeight: 320 }]} onStartShouldSetResponder={() => true}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1B2B34" }}>To (end)</Text>
                          <TouchableOpacity onPress={() => setShowTimeEndPicker(false)}><Ionicons name="close" size={24} color="#6B7C85" /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 260 }}>
                          {PREFERRED_TIME_OPTIONS.filter((o) => o.value).map((opt) => (
                            <TouchableOpacity key={opt.value} style={[styles.menuModalItem, preferredTimeRangeEnd === opt.value && { backgroundColor: "#E0F2FE" }]} onPress={() => { setPreferredTimeRangeEnd(opt.value); setShowTimeEndPicker(false); }} activeOpacity={0.8}>
                              <Text style={styles.menuModalItemText}>{opt.label}</Text>
                              {preferredTimeRangeEnd === opt.value && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Ionicons name="wallet-outline" size={24} color={theme.primary} style={styles.summaryIcon} />
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Total</Text>
                        <Text style={styles.summaryPrice}>₹{totalPrice}</Text>
                        <Text style={styles.summaryMeta}>
                          {selectedProduct?.productLabel} × {quantity} × {resolvedDates.length} delivery dates
                        </Text>
                      </View>
                    </View>
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <TouchableOpacity
                    style={[styles.subscribeBtn, (!canSubscribe || submitting) && styles.subscribeBtnDisabled]}
                    onPress={handleSubscribe}
                    disabled={!canSubscribe || submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.subscribeBtnText}>Subscribe</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : !productsLoading && (
                <Text style={styles.noProducts}>No products for this plan.</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={showMenuModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/profile"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/order-history"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Order History</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/water-intake"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="water-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Water Intake</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => { setShowMenuModal(false); router.push("/dashboard"); }}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={22} color="#1B2B34" />
              <Text style={styles.menuModalItemText}>Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7C85" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default PlanSubscriptionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 200, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 24, paddingHorizontal: 36, paddingBottom: 36 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  headerMenuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerCenter: { alignItems: "center", justifyContent: "center", marginTop: -14, width: "100%" },
  headerIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginBottom: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingBottom: 32 },
  contentSection: {
    marginTop: -16,
    marginLeft: 2,
    marginRight: 2,
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 10 },
  activePlansCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  activePlansDropdown: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  activePlansDropdownText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  activePlanItem: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingVertical: 12, paddingHorizontal: 4 },
  activePlanItemName: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  activePlanItemMeta: { fontSize: 13, color: "#6B7C85", marginTop: 4 },
  planTilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  planTile: {
    width: "48%",
    minWidth: 140,
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  planTileSelected: {
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  planTileIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.selectedTint, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  planTileIconWrapDark: { backgroundColor: "rgba(255,255,255,0.25)" },
  planTileName: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  planTileNameMuted: { color: "#6B7C85" },
  planTileNameWhite: { color: "#FFFFFF" },
  comingSoonBadge: { fontSize: 11, color: theme.primary, marginTop: 6, fontWeight: "600" },
  comingSoonBadgeWhite: { color: "rgba(255,255,255,0.9)" },
  comingSoonCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  comingSoonTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginTop: 12 },
  comingSoonText: { fontSize: 14, color: "#6B7C85", marginTop: 8, textAlign: "center" },
  loadingWrap: { padding: 40, alignItems: "center" },
  frequencyRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  freqChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#f0f7fcd7",
  },
  freqChipSelected: {
    backgroundColor: theme.primary,
  },
  freqChipText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  freqChipTextSelected: { color: "#FFFFFF" },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 16,
  },
  productCardWrapper: {
    width: "33.33%",
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 10,
    minWidth: 0,
  },
  productCard: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
  },
  productCardSelected: {
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  productCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.selectedTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  productCardIconWrapSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  productCardLabel: { fontSize: 12, fontWeight: "600", color: "#1B2B34", textAlign: "center", marginBottom: 4 },
  productCardLabelSelected: { color: "#FFFFFF" },
  productCardPrice: { fontSize: 12, fontWeight: "700", color: theme.primary },
  productCardPriceSelected: { color: "#FFFFFF" },
  quantityRow: { marginBottom: 16 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  quantityBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.selectedTint, justifyContent: "center", alignItems: "center" },
  quantityValue: { fontSize: 18, fontWeight: "700", color: "#1B2B34", minWidth: 32, textAlign: "center" },
  rangeToggles: { flexDirection: "row", gap: 8, marginBottom: 12 },
  rangeBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  rangeBtnSelected: { backgroundColor: theme.primary },
  rangeBtnText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  rangeBtnTextSelected: { color: "#FFFFFF" },
  clearSelectionBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 12, paddingVertical: 6, paddingHorizontal: 10, gap: 6 },
  clearSelectionText: { fontSize: 13, fontWeight: "600", color: "#6B7C85" },
  calendarWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  calendarNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  calendarNavBtn: { padding: 8 },
  calendarMonthLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayHead: { flex: 1, fontSize: 11, fontWeight: "600", color: "#6B7C85", textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", padding: 2 },
  calendarDayInner: { width: "78%", aspectRatio: 1, borderRadius: 999, justifyContent: "center", alignItems: "center", alignSelf: "center" },
  calendarDayInnerSelected: { backgroundColor: theme.primary },
  calendarDayInnerPast: { opacity: 0.35 },
  calendarDayText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  calendarDayTextSelected: { color: "#FFFFFF" },
  calendarDayTextPast: { color: "#9CA3AF" },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 8 },
  deliveryTimeInput: {
    backgroundColor: "#f0f7fcd7",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1B2B34",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noAddressBox: { backgroundColor: "#f0f7fcd7", borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  noAddressText: { fontSize: 14, color: "#6B7C85", textAlign: "center", marginTop: 8 },
  noAddressBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: theme.primary, borderRadius: 10 },
  noAddressBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  weeklySection: { marginBottom: 20 },
  weekdayChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  weekdayChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  weekdayChipSelected: { backgroundColor: theme.primary },
  weekdayChipText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  weekdayChipTextSelected: { color: "#FFFFFF" },
  weeksStepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  monthlySection: { marginBottom: 20 },
  monthlyDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  monthlyDayChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  monthlyDayChipSelected: { backgroundColor: theme.primary },
  monthlyDayChipText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  monthlyDayChipTextSelected: { color: "#FFFFFF" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryIcon: { marginRight: 12 },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 2 },
  summaryPrice: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  summaryMeta: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  errorText: { fontSize: 14, color: "#EF4444", marginBottom: 12 },
  subscribeBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  subscribeBtnDisabled: { backgroundColor: "#9CA3AF", opacity: 0.8 },
  subscribeBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  noProducts: { fontSize: 14, color: "#6B7C85", textAlign: "center", paddingVertical: 20 },
  menuModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingRight: 20, alignItems: "flex-end" },
  menuModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, minWidth: 220, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  menuModalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18 },
  menuModalItemText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1B2B34", marginLeft: 12 },
});
