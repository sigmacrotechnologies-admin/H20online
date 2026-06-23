import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

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

      <div className="tab-group">
        <button type="button" className={tab === "societies" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} onClick={() => setTab("societies")}>Societies</button>
        <button type="button" className={tab === "subscriptions" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} onClick={() => setTab("subscriptions")}>Society subscriptions</button>
        <Link to="/subscriptions?channel=society" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>Full subscription admin →</Link>
      </div>

      {tab === "societies" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <input className="input" placeholder="Search society name, reg no, POC, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? <LoadingState label="Loading societies…" /> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Society</th>
                    <th>Registration</th>
                    <th>POC</th>
                    <th>City</th>
                    <th>Members</th>
                    <th>Active plans</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {societies.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.societyName}</strong></td>
                      <td>{s.registrationNo}</td>
                      <td>{s.pocName}<br /><small>{s.pocPhone}</small></td>
                      <td>{s.city || "—"}</td>
                      <td>{s.memberCount}</td>
                      <td>{s.activeSubscriptions}</td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadDetail(s.id)}>Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {societies.length === 0 ? <p style={{ padding: 16, color: "#6B7C85" }}>No societies found.</p> : null}
            </div>
          )}

          {selectedId ? (
            <div className="card" style={{ marginTop: 24 }}>
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
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedId(null); setDetail(null); }}>Close</button>
                  </div>

                  <h3>Linked members (customers)</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Member ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.members || []).map((m) => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>{m.email}</td>
                            <td>{m.phone}</td>
                            <td>{m.userCode || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(detail.members || []).length === 0 ? <p style={{ padding: 12, color: "#6B7C85" }}>No members linked yet. Customers select society in profile.</p> : null}
                  </div>

                  <h3 style={{ marginTop: 24 }}>Society subscription plans</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Subscription</th>
                          <th>Product</th>
                          <th>Schedule</th>
                          <th>Status</th>
                          <th>Assign tanker / partner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.subscriptions || []).map((sub) => (
                          <tr key={sub.id}>
                            <td>{sub.subscriptionId}<br /><small>{sub.planName}</small></td>
                            <td>{sub.productLabel}</td>
                            <td>{sub.frequency} · {sub.selectedDates?.length || 0} dates<br /><small>{sub.deliveryAddress}</small></td>
                            <td>{sub.status}</td>
                            <td>
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
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer / Society</th>
                    <th>Plan / Product</th>
                    <th>Frequency</th>
                    <th>Total</th>
                    <th>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {societySubs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.subscriptionId}</td>
                      <td>{s.customerName}<br /><small>{s.customerEmail}</small></td>
                      <td>{s.planName} — {s.productLabel}</td>
                      <td>{s.frequency}</td>
                      <td>₹{s.totalPrice}</td>
                      <td>{s.subscriptionChannel || "society"}</td>
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
