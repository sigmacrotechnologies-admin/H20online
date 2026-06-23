import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StatusBar,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { ModernInput } from "@/src/components/modern";
import AddressMapPicker from "@/src/components/AddressMapPicker";
import { theme } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";
import { addressToCheckoutFields, normalizePin } from "@/src/utils/checkoutAddress";

const FIELDS = [
  { key: "houseNumber", label: "House / Building no.", placeholder: "e.g. 12, Tower A", icon: "home-outline" },
  { key: "locality", label: "Locality / Area", placeholder: "e.g. Sector 5", icon: "map-outline" },
  { key: "city", label: "City", placeholder: "e.g. Mumbai", icon: "business-outline" },
  { key: "state", label: "State", placeholder: "e.g. Maharashtra", icon: "flag-outline" },
  { key: "pinCode", label: "PIN code", placeholder: "e.g. 400001", keyboardType: "number-pad", icon: "mail-outline" },
  { key: "phoneNumber", label: "Phone number *", placeholder: "e.g. 9876543210", keyboardType: "phone-pad", icon: "call-outline" },
];

function buildPreviewAddress(form) {
  const parts = [form.houseNumber, form.locality, form.city, form.state, form.pinCode].map((p) => String(p || "").trim()).filter(Boolean);
  return parts.join(", ");
}

function FormSectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.formSectionCard}>
      <View style={styles.formSectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.formSectionIcon}>
          <Ionicons name={icon} size={16} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.formSectionHeaderText}>
          <Text style={styles.formSectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.formSectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function AddressFormSheet({ visible, editingId, form, setForm, error, saving, onClose, onSave }) {
  const preview = buildPreviewAddress(form);
  const filledCount = FIELDS.filter((f) => String(form[f.key] || "").trim()).length;
  const progress = filledCount / FIELDS.length;

  const handleCoordinatesChange = ({ latitude, longitude }) => {
    setForm((prev) => ({ ...prev, latitude, longitude }));
  };

  const handleAddressFromMap = (parts) => {
    setForm((prev) => ({
      ...prev,
      houseNumber: parts.houseNumber || prev.houseNumber,
      locality: parts.locality || prev.locality,
      city: parts.city || prev.city,
      state: parts.state || prev.state,
      pinCode: parts.pinCode || prev.pinCode,
    }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetPanel}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sheetHero}>
            <View style={styles.sheetHandleLight} />
            <View style={styles.sheetHeroRow}>
              <View style={styles.sheetHeroLeft}>
                <View style={styles.sheetHeroIcon}>
                  <Ionicons name={editingId ? "create-outline" : "add-circle-outline"} size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sheetHeroTitle}>{editingId ? "Edit address" : "Add new address"}</Text>
                  <Text style={styles.sheetHeroSubtitle}>{filledCount}/{FIELDS.length} fields completed</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.sheetHeroClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient colors={["#FFFFFF", "rgba(255,255,255,0.75)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.max(8, progress * 100)}%` }]} />
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewCard}>
              {preview ? (
                <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.previewGradient}>
                  <View style={styles.previewIcon}>
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.previewTextWrap}>
                    <Text style={styles.previewLabel}>Delivery preview</Text>
                    <Text style={styles.previewValue} numberOfLines={3}>{preview}</Text>
                    {form.phoneNumber ? (
                      <View style={styles.previewPhoneRow}>
                        <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.previewPhone}>{form.phoneNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.previewEmpty}>
                  <Ionicons name="location-outline" size={28} color={theme.accent} />
                  <Text style={styles.previewEmptyTitle}>Address preview</Text>
                  <Text style={styles.previewEmptyText}>Start typing to see how your delivery address will appear.</Text>
                </View>
              )}
            </View>

            <FormSectionCard icon="location-outline" title="Pin on map" subtitle="Tap map, drag pin, or use current location">
              <AddressMapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onCoordinatesChange={handleCoordinatesChange}
                onAddressResolved={handleAddressFromMap}
              />
            </FormSectionCard>

            <FormSectionCard icon="home-outline" title="Property details" subtitle="House or building info">
              <ModernInput
                label={FIELDS[0].label}
                icon={FIELDS[0].icon}
                value={form.houseNumber}
                onChangeText={(t) => setForm((prev) => ({ ...prev, houseNumber: t }))}
                placeholder={FIELDS[0].placeholder}
              />
            </FormSectionCard>

            <FormSectionCard icon="map-outline" title="Location" subtitle="Area, city and PIN">
              <ModernInput
                label={FIELDS[1].label}
                icon={FIELDS[1].icon}
                value={form.locality}
                onChangeText={(t) => setForm((prev) => ({ ...prev, locality: t }))}
                placeholder={FIELDS[1].placeholder}
              />
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <ModernInput
                    label={FIELDS[2].label}
                    icon={FIELDS[2].icon}
                    value={form.city}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, city: t }))}
                    placeholder={FIELDS[2].placeholder}
                  />
                </View>
                <View style={styles.formCol}>
                  <ModernInput
                    label={FIELDS[3].label}
                    icon={FIELDS[3].icon}
                    value={form.state}
                    onChangeText={(t) => setForm((prev) => ({ ...prev, state: t }))}
                    placeholder={FIELDS[3].placeholder}
                  />
                </View>
              </View>
              <ModernInput
                label={FIELDS[4].label}
                icon={FIELDS[4].icon}
                value={form.pinCode}
                onChangeText={(t) => setForm((prev) => ({ ...prev, pinCode: t }))}
                placeholder={FIELDS[4].placeholder}
                keyboardType={FIELDS[4].keyboardType}
              />
            </FormSectionCard>

            <FormSectionCard icon="call-outline" title="Contact & preferences" subtitle="Receiver phone and default setting">
              <ModernInput
                label={FIELDS[5].label}
                icon={FIELDS[5].icon}
                value={form.phoneNumber}
                onChangeText={(t) => setForm((prev) => ({ ...prev, phoneNumber: t }))}
                placeholder={FIELDS[5].placeholder}
                keyboardType={FIELDS[5].keyboardType}
              />
              <TouchableOpacity
                style={[styles.defaultToggleCard, form.isDefault && styles.defaultToggleCardActive]}
                onPress={() => setForm((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={form.isDefault ? [theme.medium, theme.accent] : ["rgba(51,175,193,0.1)", "rgba(51,175,193,0.06)"]}
                  style={styles.defaultToggleIcon}
                >
                  <Ionicons name={form.isDefault ? "star" : "star-outline"} size={18} color={form.isDefault ? "#FFFFFF" : theme.accent} />
                </LinearGradient>
                <View style={styles.defaultToggleText}>
                  <Text style={styles.defaultToggleLabel}>Set as default address</Text>
                  <Text style={styles.defaultToggleHint}>Auto-selected at checkout and subscriptions</Text>
                </View>
                <Ionicons name={form.isDefault ? "checkmark-circle" : "ellipse-outline"} size={22} color={form.isDefault ? theme.accent : "#CBD5E1"} />
              </TouchableOpacity>
            </FormSectionCard>

            <View style={styles.formSecureNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
              <Text style={styles.formSecureText}>Your address is stored securely and only used for deliveries.</Text>
            </View>

            {error ? (
              <View style={styles.errBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.errText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.sheetActionBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.85} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtnWrap, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving} activeOpacity={0.9}>
              <LinearGradient
                colors={saving ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>{editingId ? "Update address" : "Save address"}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const TIPS = [
  { icon: "cart-outline", text: "Auto-filled at checkout for faster orders" },
  { icon: "repeat-outline", text: "Used for subscription and plan deliveries" },
  { icon: "star-outline", text: "Mark one address as default for quick selection" },
];

function getAddressLabel(address, index) {
  const house = String(address.houseNumber || "").trim();
  const locality = String(address.locality || "").trim();
  if (house) return house;
  if (locality) return locality;
  return `Address ${index + 1}`;
}

function ListSectionCard({ icon, title, subtitle, children }) {
  return (
    <View style={styles.listSectionCard}>
      <View style={styles.listSectionHeader}>
        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.listSectionIcon}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.listSectionHeaderText}>
          <Text style={styles.listSectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.listSectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function DefaultAddressHero({ address, onEdit, onDelete, selectMode, onSelect, isSelected }) {
  const inner = (
    <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.defaultHero}>
        <View style={styles.defaultHeroTop}>
          <View style={styles.defaultHeroBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.defaultHeroBadgeText}>Primary address</Text>
          </View>
          {!selectMode ? (
            <TouchableOpacity onPress={() => onEdit(address)} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          ) : isSelected ? (
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          ) : null}
        </View>
        <Text style={styles.defaultHeroLabel}>{getAddressLabel(address, 0)}</Text>
        <Text style={styles.defaultHeroAddress} numberOfLines={3}>{address.fullAddress || "—"}</Text>
        <View style={styles.defaultHeroMeta}>
          {address.city || address.state ? (
            <Text style={styles.defaultHeroMetaText}>{[address.city, address.state].filter(Boolean).join(", ")}</Text>
          ) : null}
          {address.pinCode ? (
            <Text style={styles.defaultHeroMetaText}>PIN {address.pinCode}</Text>
          ) : null}
          {address.phoneNumber ? (
            <View style={styles.defaultHeroPhone}>
              <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.defaultHeroMetaText}>{address.phoneNumber}</Text>
            </View>
          ) : null}
        </View>
        {selectMode ? (
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionBtn} onPress={() => onSelect?.(address)} activeOpacity={0.85}>
              <Ionicons name="checkmark-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroActionText}>Use for checkout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionBtn} onPress={() => onEdit(address)} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroActionBtnDanger} onPress={() => onDelete(address)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
    </LinearGradient>
  );

  if (selectMode) {
    return (
      <TouchableOpacity style={styles.defaultHeroWrap} onPress={() => onSelect?.(address)} activeOpacity={0.9}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={styles.defaultHeroWrap}>{inner}</View>;
}

function AddressCard({ address, index, onEdit, onDelete, onSetDefault, settingDefaultId, selectMode, onSelect, isSelected }) {
  const label = getAddressLabel(address, index);
  const isSetting = settingDefaultId === address.id;

  const cardInner = (
    <View style={[styles.addressCard, address.isDefault && styles.addressCardDefault, isSelected && styles.addressCardSelected]}>
      <View style={styles.addressCardTop}>
        <LinearGradient
          colors={address.isDefault ? [theme.medium, theme.accent] : ["#E0F7FA", "#F8FDFF"]}
          style={styles.addressIconWrap}
        >
          <Ionicons name={address.isDefault ? "location" : "location-outline"} size={20} color={address.isDefault ? "#FFFFFF" : theme.accent} />
        </LinearGradient>
        <View style={styles.addressCardBody}>
          <View style={styles.addressTitleRow}>
            <View style={styles.addressLabelWrap}>
              <Text style={styles.addressLabel}>{label}</Text>
              {address.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.addressTitle} numberOfLines={2}>{address.fullAddress || "—"}</Text>
          <View style={styles.addressMetaRow}>
            {address.city ? (
              <View style={styles.metaChip}>
                <Ionicons name="business-outline" size={11} color={theme.accent} />
                <Text style={styles.metaChipText}>{address.city}</Text>
              </View>
            ) : null}
            {address.pinCode ? (
              <View style={styles.metaChip}>
                <Ionicons name="mail-outline" size={11} color={theme.accent} />
                <Text style={styles.metaChipText}>{address.pinCode}</Text>
              </View>
            ) : null}
          </View>
          {address.phoneNumber ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={theme.accent} />
              <Text style={styles.phoneText}>{address.phoneNumber}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardActions}>
        {selectMode ? (
          <TouchableOpacity style={styles.selectCheckoutBtn} onPress={() => onSelect?.(address)} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.accent} />
            <Text style={styles.selectCheckoutBtnText}>Use for checkout</Text>
          </TouchableOpacity>
        ) : !address.isDefault ? (
          <TouchableOpacity
            style={styles.defaultBtn}
            onPress={() => onSetDefault(address)}
            activeOpacity={0.85}
            disabled={isSetting}
          >
            {isSetting ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <>
                <Ionicons name="star-outline" size={16} color={theme.accent} />
                <Text style={styles.defaultBtnText}>Set default</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.defaultActivePill}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.defaultActiveText}>Active default</Text>
          </View>
        )}
        {!selectMode ? (
          <>
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(address)} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={16} color={theme.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(address)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );

  if (selectMode) {
    return (
      <TouchableOpacity onPress={() => onSelect?.(address)} activeOpacity={0.9}>
        {cardInner}
      </TouchableOpacity>
    );
  }

  return cardInner;
}

export default function SavedAddressesScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams();
  const selectMode = from === "checkout";
  const { setCheckoutDetails, getCheckoutDetails } = useCart();
  const selectedCheckoutId = getCheckoutDetails?.()?.addressId || null;
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    houseNumber: "",
    locality: "",
    city: "",
    state: "",
    pinCode: "",
    phoneNumber: "",
    latitude: null,
    longitude: null,
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const fetchAddresses = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return api.addresses
      .list()
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => {
        if (!silent) setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddresses(true);
  }, [fetchAddresses]);

  const defaultAddress = useMemo(() => addresses.find((a) => a.isDefault) || null, [addresses]);
  const otherAddresses = useMemo(() => addresses.filter((a) => !a.isDefault), [addresses]);
  const defaultCount = addresses.filter((a) => a.isDefault).length;

  const openAdd = () => {
    setEditingId(null);
    setForm({
      houseNumber: "",
      locality: "",
      city: "",
      state: "",
      pinCode: "",
      phoneNumber: "",
      latitude: null,
      longitude: null,
      isDefault: false,
    });
    setError("");
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      houseNumber: a.houseNumber || "",
      locality: a.locality || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      phoneNumber: a.phoneNumber || "",
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      isDefault: a.isDefault || false,
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError("");
  };

  const validate = () => {
    const { locality, city, state, pinCode, phoneNumber } = form;
    const pin = String(pinCode || "").replace(/\D/g, "");
    if (!pin || pin.length < 6) {
      setError("Valid 6-digit PIN code is required.");
      return false;
    }
    if (!locality.trim() && !city.trim() && !state.trim()) {
      setError("Please fill at least locality, city or state.");
      return false;
    }
    if (!String(phoneNumber || "").trim()) {
      setError("Phone number is required.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.addresses.update(editingId, form);
        setAddresses((prev) =>
          prev.map((a) => {
            if (a.id === editingId) return updated;
            if (form.isDefault) return { ...a, isDefault: false };
            return a;
          })
        );
      } else {
        const created = await api.addresses.create(form);
        setAddresses((prev) => {
          const next = form.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
          return [created, ...next];
        });
      }
      closeForm();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (address) => {
    if (address.isDefault || settingDefaultId) return;
    setSettingDefaultId(address.id);
    try {
      const updated = await api.addresses.update(address.id, {
        houseNumber: address.houseNumber || "",
        locality: address.locality || "",
        city: address.city || "",
        state: address.state || "",
        pinCode: address.pinCode || "",
        phoneNumber: address.phoneNumber || "",
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        isDefault: true,
      });
      setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : { ...a, isDefault: false })));
    } catch (err) {
      Alert.alert("Error", err.message || "Could not set default address");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = (a) => {
    Alert.alert("Delete address", `Remove "${a.fullAddress || "this address"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          api.addresses
            .delete(a.id)
            .then(() => setAddresses((prev) => prev.filter((x) => x.id !== a.id)))
            .catch((e) => Alert.alert("Error", e.message || "Could not delete")),
      },
    ]);
  };

  const handleSelectForCheckout = (address) => {
    const fields = addressToCheckoutFields(address);
    if (!fields) return;
    const pin = normalizePin(fields.pinCode);
    if (!pin || pin.length < 6) {
      Alert.alert("PIN required", "This address needs a valid 6-digit PIN. Please edit the address first.");
      return;
    }
    if (!String(fields.receiverPhone || "").trim()) {
      Alert.alert("Phone required", "This address needs a phone number. Please edit the address first.");
      return;
    }
    const prev = getCheckoutDetails?.() || {};
    setCheckoutDetails({
      ...prev,
      ...fields,
      pinCode: pin,
    });
    router.back();
  };

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
              <TouchableOpacity style={styles.headerAddBtn} onPress={openAdd} activeOpacity={0.85}>
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>{selectMode ? "Choose address" : "Saved addresses"}</Text>
            <Text style={styles.headerSubtitle}>
              {selectMode ? "Tap an address to use it on checkout (PIN & phone included)" : "Manage delivery locations and contact numbers"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.contentSection}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
            >
              {addresses.length > 0 ? (
                <View style={styles.summaryBanner}>
                  <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBannerGradient}>
                    <View style={styles.summaryBannerIcon}>
                      <Ionicons name="location-outline" size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.summaryBannerText}>
                      <Text style={styles.summaryBannerLabel}>Delivery book</Text>
                      <Text style={styles.summaryBannerValue}>
                        {addresses.length} address{addresses.length !== 1 ? "es" : ""} · {defaultCount} default
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.summaryAddChip} onPress={openAdd} activeOpacity={0.85}>
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ) : null}

              {addresses.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="location-outline" size={40} color={theme.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>No saved addresses</Text>
                  <Text style={styles.emptyText}>Save your home, office, or any delivery spot to speed up checkout and subscriptions.</Text>

                  <View style={styles.emptySteps}>
                    {[
                      { step: "1", title: "Add address", desc: "Enter house, area, city & phone" },
                      { step: "2", title: "Set default", desc: "Pick your most-used location" },
                      { step: "3", title: "Order faster", desc: "Auto-filled at checkout" },
                    ].map((item) => (
                      <View key={item.step} style={styles.emptyStepCard}>
                        <LinearGradient colors={[theme.medium, theme.accent]} style={styles.emptyStepBadge}>
                          <Text style={styles.emptyStepBadgeText}>{item.step}</Text>
                        </LinearGradient>
                        <View style={styles.emptyStepText}>
                          <Text style={styles.emptyStepTitle}>{item.title}</Text>
                          <Text style={styles.emptyStepDesc}>{item.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.emptyBtnWrap} onPress={openAdd} activeOpacity={0.9}>
                    <LinearGradient colors={[theme.medium, theme.accent]} style={styles.emptyBtn}>
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.emptyBtnText}>Add your first address</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {defaultAddress ? (
                    <DefaultAddressHero
                      address={defaultAddress}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      selectMode={selectMode}
                      onSelect={handleSelectForCheckout}
                      isSelected={selectedCheckoutId === defaultAddress.id}
                    />
                  ) : null}

                  {(defaultAddress ? otherAddresses : addresses).length > 0 ? (
                    <ListSectionCard
                      icon="albums-outline"
                      title={defaultAddress ? "Other addresses" : "All addresses"}
                      subtitle={`${(defaultAddress ? otherAddresses : addresses).length} location${(defaultAddress ? otherAddresses : addresses).length !== 1 ? "s" : ""}`}
                    >
                      {(defaultAddress ? otherAddresses : addresses).map((a, idx) => (
                        <AddressCard
                          key={a.id}
                          address={a}
                          index={idx}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onSetDefault={handleSetDefault}
                          settingDefaultId={settingDefaultId}
                          selectMode={selectMode}
                          onSelect={handleSelectForCheckout}
                          isSelected={selectedCheckoutId === a.id}
                        />
                      ))}
                    </ListSectionCard>
                  ) : null}

                  <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>Good to know</Text>
                    {TIPS.map((tip) => (
                      <View key={tip.text} style={styles.tipRow}>
                        <View style={styles.tipIcon}>
                          <Ionicons name={tip.icon} size={16} color={theme.accent} />
                        </View>
                        <Text style={styles.tipText}>{tip.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {addresses.length > 0 && !loading ? (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</Text>
            <Text style={styles.footerHint}>{defaultCount > 0 ? "Default ready" : "No default set"}</Text>
          </View>
          <TouchableOpacity style={styles.footerBtnWrap} onPress={openAdd} activeOpacity={0.9}>
            <LinearGradient colors={[theme.medium, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footerBtn}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.footerBtnText}>Add new address</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      <AddressFormSheet
        visible={showForm}
        editingId={editingId}
        form={form}
        setForm={setForm}
        error={error}
        saving={saving}
        onClose={closeForm}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

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
  headerAddBtn: {
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  summaryBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  summaryBannerGradient: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  summaryBannerText: { flex: 1 },
  summaryAddChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
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

  listSectionCard: {
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
  listSectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  listSectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listSectionHeaderText: { flex: 1 },
  listSectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary },
  listSectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  defaultHeroWrap: { borderRadius: 20, overflow: "hidden", marginBottom: 14 },
  defaultHero: { padding: 18 },
  defaultHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  defaultHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  defaultHeroBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.3 },
  defaultHeroLabel: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  defaultHeroAddress: { fontSize: 14, color: "rgba(255,255,255,0.95)", lineHeight: 20 },
  defaultHeroMeta: { marginTop: 12, gap: 6 },
  defaultHeroMetaText: { fontSize: 12, color: "rgba(255,255,255,0.88)" },
  defaultHeroPhone: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  heroActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  heroActionBtnDanger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(220,38,38,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroActionText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  tipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  tipsTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary, marginBottom: 12 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18, paddingTop: 4 },

  addressCard: {
    backgroundColor: "#F8FCFD",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
  },
  addressCardDefault: { borderColor: theme.accent, backgroundColor: "rgba(51,175,193,0.06)" },
  addressCardSelected: { borderColor: "#059669", backgroundColor: "rgba(5,150,105,0.08)" },
  addressCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  addressIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  addressCardBody: { flex: 1, minWidth: 0 },
  addressTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  addressLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  addressLabel: { fontSize: 13, fontWeight: "700", color: theme.accent, textTransform: "uppercase", letterSpacing: 0.3 },
  addressTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, lineHeight: 20 },
  defaultBadge: {
    backgroundColor: "rgba(51,175,193,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "700", color: theme.accent, textTransform: "uppercase", letterSpacing: 0.3 },
  addressMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(51,175,193,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: { fontSize: 11, fontWeight: "600", color: theme.textSecondary },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  phoneText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  defaultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
    minHeight: 40,
  },
  defaultBtnText: { fontSize: 13, fontWeight: "600", color: theme.accent },
  defaultActivePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(5,150,105,0.08)",
  },
  defaultActiveText: { fontSize: 13, fontWeight: "600", color: "#059669" },
  selectCheckoutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.12)",
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.22)",
  },
  selectCheckoutBtnText: { fontSize: 13, fontWeight: "700", color: theme.accent },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(51,175,193,0.08)",
  },
  editBtnText: { fontSize: 13, fontWeight: "600", color: theme.accent },
  delBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(220,38,38,0.06)",
  },

  emptyWrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(51,175,193,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.textPrimary },
  emptyText: { fontSize: 14, color: theme.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20 },
  emptySteps: { width: "100%", marginTop: 24, gap: 10 },
  emptyStepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  emptyStepBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyStepBadgeText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  emptyStepText: { flex: 1 },
  emptyStepTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  emptyStepDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  emptyBtnWrap: { marginTop: 24, borderRadius: 14, overflow: "hidden", alignSelf: "stretch" },
  emptyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

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
  footerHint: { fontSize: 13, fontWeight: "700", color: theme.accent },
  footerBtnWrap: { borderRadius: 16, overflow: "hidden" },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 54,
  },
  footerBtnText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },

  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetPanel: {
    backgroundColor: theme.contentPanelBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 0 },
    }),
  },
  sheetHero: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  sheetHandleLight: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetHeroLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sheetHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sheetHeroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  sheetHeroSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 3 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  sheetHeroClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sheetScroll: { maxHeight: "100%" },
  sheetScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

  previewCard: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  previewGradient: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTextWrap: { flex: 1 },
  previewLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 },
  previewValue: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginTop: 4, lineHeight: 20 },
  previewPhoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  previewPhone: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  previewEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  previewEmptyTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, marginTop: 10 },
  previewEmptyText: { fontSize: 13, color: theme.textMuted, marginTop: 4, textAlign: "center", lineHeight: 18 },

  mapPlaceholderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  mapPlaceholderBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderText: { flex: 1 },
  mapPlaceholderTitle: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  mapPlaceholderHint: { fontSize: 12, color: theme.textMuted, marginTop: 3, lineHeight: 16 },
  mapSoonBadge: {
    backgroundColor: "rgba(51,175,193,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapSoonText: { fontSize: 10, fontWeight: "700", color: theme.accent, textTransform: "uppercase" },

  formSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  formSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  formSectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  formSectionHeaderText: { flex: 1 },
  formSectionTitle: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
  formSectionSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  formRow: { flexDirection: "row", gap: 10 },
  formCol: { flex: 1, minWidth: 0 },

  defaultToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FCFD",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
  },
  defaultToggleCardActive: { borderColor: theme.accent, backgroundColor: "rgba(51,175,193,0.06)" },
  defaultToggleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  defaultToggleText: { flex: 1 },
  defaultToggleLabel: { fontSize: 14, fontWeight: "700", color: theme.textPrimary },
  defaultToggleHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  formSecureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(51,175,193,0.08)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.12)",
  },
  formSecureText: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 17 },

  errBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  errText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "600" },

  sheetActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(214,234,242,0.95)",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: theme.textMuted },
  saveBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  saveBtnDisabled: { opacity: 0.95 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    minHeight: 50,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
