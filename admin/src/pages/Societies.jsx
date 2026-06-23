import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const tableWrap = { overflowX: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", minWidth: 200 };
const btn = { padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", background: "#1EA7FD", color: "#fff" };
const btnSmall = { ...btn, padding: "6px 12px", fontSize: 13, background: "#E0F2FE", color: "#1B2B34" };
const tabRow = { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" };

export default function Societies() {
  const [tab, setTab] = useState("societies");
  const [societies, setSocieties] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [societySubs, setSocietySubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const loadSocieties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.societies({ search: search.trim() });
      setSocieties(res.societies || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setSocieties([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadSocietySubs = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await api.subscriptions({ channel: "society", status: "active", limit: 100 });
      setSocietySubs(res.subscriptions || []);
    } catch (e) {
      setSocietySubs([]);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  const loadDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await api.society(id);
      setDetail(data);
    } catch (e) {
      alert(e.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "societies") loadSocieties();
    else loadSocietySubs();
  }, [tab, loadSocieties, loadSocietySubs]);

  useEffect(() => {
    const t = setTimeout(() => { if (tab === "societies") loadSocieties(); }, 300);
    return () => clearTimeout(t);
  }, [search, tab, loadSocieties]);

  const assignDelivery = async (societyId, subscriptionId, deliveryPartnerId) => {
    setAssigningId(subscriptionId);
    try {
      await api.societySubscriptionDelivery(societyId, subscriptionId, { deliveryPartnerId });
      if (selectedId === societyId) await loadDetail(societyId);
      if (tab === "subscriptions") await loadSocietySubs();
    } catch (e) {
      alert(e.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Society management"
        subtitle="Society accounts, linked members, tanker subscriptions and delivery assignment"
      />

      <div style={tabRow}>
        <button type="button" style={tab === "societies" ? btn : btnSmall} onClick={() => setTab("societies")}>Societies</button>
        <button type="button" style={tab === "subscriptions" ? btn : btnSmall} onClick={() => setTab("subscriptions")}>Society subscriptions</button>
        <Link to="/subscriptions?channel=society" style={{ ...btnSmall, textDecoration: "none", display: "inline-block" }}>Full subscription admin →</Link>
      </div>

      {tab === "societies" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <input style={input} placeholder="Search society name, reg no, POC, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? <LoadingState label="Loading societies…" /> : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Society</th>
                    <th style={th}>Registration</th>
                    <th style={th}>POC</th>
                    <th style={th}>City</th>
                    <th style={th}>Members</th>
                    <th style={th}>Active plans</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {societies.map((s) => (
                    <tr key={s.id}>
                      <td style={td}><strong>{s.societyName}</strong></td>
                      <td style={td}>{s.registrationNo}</td>
                      <td style={td}>{s.pocName}<br /><small>{s.pocPhone}</small></td>
                      <td style={td}>{s.city || "—"}</td>
                      <td style={td}>{s.memberCount}</td>
                      <td style={td}>{s.activeSubscriptions}</td>
                      <td style={td}>
                        <button type="button" style={btnSmall} onClick={() => loadDetail(s.id)}>Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {societies.length === 0 ? <p style={{ padding: 16, color: "#6B7C85" }}>No societies found.</p> : null}
            </div>
          )}

          {selectedId ? (
            <div style={{ ...card, marginTop: 24 }}>
              {detailLoading ? <LoadingState label="Loading society…" /> : detail ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{detail.society?.societyName}</h2>
                      <p style={{ color: "#6B7C85", marginTop: 8 }}>
                        Reg: {detail.society?.registrationNo} · POC: {detail.society?.pocName} ({detail.society?.pocPhone})
                      </p>
                      <p style={{ color: "#6B7C85" }}>{detail.society?.address} {detail.society?.city}</p>
                      <p style={{ marginTop: 8 }}><strong>{detail.society?.memberCount}</strong> linked members</p>
                    </div>
                    <button type="button" style={btnSmall} onClick={() => { setSelectedId(null); setDetail(null); }}>Close</button>
                  </div>

                  <h3>Linked members (customers)</h3>
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Name</th>
                          <th style={th}>Email</th>
                          <th style={th}>Phone</th>
                          <th style={th}>Member ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.members || []).map((m) => (
                          <tr key={m.id}>
                            <td style={td}>{m.name}</td>
                            <td style={td}>{m.email}</td>
                            <td style={td}>{m.phone}</td>
                            <td style={td}>{m.userCode || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(detail.members || []).length === 0 ? <p style={{ padding: 12, color: "#6B7C85" }}>No members linked yet. Customers select society in profile.</p> : null}
                  </div>

                  <h3 style={{ marginTop: 24 }}>Society subscription plans</h3>
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={th}>Subscription</th>
                          <th style={th}>Product</th>
                          <th style={th}>Schedule</th>
                          <th style={th}>Status</th>
                          <th style={th}>Assign tanker / partner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.subscriptions || []).map((sub) => (
                          <tr key={sub.id}>
                            <td style={td}>{sub.subscriptionId}<br /><small>{sub.planName}</small></td>
                            <td style={td}>{sub.productLabel}</td>
                            <td style={td}>{sub.frequency} · {sub.selectedDates?.length || 0} dates<br /><small>{sub.deliveryAddress}</small></td>
                            <td style={td}>{sub.status}</td>
                            <td style={td}>
                              <select
                                value={sub.deliveryPartnerId || ""}
                                onChange={(e) => assignDelivery(selectedId, sub.id, e.target.value || null)}
                                disabled={assigningId === sub.id}
                                style={{ padding: 6, borderRadius: 6, border: "1px solid #E5E7EB", minWidth: 160 }}
                              >
                                <option value="">— Assign partner —</option>
                                {(detail.deliveryPartners || []).map((dp) => (
                                  <option key={dp.id} value={dp.id}>{dp.name} ({dp.vehicleType})</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(detail.subscriptions || []).length === 0 ? <p style={{ padding: 12, color: "#6B7C85" }}>No society subscriptions yet.</p> : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {subsLoading ? <LoadingState label="Loading society subscriptions…" /> : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Customer / Society</th>
                    <th style={th}>Plan / Product</th>
                    <th style={th}>Frequency</th>
                    <th style={th}>Total</th>
                    <th style={th}>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {societySubs.map((s) => (
                    <tr key={s.id}>
                      <td style={td}>{s.subscriptionId}</td>
                      <td style={td}>{s.customerName}<br /><small>{s.customerEmail}</small></td>
                      <td style={td}>{s.planName} — {s.productLabel}</td>
                      <td style={td}>{s.frequency}</td>
                      <td style={td}>₹{s.totalPrice}</td>
                      <td style={td}>{s.subscriptionChannel || "society"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {societySubs.length === 0 ? <p style={{ padding: 16, color: "#6B7C85" }}>No active society subscriptions.</p> : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
