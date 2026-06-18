import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

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
    <div className="admin-page">
      <PageHeader title="Delivery partner support" subtitle="Messages from delivery partners. Reply and they see it in the app." />
      <div className="support-grid">
        <div className="card">
          <h3 className="card-title">Threads</h3>
          <div className="thread-list">
            {loading ? (
              <LoadingState label="Loading threads..." />
            ) : threads.length === 0 ? (
              <div className="empty-state">No threads yet</div>
            ) : (
              threads.map((t) => (
                <div
                  key={t.id}
                  className={`thread-item${selected?.deliveryPartnerId === t.deliveryPartnerId ? " active" : ""}`}
                  onClick={() => setSelected(t)}
                >
                  <div className="thread-item-title">{t.deliveryPartnerName || t.deliveryPartnerEmail}</div>
                  <div className="thread-item-meta">
                    {t.lastMessage ? t.lastMessage.slice(0, 50) + (t.lastMessage.length > 50 ? "…" : "") : "No messages"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          {!selected ? (
            <div className="empty-state">Select a thread</div>
          ) : (
            <>
              <h3 className="card-title">{selected.deliveryPartnerName}</h3>
              <p className="card-subtitle">{selected.deliveryPartnerEmail}</p>
              <div className="message-thread">
                {messages.map((m, i) => (
                  <div key={i} className={`message-bubble ${m.from === "admin" ? "admin" : "user"}`}>
                    <div className="message-from">{m.from === "admin" ? "You" : "Delivery partner"}</div>
                    <div className="message-text">{m.text}</div>
                    {m.createdAt && <div className="message-time">{new Date(m.createdAt).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
              <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to delivery partner..." />
              <button className="btn btn-primary" onClick={sendReply} disabled={sending}>
                {sending ? "Sending..." : "Send reply"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
