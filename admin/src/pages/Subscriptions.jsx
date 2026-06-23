import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const TABS = [
  { id: "details", label: "Subscription details" },
  { id: "financials", label: "Subscription value" },
  { id: "statuses", label: "Subscription statuses" },
  { id: "history", label: "Subscription history" },
  { id: "delivery", label: "Delivery management" },
];

// Preferred time options: hour (1-12), minute (00, 15, 30, 45), AM/PM — no manual input
function getPreferredTimeOptions() {
  const options = [{ value: "", label: "— Select time —" }];
  for (const ampm of ["AM", "PM"]) {
    for (let h = 1; h <= 12; h++) {
      for (const m of ["00", "15", "30", "45"]) {
        const label = `${h}:${m} ${ampm}`;
        options.push({ value: label, label });
      }
    }
  }
  return options;
}
const PREFERRED_TIME_OPTIONS = getPreferredTimeOptions();

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState("details");
  const [subscriptions, setSubscriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState(null);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [pickupHubs, setPickupHubs] = useState([]);
  const [deliverySelectedIds, setDeliverySelectedIds] = useState(new Set());
  const [clubPartnerId, setClubPartnerId] = useState("");
  const [deliveryLocalityFilter, setDeliveryLocalityFilter] = useState("");
  const [deliveryPinCodeFilter, setDeliveryPinCodeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [channelFilter, setChannelFilter] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [subscriptionIdSearch, setSubscriptionIdSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const limit = 25;

  const loadSubscriptions = useCallback(async (opts = {}) => {
    const status = opts.status !== undefined ? opts.status : statusFilter;
    setLoading(true);
    try {
      const params = { page: opts.page ?? page, limit };
      if (status) params.status = status;
      if (channelFilter) params.channel = channelFilter;
      if (frequencyFilter) params.frequency = frequencyFilter;
      if (search.trim()) params.search = search.trim();
      if (subscriptionIdSearch.trim()) params.subscriptionId = subscriptionIdSearch.trim();
      if (activeTab === "delivery" && deliveryLocalityFilter.trim()) params.locality = deliveryLocalityFilter.trim();
      if (activeTab === "delivery" && deliveryPinCodeFilter.trim()) params.pinCode = deliveryPinCodeFilter.trim();
      const res = await api.subscriptions(params);
      setSubscriptions(res.subscriptions || []);
      setTotal(res.total || 0);
      if (opts.page != null) setPage(opts.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, channelFilter, frequencyFilter, search, subscriptionIdSearch, page, deliveryLocalityFilter, deliveryPinCodeFilter]);

  const loadFinancials = useCallback(async () => {
    try {
      const data = await api.subscriptionsFinancials();
      setFinancials(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDeliveryPartners = useCallback(async () => {
    try {
      const res = await api.deliveryPartners({});
      setDeliveryPartners(res.deliveryPartners || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadPickupHubs = useCallback(async () => {
    try {
      const list = await api.pickupHubs();
      setPickupHubs(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setPickupHubs([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "financials") {
      loadFinancials();
    } else if (activeTab === "delivery") {
      loadDeliveryPartners();
      loadPickupHubs();
      loadSubscriptions({ status: "", page: 1 });
    } else {
      loadSubscriptions();
    }
  }, [activeTab, statusFilter, channelFilter, frequencyFilter, search, subscriptionIdSearch, page]);

  const handleStatusToggle = async (sub) => {
    const next = sub.status === "active" ? "inactive" : "active";
    setUpdatingId(sub.id);
    try {
      await api.subscriptionStatus(sub.id, next);
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status: next } : s)));
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (sub) => {
    if (!confirm(`Remove subscription ${sub.subscriptionId}? This cannot be undone.`)) return;
    setUpdatingId(sub.id);
    try {
      await api.subscriptionDelete(sub.id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignDelivery = async (subId, payload) => {
    const { deliveryPartnerId, pickupHubId } = typeof payload === "object" ? payload : { deliveryPartnerId: payload, pickupHubId: undefined };
    setUpdatingId(subId);
    try {
      await api.subscriptionDelivery(subId, { deliveryPartnerId: deliveryPartnerId || null, pickupHubId: pickupHubId || null });
      const partner = deliveryPartners.find((dp) => dp.id === deliveryPartnerId);
      const hub = pickupHubs.find((h) => h.id === pickupHubId);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                deliveryPartnerId: deliveryPartnerId || null,
                deliveryPartnerName: partner ? (partner.name || partner.email) : "",
                pickupHubId: pickupHubId || null,
                pickupHubName: hub ? hub.name : "",
                pickupHubAddress: hub ? hub.address : "",
              }
            : s
        )
      );
    } catch (e) {
      alert(e.message || e.error || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateLocalityPinCode = async (sub, field, value) => {
    const payload = field === "locality" ? { locality: value.trim() || null } : { pinCode: value.trim() || null };
    setUpdatingId(sub.id);
    try {
      await api.subscriptionUpdate(sub.id, payload);
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, [field]: value.trim() || "" } : s)));
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateDeliveryTime = async (sub, preferredDeliveryTime) => {
    const value = preferredDeliveryTime && preferredDeliveryTime.trim() ? preferredDeliveryTime.trim() : null;
    setUpdatingId(sub.id);
    try {
      await api.subscriptionUpdate(sub.id, { preferredDeliveryTime: value });
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, preferredDeliveryTime: value || "" } : s)));
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleDeliverySelection = (id) => {
    setDeliverySelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssignBulk = async () => {
    const ids = Array.from(deliverySelectedIds);
    if (ids.length === 0) {
      alert("Select at least one subscription.");
      return;
    }
    if (!clubPartnerId) {
      alert("Select a delivery partner.");
      return;
    }
    setUpdatingId("bulk");
    try {
      await api.assignDeliveryBulk({ subscriptionIds: ids, deliveryPartnerId: clubPartnerId });
      const partner = deliveryPartners.find((dp) => dp.id === clubPartnerId);
      setSubscriptions((prev) =>
        prev.map((s) => (ids.includes(s.id) ? { ...s, deliveryPartnerId: clubPartnerId, deliveryPartnerName: partner ? (partner.name || partner.email) : "" } : s))
      );
      setDeliverySelectedIds(new Set());
      setClubPartnerId("");
    } catch (e) {
      alert(e.message || e.error || "Bulk assign failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const filters = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center" }}>
      {activeTab !== "financials" && (
        <>
          <select value={activeTab === "history" ? "" : statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="select">
            <option value="">All channels</option>
            <option value="customer">Customer</option>
            <option value="society">Society</option>
            <option value="supplier">Supplier</option>
          </select>
          <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} className="select">
            <option value="">All frequency</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="text" placeholder="Search by subscription ID" value={subscriptionIdSearch} onChange={(e) => setSubscriptionIdSearch(e.target.value)} className="input" />
          <input type="text" placeholder="Search customer (name, email, phone)" value={search} onChange={(e) => setSearch(e.target.value)} className="input" />
          <button className="btn btn-secondary btn-sm" onClick={() => loadSubscriptions({ page: 1 })}>Apply</button>
        </>
      )}
    </div>
  );

  return (
    <div className="admin-page">
      <PageHeader
        title="Subscription orders"
        subtitle="View active subscriptions, financials, status toggles, history and delivery assignment."
      />

      <div className="tab-group">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={"tab-btn" + (activeTab === t.id ? " active" : "")} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <>
          {filters}
          {loading ? (
            <LoadingState />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subscription ID</th>
                      <th>Customer ID</th>
                      <th>Customer</th>
                      <th>Channel</th>
                      <th>Type</th>
                      <th>Product (label)</th>
                      <th>Product ID</th>
                      <th>Total (₹)</th>
                      <th>Status</th>
                      <th>Preferred time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.subscriptionId || s.id}</td>
                        <td>{s.customerId || (s.userId ? String(s.userId).slice(-8) : "—")}</td>
                        <td>{s.customerName || s.customerEmail || "—"} {s.customerEmail && <span style={{ color: "#6B7C85", fontSize: 12 }}>{s.customerEmail}</span>}</td>
                        <td>{s.subscriptionChannel || "customer"}</td>
                        <td>{s.frequency}</td>
                        <td>{s.productLabel} ({s.productKey})</td>
                        <td>{s.productId || "—"}</td>
                        <td>₹{Number(s.totalPrice).toLocaleString()}</td>
                        <td>{s.status}</td>
                        <td>{s.preferredDeliveryTime || "—"}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" disabled={updatingId === s.id} onClick={() => handleDelete(s)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-bar">
                <span className="pagination-meta">Total: {total}</span>
                <div className="pagination-controls">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "financials" && (
        <div>
          {financials == null ? (
            <LoadingState />
          ) : (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-label">Active subscriptions</div>
                <div className="stat-card-value">{financials.activeCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Inactive (paused)</div>
                <div className="stat-card-value">{financials.inactiveCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Cancelled</div>
                <div className="stat-card-value">{financials.cancelledCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Active revenue (total)</div>
                <div className="stat-card-value">₹{Number(financials.totalActiveRevenue || 0).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">By frequency</div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "0.875rem" }}>
                  {(financials.byFrequency || []).map((f) => (
                    <li key={f.frequency}>{f.frequency}: {f.count} (₹{Number(f.revenue).toLocaleString()})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "statuses" && (
        <>
          {filters}
          {loading ? (
            <LoadingState />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subscription ID</th>
                    <th>Customer</th>
                    <th>Plan · Product</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.subscriptionId || s.id}</td>
                      <td>{s.customerName || s.customerEmail || "—"}</td>
                      <td>{s.planName} · {s.productLabel}</td>
                      <td>{s.status}</td>
                      <td>
                        {(s.status === "active" || s.status === "inactive") && (
                          <button
                            className={s.status === "active" ? "btn btn-danger btn-sm" : "btn btn-approve btn-sm"}
                            disabled={updatingId === s.id}
                            onClick={() => handleStatusToggle(s)}
                          >
                            {updatingId === s.id ? "…" : s.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {filters}
          {loading ? (
            <LoadingState />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subscription ID</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Product</th>
                      <th>Total (₹)</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.subscriptionId || s.id}</td>
                        <td>{s.customerName || s.customerEmail || "—"}</td>
                        <td>{s.frequency}</td>
                        <td>{s.productLabel}</td>
                        <td>₹{Number(s.totalPrice).toLocaleString()}</td>
                        <td>{s.status}</td>
                        <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-bar">
                <span className="pagination-meta">Total: {total}</span>
                <div className="pagination-controls">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "delivery" && (
        <>
          {filters}
          {/* Filter by locality and PIN code */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1B2B34", marginBottom: 8 }}>Filter by locality & PIN code</div>
            <p style={{ color: "#6B7C85", marginBottom: 12, fontSize: 13 }}>
              Filter subscriptions to prioritise delivery or assign multiple deliveries to a single agent by area.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Locality"
                value={deliveryLocalityFilter}
                onChange={(e) => setDeliveryLocalityFilter(e.target.value)}
                className="input input-wide"
              />
              <input
                type="text"
                placeholder="PIN code"
                value={deliveryPinCodeFilter}
                onChange={(e) => setDeliveryPinCodeFilter(e.target.value)}
                className="input input-wide"
              />
              <button className="btn btn-secondary btn-sm" onClick={() => loadSubscriptions({ page: 1 })}>Apply filter</button>
              {(deliveryLocalityFilter || deliveryPinCodeFilter) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setDeliveryLocalityFilter(""); setDeliveryPinCodeFilter(""); loadSubscriptions({ page: 1 }); }}>Clear</button>
              )}
            </div>
          </div>
          {/* Club (same locality): assign same partner to multiple subscriptions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1B2B34", marginBottom: 8 }}>Club orders (same locality)</div>
            <p style={{ color: "#6B7C85", marginBottom: 12, fontSize: 13 }}>
              Select subscriptions below, then choose a delivery partner to assign to all selected. Partner will be checked for 13-minute slot conflicts.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <select value={clubPartnerId} onChange={(e) => setClubPartnerId(e.target.value)} className="select">
                <option value="">— Select partner —</option>
                {deliveryPartners.filter((dp) => dp.onboardingStatus === "approved").map((dp) => (
                  <option key={dp.id} value={dp.id}>{dp.name || dp.email}</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleAssignBulk}
                disabled={updatingId === "bulk" || deliverySelectedIds.size === 0 || !clubPartnerId}
              >
                {updatingId === "bulk" ? "Assigning…" : `Assign to ${deliverySelectedIds.size} selected`}
              </button>
            </div>
          </div>
          {loading ? (
            <LoadingState />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Subscription ID</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Locality</th>
                    <th>PIN code</th>
                    <th>Preferred time (from user)</th>
                    <th>Pickup hub</th>
                    <th>Assigned partner</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.filter((s) => s.status === "active" || s.status === "inactive").map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={deliverySelectedIds.has(s.id)}
                          onChange={() => toggleDeliverySelection(s.id)}
                        />
                      </td>
                      <td>{s.subscriptionId || s.id}</td>
                      <td>{s.customerName || s.customerEmail || "—"}</td>
                      <td>{s.deliveryAddress || "—"}</td>
                      <td>
                        <input
                          type="text"
                          placeholder="Locality"
                          defaultValue={s.locality}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (s.locality || "")) handleUpdateLocalityPinCode(s, "locality", v);
                          }}
                          className="input"
                          style={{ width: 100, minWidth: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="PIN"
                          defaultValue={s.pinCode}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (s.pinCode || "")) handleUpdateLocalityPinCode(s, "pinCode", v);
                          }}
                          className="input"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: "#1B2B34" }} title="Set by customer when selecting plan">
                          {s.preferredDeliveryTime || (s.preferredTimeRangeStart && s.preferredTimeRangeEnd ? `${s.preferredTimeRangeStart} - ${s.preferredTimeRangeEnd}` : "—")}
                        </span>
                      </td>
                      <td>
                        <select
                          value={s.pickupHubId || ""}
                          onChange={(e) => handleAssignDelivery(s.id, { deliveryPartnerId: s.deliveryPartnerId || null, pickupHubId: e.target.value || null })}
                          disabled={updatingId === s.id}
                          className="select"
                        >
                          <option value="">— None —</option>
                          {pickupHubs.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                        {s.pickupHubAddress && <span style={{ display: "block", fontSize: 11, color: "#6B7C85", marginTop: 4 }}>{s.pickupHubAddress}</span>}
                      </td>
                      <td>
                        <select
                          value={s.deliveryPartnerId || ""}
                          onChange={(e) => handleAssignDelivery(s.id, { deliveryPartnerId: e.target.value || null, pickupHubId: s.pickupHubId || null })}
                          disabled={updatingId === s.id}
                          className="select"
                        >
                          <option value="">— None —</option>
                          {deliveryPartners.filter((dp) => dp.onboardingStatus === "approved").map((dp) => (
                            <option key={dp.id} value={dp.id}>{dp.name || dp.email}</option>
                          ))}
                        </select>
                        {s.deliveryPartnerName && <span style={{ marginLeft: 8, color: "#6B7C85" }}>{s.deliveryPartnerName}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
