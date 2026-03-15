import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

export default function SupplierProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.supplier.products().then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleRemove = (p) => {
    Alert.alert("Remove product", "Remove \"" + (p.productName || p.name) + "\"?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => api.products.delete(p.id).then(load).catch((e) => alert(e.message)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>My products</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        {loading ? <ActivityIndicator size="large" color="#1EA7FD" style={{ marginTop: 24 }} /> : (
          products.length === 0 ? <Text style={styles.empty}>No products. Add from dashboard.</Text> : (
            products.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.cardName}>{p.productName || p.name}</Text>
                <Text style={styles.cardPrice}>₹{Number(p.price || 0).toLocaleString()} • {p.priceUnit || ""}</Text>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(p)}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#c6e2fa", paddingHorizontal: 20 },
  headerPanel: { marginTop: -10, marginLeft: -20, marginRight: -20, height: 140, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  content: { flex: 1 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  empty: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  card: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1B2B34" },
  cardPrice: { fontSize: 14, color: "#0EA5E9", marginTop: 4 },
  removeBtn: { marginTop: 10, alignSelf: "flex-start" },
  removeBtnText: { fontSize: 14, color: "#DC2626", fontWeight: "600" },
});
