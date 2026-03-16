import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", minWidth: 140 };
const select = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" };
const btnPrimary = { ...btn, background: "#1EA7FD", color: "#fff" };
const btnSmall = { ...btn, background: "#E0F2FE", color: "#1B2B34", padding: "6px 12px", fontSize: 13 };
const btnDanger = { ...btn, background: "#FEE2E2", color: "#B91C1C", padding: "6px 12px", fontSize: 13 };
const tabRow = { display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #E5E7EB", flexWrap: "wrap" };
const tab = (active) => ({ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontWeight: 600, color: active ? "#1EA7FD" : "#6B7C85", borderBottom: active ? "2px solid #1EA7FD" : "2px solid transparent", marginBottom: -1 });

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
  }, [activeTab, statusFilter, frequencyFilter, search, subscriptionIdSearch, page, deliveryLocalityFilter, deliveryPinCodeFilter]);

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
  }, [activeTab, statusFilter, frequencyFilter, search, subscriptionIdSearch, page]);

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
          <select value={activeTab === "history" ? "" : statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={select}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} style={select}>
            <option value="">All frequency</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="text" placeholder="Search by subscription ID" value={subscriptionIdSearch} onChange={(e) => setSubscriptionIdSearch(e.target.value)} style={input} />
          <input type="text" placeholder="Search customer (name, email, phone)" value={search} onChange={(e) => setSearch(e.target.value)} style={input} />
          <button style={btnSmall} onClick={() => loadSubscriptions({ page: 1 })}>Apply</button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Subscription orders</h1>
      <p style={{ color: "#6B7C85", marginBottom: 16 }}>View active subscriptions, financials, status toggles, history and delivery assignment.</p>

      <div style={tabRow}>
        {TABS.map((t) => (
          <button key={t.id} type="button" style={tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <>
          {filters}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Subscription ID</th>
                      <th style={th}>Customer ID</th>
                      <th style={th}>Customer</th>
                      <th style={th}>Type</th>
                      <th style={th}>Product (label)</th>
                      <th style={th}>Product ID</th>
                      <th style={th}>Total (₹)</th>
                      <th style={th}>Status</th>
                      <th style={th}>Preferred time</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td style={td}>{s.subscriptionId || s.id}</td>
                        <td style={td}>{s.customerId || (s.userId ? String(s.userId).slice(-8) : "—")}</td>
                        <td style={td}>{s.customerName || s.customerEmail || "—"} {s.customerEmail && <span style={{ color: "#6B7C85", fontSize: 12 }}>{s.customerEmail}</span>}</td>
                        <td style={td}>{s.frequency}</td>
                        <td style={td}>{s.productLabel} ({s.productKey})</td>
                        <td style={td}>{s.productId || "—"}</td>
                        <td style={td}>₹{Number(s.totalPrice).toLocaleString()}</td>
                        <td style={td}>{s.status}</td>
                        <td style={td}>{s.preferredDeliveryTime || "—"}</td>
                        <td style={td}>
                          <button style={btnDanger} disabled={updatingId === s.id} onClick={() => handleDelete(s)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6B7C85" }}>Total: {total}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page}</span>
                  <button style={btnSmall} disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "financials" && (
        <div>
          {financials == null ? (
            <p>Loading...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7C85", marginBottom: 4 }}>Active subscriptions</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{financials.activeCount}</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7C85", marginBottom: 4 }}>Inactive (paused)</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{financials.inactiveCount}</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7C85", marginBottom: 4 }}>Cancelled</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{financials.cancelledCount}</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7C85", marginBottom: 4 }}>Active revenue (total)</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>₹{Number(financials.totalActiveRevenue || 0).toLocaleString()}</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13, color: "#6B7C85", marginBottom: 4 }}>By frequency</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
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
            <p>Loading...</p>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Subscription ID</th>
                    <th style={th}>Customer</th>
                    <th style={th}>Plan · Product</th>
                    <th style={th}>Status</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td style={td}>{s.subscriptionId || s.id}</td>
                      <td style={td}>{s.customerName || s.customerEmail || "—"}</td>
                      <td style={td}>{s.planName} · {s.productLabel}</td>
                      <td style={td}>{s.status}</td>
                      <td style={td}>
                        {(s.status === "active" || s.status === "inactive") && (
                          <button
                            style={{ ...btnSmall, background: s.status === "active" ? "#FEE2E2" : "#D1FAE5", color: s.status === "active" ? "#B91C1C" : "#059669" }}
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
            <p>Loading...</p>
          ) : (
            <>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Subscription ID</th>
                      <th style={th}>Customer</th>
                      <th style={th}>Type</th>
                      <th style={th}>Product</th>
                      <th style={th}>Total (₹)</th>
                      <th style={th}>Status</th>
                      <th style={th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td style={td}>{s.subscriptionId || s.id}</td>
                        <td style={td}>{s.customerName || s.customerEmail || "—"}</td>
                        <td style={td}>{s.frequency}</td>
                        <td style={td}>{s.productLabel}</td>
                        <td style={td}>₹{Number(s.totalPrice).toLocaleString()}</td>
                        <td style={td}>{s.status}</td>
                        <td style={td}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#6B7C85" }}>Total: {total}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page}</span>
                  <button style={btnSmall} disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
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
          <div style={{ ...card, marginBottom: 16 }}>
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
                style={{ ...input, minWidth: 140 }}
              />
              <input
                type="text"
                placeholder="PIN code"
                value={deliveryPinCodeFilter}
                onChange={(e) => setDeliveryPinCodeFilter(e.target.value)}
                style={{ ...input, minWidth: 100 }}
              />
              <button style={btnSmall} onClick={() => loadSubscriptions({ page: 1 })}>Apply filter</button>
              {(deliveryLocalityFilter || deliveryPinCodeFilter) && (
                <button style={btnSmall} onClick={() => { setDeliveryLocalityFilter(""); setDeliveryPinCodeFilter(""); loadSubscriptions({ page: 1 }); }}>Clear</button>
              )}
            </div>
          </div>
          {/* Club (same locality): assign same partner to multiple subscriptions */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1B2B34", marginBottom: 8 }}>Club orders (same locality)</div>
            <p style={{ color: "#6B7C85", marginBottom: 12, fontSize: 13 }}>
              Select subscriptions below, then choose a delivery partner to assign to all selected. Partner will be checked for 13-minute slot conflicts.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <select value={clubPartnerId} onChange={(e) => setClubPartnerId(e.target.value)} style={select}>
                <option value="">— Select partner —</option>
                {deliveryPartners.filter((dp) => dp.onboardingStatus === "approved").map((dp) => (
                  <option key={dp.id} value={dp.id}>{dp.name || dp.email}</option>
                ))}
              </select>
              <button
                style={btnPrimary}
                onClick={handleAssignBulk}
                disabled={updatingId === "bulk" || deliverySelectedIds.size === 0 || !clubPartnerId}
              >
                {updatingId === "bulk" ? "Assigning…" : `Assign to ${deliverySelectedIds.size} selected`}
              </button>
            </div>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Select</th>
                    <th style={th}>Subscription ID</th>
                    <th style={th}>Customer</th>
                    <th style={th}>Address</th>
                    <th style={th}>Locality</th>
                    <th style={th}>PIN code</th>
                    <th style={th}>Preferred time (from user)</th>
                    <th style={th}>Pickup hub</th>
                    <th style={th}>Assigned partner</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.filter((s) => s.status === "active" || s.status === "inactive").map((s) => (
                    <tr key={s.id}>
                      <td style={td}>
                        <input
                          type="checkbox"
                          checked={deliverySelectedIds.has(s.id)}
                          onChange={() => toggleDeliverySelection(s.id)}
                        />
                      </td>
                      <td style={td}>{s.subscriptionId || s.id}</td>
                      <td style={td}>{s.customerName || s.customerEmail || "—"}</td>
                      <td style={td}>{s.deliveryAddress || "—"}</td>
                      <td style={td}>
                        <input
                          type="text"
                          placeholder="Locality"
                          defaultValue={s.locality}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (s.locality || "")) handleUpdateLocalityPinCode(s, "locality", v);
                          }}
                          style={{ ...input, width: 100, minWidth: 80 }}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="text"
                          placeholder="PIN"
                          defaultValue={s.pinCode}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (s.pinCode || "")) handleUpdateLocalityPinCode(s, "pinCode", v);
                          }}
                          style={{ ...input, width: 80 }}
                        />
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: "#1B2B34" }} title="Set by customer when selecting plan">
                          {s.preferredDeliveryTime || (s.preferredTimeRangeStart && s.preferredTimeRangeEnd ? `${s.preferredTimeRangeStart} - ${s.preferredTimeRangeEnd}` : "—")}
                        </span>
                      </td>
                      <td style={td}>
                        <select
                          value={s.pickupHubId || ""}
                          onChange={(e) => handleAssignDelivery(s.id, { deliveryPartnerId: s.deliveryPartnerId || null, pickupHubId: e.target.value || null })}
                          disabled={updatingId === s.id}
                          style={select}
                        >
                          <option value="">— None —</option>
                          {pickupHubs.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                        {s.pickupHubAddress && <span style={{ display: "block", fontSize: 11, color: "#6B7C85", marginTop: 4 }}>{s.pickupHubAddress}</span>}
                      </td>
                      <td style={td}>
                        <select
                          value={s.deliveryPartnerId || ""}
                          onChange={(e) => handleAssignDelivery(s.id, { deliveryPartnerId: e.target.value || null, pickupHubId: s.pickupHubId || null })}
                          disabled={updatingId === s.id}
                          style={select}
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
