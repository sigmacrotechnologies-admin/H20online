import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    ((frequency === "daily" && selectedDates.length > 0) ||
      (frequency === "weekly" && weeklyWeekdays.length > 0) ||
      (frequency === "monthly" && monthlyDays.length > 0));

  const handleSubscribe = async () => {
    if (!canSubscribe || !planInfo) return;
    setError("");
    setSubmitting(true);
    try {
      await api.subscriptions.create({
        planId: planInfo.id,
        planName: planInfo.name,
        productKey: selectedProduct.productKey,
        productLabel: selectedProduct.productLabel,
        frequency,
        unitPrice,
        quantity,
        selectedDates: resolvedDates,
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
        <View style={styles.headerPanel}>
          <LinearGradient
            colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerNav}>
              <BackButton onPress={() => router.back()} />
              <Text style={styles.headerTitle}>Plan & Subscription</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionLabel}>Select plan</Text>
          <View style={styles.planTilesRow}>
            {PLAN_SLUGS.map((p) => {
              const isSelected = selectedSlug === p.slug;
              const comingSoon = p.slug === "active" || p.slug === "premium";
              return (
                <TouchableOpacity
                  key={p.slug}
                  style={[styles.planTile, isSelected && styles.planTileSelected]}
                  onPress={() => setSelectedSlug(p.slug)}
                  activeOpacity={0.8}
                >
                  <View style={styles.planTileIconWrap}>
                    <Ionicons name={p.icon} size={24} color={comingSoon ? "#9CA3AF" : "#0EA5E9"} />
                  </View>
                  <Text style={[styles.planTileName, comingSoon && styles.planTileNameMuted]} numberOfLines={2}>
                    {p.name}
                  </Text>
                  {comingSoon && (
                    <Text style={styles.comingSoonBadge}>Coming soon</Text>
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
                  <ActivityIndicator size="large" color="#0EA5E9" />
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
                  <View style={styles.productList}>
                    {planProducts.products.map((prod) => {
                      const price = frequency === "daily" ? prod.priceDaily : frequency === "weekly" ? prod.priceWeekly : prod.priceMonthly;
                      const isSelected = selectedProduct?.productKey === prod.productKey;
                      return (
                        <TouchableOpacity
                          key={prod.id}
                          style={[styles.productRow, isSelected && styles.productRowSelected]}
                          onPress={() => setSelectedProduct(prod)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.productLabel}>{prod.productLabel}</Text>
                          <Text style={styles.productPrice}>₹{price} / {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}</Text>
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

                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Ionicons name="wallet-outline" size={24} color="#0EA5E9" style={styles.summaryIcon} />
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
    </SafeAreaView>
  );
};

export default PlanSubscriptionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa" },
  scrollContent: { paddingBottom: 40 },
  headerPanel: { marginHorizontal: -20, overflow: "hidden" },
  headerGradient: { paddingTop: 14, paddingBottom: 20, paddingHorizontal: 28 },
  headerNav: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  contentSection: { paddingHorizontal: 20, marginTop: -16, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#1B2B34", marginBottom: 10 },
  planTilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  planTile: { width: "48%", minWidth: 140, backgroundColor: "#f0f7fcd7", borderRadius: 16, padding: 16, elevation: 2 },
  planTileSelected: { backgroundColor: "#E0F2FE", borderWidth: 2, borderColor: "#0EA5E9" },
  planTileIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  planTileName: { fontSize: 14, fontWeight: "700", color: "#1B2B34" },
  planTileNameMuted: { color: "#6B7C85" },
  comingSoonBadge: { fontSize: 11, color: "#0EA5E9", marginTop: 6, fontWeight: "600" },
  comingSoonCard: { backgroundColor: "#f0f7fcd7", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 20 },
  comingSoonTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34", marginTop: 12 },
  comingSoonText: { fontSize: 14, color: "#6B7C85", marginTop: 8, textAlign: "center" },
  loadingWrap: { padding: 40, alignItems: "center" },
  frequencyRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  freqChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  freqChipSelected: { backgroundColor: "#0EA5E9" },
  freqChipText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  freqChipTextSelected: { color: "#FFFFFF" },
  productList: { marginBottom: 16 },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: "#f0f7fcd7", marginBottom: 8 },
  productRowSelected: { backgroundColor: "#E0F2FE", borderWidth: 2, borderColor: "#8ED1FC" },
  productLabel: { fontSize: 15, fontWeight: "600", color: "#1B2B34" },
  productPrice: { fontSize: 14, fontWeight: "600", color: "#0EA5E9" },
  quantityRow: { marginBottom: 16 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  quantityBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center" },
  quantityValue: { fontSize: 18, fontWeight: "700", color: "#1B2B34", minWidth: 32, textAlign: "center" },
  rangeToggles: { flexDirection: "row", gap: 8, marginBottom: 12 },
  rangeBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  rangeBtnSelected: { backgroundColor: "#0EA5E9" },
  rangeBtnText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  rangeBtnTextSelected: { color: "#FFFFFF" },
  clearSelectionBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 12, paddingVertical: 6, paddingHorizontal: 10, gap: 6 },
  clearSelectionText: { fontSize: 13, fontWeight: "600", color: "#6B7C85" },
  calendarWrapper: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  calendarNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  calendarNavBtn: { padding: 8 },
  calendarMonthLabel: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayHead: { flex: 1, fontSize: 11, fontWeight: "600", color: "#6B7C85", textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", padding: 2 },
  calendarDayInner: { width: "78%", aspectRatio: 1, borderRadius: 999, justifyContent: "center", alignItems: "center", alignSelf: "center" },
  calendarDayInnerSelected: { backgroundColor: "#0EA5E9" },
  calendarDayInnerPast: { opacity: 0.35 },
  calendarDayText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  calendarDayTextSelected: { color: "#FFFFFF" },
  calendarDayTextPast: { color: "#9CA3AF" },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 8 },
  weeklySection: { marginBottom: 20 },
  weekdayChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  weekdayChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  weekdayChipSelected: { backgroundColor: "#0EA5E9" },
  weekdayChipText: { fontSize: 13, fontWeight: "600", color: "#1B2B34" },
  weekdayChipTextSelected: { color: "#FFFFFF" },
  weeksStepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  monthlySection: { marginBottom: 20 },
  monthlyDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  monthlyDayChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#f0f7fcd7" },
  monthlyDayChipSelected: { backgroundColor: "#0EA5E9" },
  monthlyDayChipText: { fontSize: 14, fontWeight: "600", color: "#1B2B34" },
  monthlyDayChipTextSelected: { color: "#FFFFFF" },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryIcon: { marginRight: 12 },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 13, color: "#6B7C85", marginBottom: 2 },
  summaryPrice: { fontSize: 22, fontWeight: "700", color: "#1B2B34" },
  summaryMeta: { fontSize: 12, color: "#6B7C85", marginTop: 4 },
  errorText: { fontSize: 14, color: "#EF4444", marginBottom: 12 },
  subscribeBtn: { backgroundColor: "#0EA5E9", paddingVertical: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  subscribeBtnDisabled: { backgroundColor: "#9CA3AF", opacity: 0.8 },
  subscribeBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  noProducts: { fontSize: 14, color: "#6B7C85", textAlign: "center", paddingVertical: 20 },
});
