import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Platform, Keyboard } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SupplierScreenShell from "@/src/components/supplier/SupplierScreenShell";
import { EmptyState, SupplierPageHeader, ui } from "@/src/components/supplier/supplierUi";
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
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export default function SupplierSupportScreen() {
  const router = useRouter();
  const androidBottomInset = Platform.OS === "android" ? 18 : 0;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = () => {
    api.supplierSupport
      .getThread()
      .then((t) => setMessages(t.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
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

  const inputBar = (
    <View
      style={[
        styles.inputWrap,
        {
          marginBottom: Math.max(0, keyboardHeight - (Platform.OS === "android" ? androidBottomInset : 0)),
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
      <TouchableOpacity onPress={send} disabled={sending} activeOpacity={0.9}>
        <LinearGradient
          colors={sending ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SupplierScreenShell
      showMenu
      tallHeader
      headerExtra={
        <SupplierPageHeader
          icon="chatbubble-ellipses-outline"
          title="Support"
          subtitle="Chat with admin for quick help"
          stats={[
            { icon: "chatbubbles-outline", label: "Messages", value: String(messages.length) },
            {
              icon: "person-outline",
              label: "From you",
              value: String(messages.filter((m) => m.from === "supplier").length),
            },
            {
              icon: "shield-checkmark-outline",
              label: "From admin",
              value: String(messages.filter((m) => m.from !== "supplier").length),
            },
          ]}
        />
      }
      footer={inputBar}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[ui.scrollContent, { paddingBottom: INPUT_BAR_HEIGHT + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <EmptyState icon="chatbubbles-outline" title="Loading..." subtitle="Fetching your conversation" />
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            subtitle="Send a message to start the conversation with admin."
          />
        ) : (
          messages.map((m, i) => {
            const isMe = m.from === "supplier";
            return (
              <View key={i} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
                {isMe ? (
                  <LinearGradient
                    colors={[theme.medium, theme.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleMe]}
                  >
                    <Text style={styles.bubbleSenderMe}>You</Text>
                    <Text style={styles.bubbleBodyMe}>{m.text}</Text>
                    {m.createdAt ? (
                      <Text style={styles.bubbleTimeMe}>{formatMessageTime(m.createdAt)}</Text>
                    ) : null}
                  </LinearGradient>
                ) : (
                  <View style={[styles.bubble, styles.bubbleThem]}>
                    <Text style={styles.bubbleSenderThem}>Admin</Text>
                    <Text style={styles.bubbleBodyThem}>{m.text}</Text>
                    {m.createdAt ? (
                      <Text style={styles.bubbleTimeThem}>{formatMessageTime(m.createdAt)}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SupplierScreenShell>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { marginBottom: 12 },
  bubbleWrapLeft: { alignItems: "flex-start" },
  bubbleWrapRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "84%", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    ...Platform.select({
      ios: { shadowColor: "#0B3A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  bubbleSenderMe: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.9)" },
  bubbleSenderThem: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, color: theme.textMuted },
  bubbleBodyMe: { fontSize: 15, lineHeight: 22, color: "#FFFFFF" },
  bubbleBodyThem: { fontSize: 15, lineHeight: 22, color: theme.textPrimary },
  bubbleTimeMe: { fontSize: 11, marginTop: 6, color: "rgba(255,255,255,0.8)" },
  bubbleTimeThem: { fontSize: 11, marginTop: 6, color: theme.textMuted },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.contentPanelBackground,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.7 },
});
