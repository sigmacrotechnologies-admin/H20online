import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Platform, Image, StatusBar, Keyboard } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@/src/components/BackButton";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const POLL_INTERVAL_MS = 5000;
const INPUT_BAR_HEIGHT = 72;

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SupplierSupportScreen() {
  const router = useRouter();
  const androidTopInset = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const androidBottomInset = Platform.OS === "android" ? 18 : 0;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = () => {
    api.supplierSupport.getThread().then((t) => setMessages(t.messages || [])).catch(() => setMessages([])).finally(() => setLoading(false));
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
      const interval = setInterval(load, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height || 0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

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
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientBackground, { paddingTop: 20 + androidTopInset }]}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={() => router.back()} />
            <Image source={require("../../assets/images/h20-logo-light-full.png")} style={styles.headerLogoLight} resizeMode="contain" />
            <View style={styles.headerTopSpacer} />
          </View>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Support</Text>
              <Text style={styles.headerSubtitle}>Chat with admin for quick help</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.chatWrap}>
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={[styles.messageListContent, { paddingBottom: INPUT_BAR_HEIGHT + 28 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
            </View>
          ) : (
            messages.map((m, i) => {
              const isMe = m.from === "supplier";
              return (
                <View key={i} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleSender, isMe ? styles.bubbleSenderMe : styles.bubbleSenderThem]}>{isMe ? "You" : "Admin"}</Text>
                    <Text style={[styles.bubbleBody, isMe && { color: "#FFF" }]}>{m.text}</Text>
                    {m.createdAt ? <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{formatMessageTime(m.createdAt)}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        <View
          style={[
            styles.inputWrap,
            {
              bottom: Math.max(0, keyboardHeight - (Platform.OS === "android" ? androidBottomInset : 0)),
              paddingBottom: 12 + androidBottomInset,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={send} disabled={sending}>
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.screenBackground, paddingHorizontal: 0 },
  headerPanel: { minHeight: 236, overflow: "hidden" },
  gradientBackground: { flex: 1, paddingBottom: 28, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerLogoLight: { width: 124, height: 34, marginLeft: 0 },
  headerTopSpacer: { width: 40, height: 40 },
  headerInfoRow: { flexDirection: "row", alignItems: "center" },
  headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.95)", marginTop: 2, maxWidth: "95%" },
  chatWrap: { flex: 1, marginTop: -16, backgroundColor: theme.screenBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, color: "#64748B", marginTop: 12, fontWeight: "500" },
  emptySubtext: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
  bubbleWrap: { marginBottom: 12 },
  bubbleWrapLeft: { alignItems: "flex-start" },
  bubbleWrapRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "84%", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.85)" },
  bubbleMe: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "rgba(255,255,255,0.78)", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  bubbleSender: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  bubbleSenderMe: { color: "rgba(255,255,255,0.9)" },
  bubbleSenderThem: { color: "#64748B" },
  bubbleBody: { fontSize: 15, lineHeight: 22 },
  bubbleTime: { fontSize: 11, marginTop: 6 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.8)" },
  bubbleTimeThem: { color: "#94A3B8" },
  inputWrap: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.82)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.9)", gap: 10 },
  input: { flex: 1, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, paddingRight: 16, fontSize: 15, color: "#1E293B", maxHeight: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.6 },
});
