import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DeliveryPartnerLayout from "@/src/components/DeliveryPartnerLayout";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";

const POLL_INTERVAL_MS = 5000;

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DeliveryHelpScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = () => {
    api.deliverySupport.getThread().then((t) => setMessages(t.messages || [])).catch(() => setMessages([])).finally(() => setLoading(false));
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
      const interval = setInterval(load, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [])
  );

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.deliverySupport.sendMessage(trimmed);
      setText("");
      load();
    } catch (e) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <DeliveryPartnerLayout title="Help & support" subtitle="Chat with admin" icon="help-circle-outline">
        <KeyboardAvoidingView style={styles.chatWrap} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
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
              const isMe = m.from === "delivery_partner";
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
        <View style={styles.inputWrap}>
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
        </KeyboardAvoidingView>
      </DeliveryPartnerLayout>
  );
}

const styles = StyleSheet.create({
  chatWrap: { flex: 1, overflow: "hidden" },
  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, color: "#64748B", marginTop: 12, fontWeight: "500" },
  emptySubtext: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
  bubbleWrap: { marginBottom: 12 },
  bubbleWrapLeft: { alignItems: "flex-start" },
  bubbleWrapRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "82%", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 },
  bubbleMe: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleSender: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  bubbleSenderMe: { color: "rgba(255,255,255,0.9)" },
  bubbleSenderThem: { color: "#64748B" },
  bubbleBody: { fontSize: 15, lineHeight: 22 },
  bubbleTime: { fontSize: 11, marginTop: 6 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.8)" },
  bubbleTimeThem: { color: "#94A3B8" },
  inputWrap: { flexDirection: "row", alignItems: "flex-end", padding: 12, paddingBottom: 20, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0", gap: 10 },
  input: { flex: 1, backgroundColor: theme.screenBackground, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, paddingRight: 16, fontSize: 15, color: "#1E293B", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.6 },
});
