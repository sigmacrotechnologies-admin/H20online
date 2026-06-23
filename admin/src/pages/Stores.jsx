import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34", verticalAlign: "top" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", minWidth: 200 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", background: "#1EA7FD", color: "#fff" };
const btnSmall = { ...btn, padding: "6px 12px", fontSize: 13 };
const btnApprove = { ...btnSmall, background: "#059669" };
const btnReject = { ...btnSmall, background: "#DC2626" };
const btnGhost = { ...btnSmall, background: "#E0F2FE", color: "#1B2B34" };
const tabRow = { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" };
const tabBtn = (active) => ({
  padding: "8px 16px",
  borderRadius: 8,
  border: active ? "2px solid #1EA7FD" : "1px solid #E5E7EB",
  background: active ? "#E0F2FE" : "#fff",
  fontWeight: 600,
  cursor: "pointer",
  color: "#1B2B34",
});
const badge = (status) => {
  const colors = {
    pending: { bg: "#FEF3C7", color: "#D97706" },
    approved: { bg: "#D1FAE5", color: "#059669" },
    rejected: { bg: "#FEE2E2", color: "#DC2626" },
  };
  const c = colors[status] || colors.pending;
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    background: c.bg,
    color: c.color,
  };
};
const locatorGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 };
const locatorCard = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

function mapsLink(lat, lng) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function Stores() {
  const [tab, setTab] = useState("pending");
  const [stores, setStores] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search.trim() };
      if (tab === "pending") params.status = "pending";
      else if (tab === "approved" || tab === "locator") params.status = "approved";
      else if (tab === "rejected") params.status = "rejected";
      const res = await api.stores(params);
      setStores(res.stores || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    const t = setTimeout(() => loadStores(), 300);
    return () => clearTimeout(t);
  }, [search, loadStores]);

  const approve = async (id) => {
    setActingId(id);
    try {
      await api.approveStore(id);
      await loadStores();
    } catch (e) {
      alert(e.message);
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return;
    setActingId(id);
    try {
      await api.rejectStore(id, reason);
      await loadStores();
    } catch (e) {
      alert(e.message);
    } finally {
      setActingId(null);
    }
  };

  const locatorStores = tab === "locator" ? stores : [];

  return (
    <div className="admin-page">
      <PageHeader
        title="Store management"
        subtitle="Approve supplier store and warehouse requests, view locations, and link fulfilment to products"
      />

      <div style={tabRow}>
        <button type="button" style={tabBtn(tab === "pending")} onClick={() => setTab("pending")}>
          Pending requests
        </button>
        <button type="button" style={tabBtn(tab === "all")} onClick={() => setTab("all")}>
          All stores
        </button>
        <button type="button" style={tabBtn(tab === "approved")} onClick={() => setTab("approved")}>
          Approved
        </button>
        <button type="button" style={tabBtn(tab === "locator")} onClick={() => setTab("locator")}>
          Store locator
        </button>
      </div>

      <div style={card}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            type="search"
            placeholder="Search store, city, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={input}
          />
          <span style={{ color: "#6B7280", fontSize: 14 }}>{total} store{total === 1 ? "" : "s"}</span>
        </div>
        {tab === "locator" ? (
          <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 16px" }}>
            Approved store and warehouse locations on the map. Suppliers link these to products for customer distance and tracking.
          </p>
        ) : null}
      </div>

      {loading ? (
        <LoadingState label="Loading stores..." />
      ) : tab === "locator" ? (
        locatorStores.length === 0 ? (
          <div style={card}>No approved stores found.</div>
        ) : (
          <div style={locatorGrid}>
            {locatorStores.map((s) => (
              <div key={s.id} style={locatorCard}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1B2B34" }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  {s.storeType === "warehouse" ? "Warehouse" : "Store"}
                  {s.supplier?.name ? ` · ${s.supplier.name}` : ""}
                </div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 1.5 }}>
                  {[s.address, s.locality, s.city].filter(Boolean).join(", ") || "No address text"}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                  {s.latitude?.toFixed(5)}, {s.longitude?.toFixed(5)}
                </div>
                {mapsLink(s.latitude, s.longitude) ? (
                  <a
                    href={mapsLink(s.latitude, s.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 12, color: "#1EA7FD", fontWeight: 600, fontSize: 14 }}
                  >
                    Open in Google Maps →
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : stores.length === 0 ? (
        <div style={card}>No stores match your filters.</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Store</th>
                <th style={th}>Supplier</th>
                <th style={th}>Location</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {s.storeType === "warehouse" ? "Warehouse" : "Store"}
                    </div>
                  </td>
                  <td style={td}>
                    <div>{s.supplier?.name || "—"}</div>
                    {s.supplier?.phone ? <div style={{ fontSize: 12, color: "#6B7280" }}>{s.supplier.phone}</div> : null}
                  </td>
                  <td style={td}>
                    <div style={{ fontSize: 13 }}>{[s.address, s.locality, s.city].filter(Boolean).join(", ") || "—"}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                      {s.latitude != null && s.longitude != null ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : "—"}
                    </div>
                    {mapsLink(s.latitude, s.longitude) ? (
                      <a href={mapsLink(s.latitude, s.longitude)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1EA7FD" }}>
                        Map
                      </a>
                    ) : null}
                  </td>
                  <td style={td}>
                    <span style={badge(s.status)}>{s.status}</span>
                    {s.rejectionReason ? (
                      <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{s.rejectionReason}</div>
                    ) : null}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {s.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            style={btnApprove}
                            disabled={actingId === s.id}
                            onClick={() => approve(s.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            style={btnReject}
                            disabled={actingId === s.id}
                            onClick={() => reject(s.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : s.status === "approved" ? (
                        <button type="button" style={btnReject} disabled={actingId === s.id} onClick={() => reject(s.id)}>
                          Revoke
                        </button>
                      ) : null}
                      {mapsLink(s.latitude, s.longitude) ? (
                        <a href={mapsLink(s.latitude, s.longitude)} target="_blank" rel="noopener noreferrer" style={btnGhost}>
                          Locator
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
