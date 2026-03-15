import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";

export default function SupplierSupportScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    api.supplierSupport.getThread().then((t) => setMessages(t.messages || [])).catch(() => setMessages([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.supplierSupport.sendMessage(trimmed);
      setText("");
      load();
    } catch (e) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPanel}>
        <LinearGradient colors={["#1E40AF", "#3B82F6", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
          <View style={styles.headerRow}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Support</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
      </View>
      <KeyboardAvoidingView style={styles.contentPanel} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <ScrollView style={styles.messages} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {loading ? <Text style={styles.placeholder}>Loading...</Text> : messages.length === 0 ? (
            <Text style={styles.placeholder}>No messages yet. Send a message to admin.</Text>
          ) : (
            messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.from === "supplier" ? styles.bubbleRight : styles.bubbleLeft]}>
                <Text style={styles.bubbleFrom}>{m.from === "supplier" ? "You" : "Admin"}</Text>
                <Text style={styles.bubbleText}>{m.text}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message to admin..." placeholderTextColor="#9CA3AF" multiline />
          <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={send} disabled={sending}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  contentPanel: { flex: 1, marginTop: -20, marginLeft: 11, marginRight: 11, backgroundColor: "#c6e2fa", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20 },
  messages: { flex: 1 },
  placeholder: { textAlign: "center", color: "#6B7C85", marginTop: 24 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleLeft: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.9)" },
  bubbleRight: { alignSelf: "flex-end", backgroundColor: "#E0F2FE" },
  bubbleFrom: { fontSize: 12, color: "#6B7C85", marginBottom: 4 },
  bubbleText: { fontSize: 15, color: "#1B2B34" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, backgroundColor: "rgba(255,255,255,0.9)", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  input: { flex: 1, backgroundColor: "#f0f7fc", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: 8, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#1EA7FD", borderRadius: 20, justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { color: "#FFF", fontWeight: "600" },
});
