import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

const STATUS_OPTIONS = [
  { value: "open", label: "Open", className: "badge-open" },
  { value: "in_progress", label: "In progress", className: "badge-progress" },
  { value: "resolved", label: "Resolved", className: "badge-success" },
  { value: "closed", label: "Closed", className: "badge-muted" },
];

const CATEGORY_LABELS = {
  order: "Order issue",
  delivery: "Delivery",
  payment: "Payment",
  account: "Account",
  product: "Product",
  other: "Other",
};

function statusClass(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.className || "badge-muted";
}

export default function CustomerSupport() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = () => api.customerSupport().then(setTickets).catch(() => setTickets([])).finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setDetail(null);
      return;
    }
    const loadDetail = () => api.customerSupportTicket(selected.id).then(setDetail).catch(() => setDetail(null));
    loadDetail();
    const interval = setInterval(loadDetail, 5000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  const sendReply = async () => {
    if (!selected?.id || !reply.trim() || sending) return;
    setSending(true);
    try {
      await api.customerSupportReply(selected.id, reply.trim());
      setReply("");
      const d = await api.customerSupportTicket(selected.id);
      setDetail(d);
      api.customerSupport().then(setTickets);
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status) => {
    if (!selected?.id) return;
    try {
      await api.customerSupportStatus(selected.id, status);
      const d = await api.customerSupportTicket(selected.id);
      setDetail(d);
      setSelected((s) => (s ? { ...s, status } : s));
      api.customerSupport().then(setTickets);
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="admin-page">
      <PageHeader title="Customer support" subtitle="Complaints and tickets from customers. Reply here and they see it in the app." />
      <div className="support-grid">
        <div className="card">
          <h3 className="card-title">Tickets</h3>
          <select className="select" style={{ width: "100%", marginBottom: 16 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="thread-list">
            {loading ? (
              <LoadingState label="Loading tickets..." />
            ) : filtered.length === 0 ? (
              <div className="empty-state">No tickets yet</div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  className={`thread-item${selected?.id === t.id ? " active" : ""}`}
                  style={{ borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: "var(--teal-accent)" }}
                  onClick={() => setSelected(t)}
                >
                  <div className="thread-item-id">{t.ticketId}</div>
                  <div className="thread-item-title">{t.subject}</div>
                  <div className="thread-item-meta">
                    {t.customerName || t.customerEmail} · {CATEGORY_LABELS[t.category] || t.category}
                  </div>
                  <div className={`thread-item-status badge ${statusClass(t.status)}`}>
                    {STATUS_OPTIONS.find((s) => s.value === t.status)?.label || t.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          {!selected || !detail ? (
            <div className="empty-state">Select a ticket to view the conversation</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 className="card-title">{detail.subject}</h3>
                  <p className="card-subtitle">{detail.ticketId} · {CATEGORY_LABELS[detail.category] || detail.category}</p>
                  {detail.customer && (
                    <p style={{ fontSize: "0.875rem", margin: 0 }}>
                      <strong>{detail.customer.name}</strong>
                      {detail.customer.email ? ` · ${detail.customer.email}` : ""}
                      {detail.customer.phone ? ` · ${detail.customer.phone}` : ""}
                    </p>
                  )}
                </div>
                <select className="select" value={detail.status} onChange={(e) => updateStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="message-thread">
                {(detail.messages || []).map((m, i) => (
                  <div key={i} className={`message-bubble ${m.from === "admin" ? "admin" : "user"}`}>
                    <div className="message-from">{m.from === "admin" ? "You (admin)" : "Customer"}</div>
                    <div className="message-text">{m.text}</div>
                    {m.createdAt && <div className="message-time">{new Date(m.createdAt).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
              {detail.status !== "closed" ? (
                <>
                  <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to customer..." />
                  <button className="btn btn-primary" onClick={sendReply} disabled={sending}>
                    {sending ? "Sending..." : "Send reply"}
                  </button>
                </>
              ) : (
                <p className="muted-note">Ticket is closed.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
