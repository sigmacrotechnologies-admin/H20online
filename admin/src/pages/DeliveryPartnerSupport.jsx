import { useState, useEffect } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 16 };
const input = { padding: "10px 14px", borderRadius: 8, border: "1px solid #E5E7EB", width: "100%", marginBottom: 12 };
const btn = { padding: "10px 20px", borderRadius: 8, border: "none", background: "#1EA7FD", color: "#fff", fontWeight: 600, cursor: "pointer" };

export default function DeliveryPartnerSupport() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadThreads = () => api.deliverySupport().then(setThreads).catch(() => setThreads([])).finally(() => setLoading(false));
    loadThreads();
    const interval = setInterval(loadThreads, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected?.deliveryPartnerId) return;
    const loadMessages = () => api.deliverySupportThread(selected.deliveryPartnerId).then((t) => setMessages(t.messages || [])).catch(() => setMessages([]));
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selected?.deliveryPartnerId]);

  const sendReply = async () => {
    if (!selected?.deliveryPartnerId || !reply.trim() || sending) return;
    setSending(true);
    try {
      await api.deliverySupportReply(selected.deliveryPartnerId, reply.trim());
      setReply("");
      const t = await api.deliverySupportThread(selected.deliveryPartnerId);
      setMessages(t.messages || []);
      api.deliverySupport().then(setThreads);
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Delivery partner support</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>Messages from delivery partners (Help in app). Reply and they see it in the app.</p>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Threads</h3>
          {loading ? <p>Loading...</p> : threads.length === 0 ? <p>No threads yet</p> : (
            threads.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  marginBottom: 8,
                  background: selected?.deliveryPartnerId === t.deliveryPartnerId ? "#E0F2FE" : "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(t)}
              >
                <div style={{ fontWeight: 600 }}>{t.deliveryPartnerName || t.deliveryPartnerEmail}</div>
                <div style={{ fontSize: 13, color: "#6B7C85", marginTop: 4 }}>{t.lastMessage ? (t.lastMessage.slice(0, 40) + (t.lastMessage.length > 40 ? "…" : "")) : "No messages"}</div>
              </div>
            ))
          )}
        </div>
        <div style={card}>
          {!selected ? (
            <p style={{ color: "#6B7C85" }}>Select a thread</p>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{selected.deliveryPartnerName} ({selected.deliveryPartnerEmail})</h3>
              <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: m.from === "admin" ? "#E0F2FE" : "rgba(255,255,255,0.9)" }}>
                    <div style={{ fontSize: 12, color: "#6B7C85", marginBottom: 4 }}>{m.from === "admin" ? "You" : "Delivery partner"}</div>
                    <div>{m.text}</div>
                    {m.createdAt && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{new Date(m.createdAt).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
              <textarea style={{ ...input, minHeight: 80 }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to delivery partner..." />
              <button style={btn} onClick={sendReply} disabled={sending}>{sending ? "Sending..." : "Send reply"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
