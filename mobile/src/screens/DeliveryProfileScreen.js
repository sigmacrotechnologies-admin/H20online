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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import BackButton from "@/src/components/BackButton";

export default function DeliveryProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.deliveryPartners
      .me()
      .then((data) => {
        setProfile(data);
        setName(data?.name ?? user?.name ?? "");
        setPhone(data?.phone ?? user?.phone ?? "");
      })
      .catch(() => {
        setProfile(null);
        setName(user?.name ?? "");
        setPhone(user?.phone ?? "");
      })
      .finally(() => setLoading(false));
  }, [user]);

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
      .updateProfile({ name: nameTrim, phone: phoneTrim })
      .then(() => Alert.alert("Saved", "Profile updated."))
      .catch((err) => setError(err.message || "Update failed"))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1EA7FD" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Profile update</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.field}>
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
        {profile?.email ? (
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.readOnly}>{profile.email}</Text>
          </View>
        ) : null}
        {profile?.vehicleType ? (
          <View style={styles.field}>
            <Text style={styles.label}>Vehicle type</Text>
            <Text style={styles.readOnly}>{profile.vehicleType}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!profile && <Text style={styles.hint}>Profile is synced from your account. Contact support to update email or vehicle.</Text>}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !profile) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !profile}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B34" },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, padding: 16, fontSize: 16, color: "#1B2B34" },
  readOnly: { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 14, padding: 16, fontSize: 16, color: "#6B7C85" },
  errorText: { fontSize: 14, color: "#DC2626", marginBottom: 12 },
  hint: { fontSize: 13, color: "#6B7C85", marginBottom: 12 },
  saveBtn: { backgroundColor: "#1EA7FD", paddingVertical: 16, borderRadius: 30, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
