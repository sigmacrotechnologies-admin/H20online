import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";

const SUGGESTIONS = [
  "How much water should I drink today?",
  "Why is my weekend intake lower?",
  "How do I order a water jar?",
  "Explain my subscription plan",
];

export default function WaterAiAskModal({ visible, onClose, onAsk }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (q) => {
    const trimmed = (q || question).trim();
    if (!trimmed || loading) return;
    setQuestion(trimmed);
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const text = await onAsk(trimmed);
      setAnswer(text || "");
    } catch (e) {
      setError(e.message || "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!visible) {
      setQuestion("");
      setAnswer("");
      setError("");
      setLoading(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient colors={[theme.medium, theme.accent]} style={styles.headerIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.title}>Ask H2O AI</Text>
                <Text style={styles.subtitle}>Hydration, orders, wallet & app help</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.suggestLabel}>Try asking</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.chip} onPress={() => submit(s)} activeOpacity={0.85}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {answer ? (
              <View style={styles.answerCard}>
                <Text style={styles.answerLabel}>AI answer</Text>
                <Text style={styles.answerText}>{answer}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask anything about water or the app..."
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity onPress={() => submit()} disabled={loading || !question.trim()} activeOpacity={0.9}>
              <LinearGradient
                colors={loading || !question.trim() ? ["#EEF3F7", "#E8EEF2"] : [theme.medium, theme.accent]}
                style={styles.sendBtn}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214,234,242,0.95)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", color: theme.textPrimary },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { maxHeight: 360 },
  scrollContent: { padding: 20 },
  suggestLabel: { fontSize: 12, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: "rgba(51,175,193,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(51,175,193,0.2)",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: theme.link },
  center: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  loadingText: { fontSize: 13, color: theme.textMuted },
  errorText: { fontSize: 13, color: "#DC2626", marginBottom: 12 },
  answerCard: {
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
  },
  answerLabel: { fontSize: 11, fontWeight: "700", color: theme.textMuted, textTransform: "uppercase", marginBottom: 6 },
  answerText: { fontSize: 14, color: theme.textPrimary, lineHeight: 21 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(214,234,242,0.95)",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: theme.contentPanelBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(214,234,242,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
