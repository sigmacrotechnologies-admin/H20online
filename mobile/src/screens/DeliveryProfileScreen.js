import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { theme } from "@/src/theme";

const VEHICLE_OPTIONS = [
  { value: "bicycle", label: "Bicycle" },
  { value: "bike", label: "Bike" },
  { value: "cycle", label: "Cycle" },
  { value: "minivan", label: "Minivan" },
  { value: "truck", label: "Truck" },
  { value: "camper", label: "Camper" },
];

let ImagePicker;
try {
  ImagePicker = require("expo-image-picker");
} catch (_) {}

export default function DeliveryProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.deliveryPartners
      .me()
      .then((data) => {
        setProfile(data);
        setName(data?.name ?? user?.name ?? "");
        setPhone(data?.phone ?? user?.phone ?? "");
        setVehicleType(data?.vehicleType ?? "bike");
        setProfileImageUrl(data?.profileImageUrl ?? "");
      })
      .catch(() => {
        setProfile(null);
        setName(user?.name ?? "");
        setPhone(user?.phone ?? "");
        setVehicleType("bike");
        setProfileImageUrl("");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = () => {
    setError("");
    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    if (!nameTrim) {
      setError("Please enter your name");
      return;
    }
    if (!phoneTrim || phoneTrim.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setSaving(true);
    api.deliveryPartners
      .updateProfile({ name: nameTrim, phone: phoneTrim, vehicleType: vehicleType || undefined, profileImageUrl: profileImageUrl || undefined })
      .then(() => { Alert.alert("Saved", "Profile updated."); setProfile((p) => (p ? { ...p, name: nameTrim, phone: phoneTrim, vehicleType: vehicleType || p.vehicleType, profileImageUrl } : null)); })
      .catch((err) => setError(err.message || "Update failed"))
      .finally(() => setSaving(false));
  };

  const pickImage = async () => {
    if (!ImagePicker) {
      Alert.alert("Not available", "Image picker is not available.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to upload a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfileImageUrl(result.assets[0].uri);
        api.deliveryPartners.updateProfile({ profileImageUrl: result.assets[0].uri }).catch(() => {});
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to pick image");
    }
  };

  const partnerName = profile?.name || user?.name || "";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DeliveryPartnerLayout title="Profile update" subtitle={partnerName} icon="person-outline">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </DeliveryPartnerLayout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryPartnerLayout title="Profile update" subtitle={partnerName} icon="person-outline">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.contentWrap} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.8}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="rgba(255,255,255,0.8)" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadTextBtn} onPress={pickImage}>
            <Text style={styles.uploadText}>{profileImageUrl ? "Change photo" : "Upload photo"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Vehicle type</Text>
          <View style={styles.vehicleRow}>
            {VEHICLE_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={[styles.vehicleChip, vehicleType === v.value && styles.vehicleChipSelected]}
                onPress={() => setVehicleType(v.value)}
              >
                <Text style={[styles.vehicleChipText, vehicleType === v.value && styles.vehicleChipTextSelected]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {profile?.email ? (
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.readOnly}>{profile.email}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!profile && <Text style={styles.hint}>Profile is synced from your account. Contact support for email changes.</Text>}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !profile) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !profile}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
        </ScrollView>
      </DeliveryPartnerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  contentWrap: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarWrap: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
  uploadTextBtn: { marginTop: 10 },
  uploadText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: { backgroundColor: "#f0f7fc", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#1B2B34" },
  readOnly: { backgroundColor: "#f0f7fc", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#6B7C85" },
  vehicleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vehicleChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#E0F2FE" },
  vehicleChipSelected: { backgroundColor: theme.primary },
  vehicleChipText: { fontSize: 13, color: "#1B2B34", fontWeight: "600" },
  vehicleChipTextSelected: { color: "#FFF" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 12 },
  saveBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
