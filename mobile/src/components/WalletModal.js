import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "@/src/context/WalletContext";
import { theme } from "@/src/theme";

export default function WalletModal({ visible, onClose }) {
  const { balance, addAmount, deductAmount } = useWallet();
  const [addValue, setAddValue] = useState("");
  const [deductValue, setDeductValue] = useState("");

  const handleAdd = () => {
    addAmount(addValue);
    setAddValue("");
  };

  const handleDeduct = () => {
    deductAmount(deductValue);
    setDeductValue("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Wallet</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#1B2B34" /></TouchableOpacity>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceValue}>₹{balance}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add amount</Text>
            <View style={styles.inputRow}>
              <Text style={styles.rupeePrefix}>₹</Text>
              <TextInput
                style={styles.input}
                value={addValue}
                onChangeText={setAddValue}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Withdraw / Remove amount</Text>
            <View style={styles.inputRow}>
              <Text style={styles.rupeePrefix}>₹</Text>
              <TextInput
                style={styles.input}
                value={deductValue}
                onChangeText={setDeductValue}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.outlineBtn} onPress={handleDeduct} activeOpacity={0.8}>
                <Text style={styles.outlineBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.screenBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "700", color: "#1B2B34" },
  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  balanceLabel: { fontSize: 14, color: "#6B7C85", marginBottom: 4 },
  balanceValue: { fontSize: 28, fontWeight: "800", color: theme.primary },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#1B2B34", marginBottom: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  rupeePrefix: { fontSize: 16, fontWeight: "600", color: "#1B2B34", marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#1B2B34" },
  primaryBtn: { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginLeft: 8 },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  outlineBtn: { borderWidth: 2, borderColor: theme.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginLeft: 8 },
  outlineBtnText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  doneBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  doneBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
