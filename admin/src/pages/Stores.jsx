import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

function storeStatusBadge(status) {
  if (status === "approved") return "badge badge-success";
  if (status === "rejected") return "badge badge-danger";
  return "badge badge-open";
}

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

      <div className="tab-group">
        <button type="button" className={"tab-btn" + (tab === "pending" ? " active" : "")} onClick={() => setTab("pending")}>
          Pending requests
        </button>
        <button type="button" className={"tab-btn" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>
          All stores
        </button>
        <button type="button" className={"tab-btn" + (tab === "approved" ? " active" : "")} onClick={() => setTab("approved")}>
          Approved
        </button>
        <button type="button" className={"tab-btn" + (tab === "locator" ? " active" : "")} onClick={() => setTab("locator")}>
          Store locator
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            type="search"
            placeholder="Search store, city, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
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
          <div className="card">No approved stores found.</div>
        ) : (
          <div className="locator-grid">
            {locatorStores.map((s) => (
              <div key={s.id} className="locator-card">
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
        <div className="card">No stores match your filters.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Supplier</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      {s.storeType === "warehouse" ? "Warehouse" : "Store"}
                    </div>
                  </td>
                  <td>
                    <div>{s.supplier?.name || "—"}</div>
                    {s.supplier?.phone ? <div style={{ fontSize: 12, color: "#6B7280" }}>{s.supplier.phone}</div> : null}
                  </td>
                  <td>
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
                  <td>
                    <span className={storeStatusBadge(s.status)}>{s.status}</span>
                    {s.rejectionReason ? (
                      <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{s.rejectionReason}</div>
                    ) : null}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {s.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-approve btn-sm"
                            disabled={actingId === s.id}
                            onClick={() => approve(s.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-reject btn-sm"
                            disabled={actingId === s.id}
                            onClick={() => reject(s.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : s.status === "approved" ? (
                        <button type="button" className="btn btn-reject btn-sm" disabled={actingId === s.id} onClick={() => reject(s.id)}>
                          Revoke
                        </button>
                      ) : null}
                      {mapsLink(s.latitude, s.longitude) ? (
                        <a href={mapsLink(s.latitude, s.longitude)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
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
