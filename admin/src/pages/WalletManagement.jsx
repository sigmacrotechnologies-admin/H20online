import { useState, useEffect, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { api } from "../api/client";

const TABS = [
  { id: "customer", label: "Customer" },
  { id: "supplier", label: "Supplier" },
  { id: "deliveryPartner", label: "Delivery partner" },
  { id: "corporate", label: "Corporate" },
  { id: "organization", label: "Organization" },
  { id: "institute", label: "Institute" },
  { id: "college", label: "College" },
];

export default function WalletManagement() {
  const [tab, setTab] = useState("customer");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(null); // { user, action }
  const [transactionsModal, setTransactionsModal] = useState(null); // { user, balance, transactions }
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const limit = 100;

  const load = useCallback(() => {
    setLoading(true);
    const params = { type: tab, page, limit };
    api
      .walletManagement(params)
      .then((res) => {
        setList(res.list || []);
        setTotal(res.total || 0);
      })
      .catch((e) => {
        console.error(e);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [tab, page, limit]);

  useEffect(() => load(), [load]);

  const openAdjust = (user, action) => {
    setAdjustModal({ user, action });
    setAdjustAmount(action === "set" ? String(user.balance || 0) : "");
    setAdjustNote("");
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustModal?.user?.userId) return;
    const amount = Number(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }
    if (adjustModal.action === "deduct") {
      if (amount > (adjustModal.user.balance || 0)) {
        alert("Amount exceeds current balance.");
        return;
      }
    }
    setAdjustSaving(true);
    try {
      const res = await api.walletManagementAdjust(adjustModal.user.userId, {
        action: adjustModal.action,
        amount,
        note: adjustNote || undefined,
      });
      const newBalance = res.balance != null ? res.balance : adjustModal.user.balance;
      setList((prev) => prev.map((r) => (r.userId === adjustModal.user.userId ? { ...r, balance: newBalance } : r)));
      setTransactionsModal((m) => (m && m.user?.userId === adjustModal.user.userId ? { ...m, balance: newBalance } : m));
      setAdjustModal(null);
      load();
    } catch (err) {
      alert(err.message || "Failed to update wallet");
    } finally {
      setAdjustSaving(false);
    }
  };

  const openTransactions = (user) => {
    setTransactionsModal({ user, balance: user.balance, transactions: [] });
    setTxLoading(true);
    api
      .walletManagementUser(user.userId)
      .then((data) => setTransactionsModal((m) => ({ ...m, balance: data.balance, transactions: data.transactions || [] })))
      .catch(() => setTransactionsModal((m) => ({ ...m, transactions: [] })))
      .finally(() => setTxLoading(false));
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  const idLabel = tab === "supplier" ? "Supplier ID" : tab === "deliveryPartner" ? "Delivery partner ID" : "Customer ID";

  return (
    <div className="admin-page">
      <PageHeader
        title="Wallet management"
        subtitle={
          <>
            View and update wallet balances by user type. Add, deduct, or set balance. Click <strong>View details</strong> to see transaction history.
          </>
        }
      />

      <div className="tab-group">
        {TABS.map((t) => (
          <button key={t.id} className={"tab-btn" + (tab === t.id ? " active" : "")} onClick={() => { setTab(t.id); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="pagination-meta">Total: {total} {tab === "customer" ? "customers" : tab === "supplier" ? "suppliers" : tab === "deliveryPartner" ? "delivery partners" : ""}</span>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : list.length === 0 ? (
          <p className="pagination-meta">No users in this category.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{idLabel}</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Balance (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.userId}>
                      <td>{row.displayId ?? row.userCode ?? row.userId ?? "—"}</td>
                      <td>{row.name || "—"}</td>
                      <td>{row.email || "—"}</td>
                      <td>{Number(row.balance || 0).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(row, "add")}>Add</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(row, "deduct")} disabled={!(row.balance > 0)}>Deduct</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(row, "set")}>Set balance</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openTransactions(row)}>View details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <span className="pagination-meta">Page {page}</span>
              <div className="pagination-controls">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Adjust balance modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">{adjustModal.action === "add" ? "Add balance" : adjustModal.action === "deduct" ? "Deduct balance" : "Set balance"}</h3>
            <p className="card-subtitle">{adjustModal.user.name} ({adjustModal.user.userCode || adjustModal.user.email})</p>
            <form onSubmit={handleAdjust}>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  style={{ width: "100%" }}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%" }}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Refund"
                />
              </div>
              <div className="pagination-controls">
                <button type="submit" className="btn btn-primary" disabled={adjustSaving}>{adjustSaving ? "Saving..." : "Save"}</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdjustModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions popover */}
      {transactionsModal && (
        <div className="modal-overlay" onClick={() => setTransactionsModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">Wallet transactions</h3>
            <p className="card-subtitle">
              {transactionsModal.user.name} ({transactionsModal.user.userCode || transactionsModal.user.email}) · Balance: ₹{Number(transactionsModal.balance || 0).toLocaleString()}
            </p>
            {txLoading ? (
              <LoadingState />
            ) : (transactionsModal.transactions || []).length === 0 ? (
              <p className="pagination-meta">No transactions yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount (₹)</th>
                      <th>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsModal.transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{formatDate(t.createdAt)}</td>
                        <td>{t.type}</td>
                        <td className={t.type === "credit" ? "text-success" : "text-danger"}>{t.type === "credit" ? "+" : "-"}₹{Number(t.amount || 0).toLocaleString()}</td>
                        <td>{t.ref || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => setTransactionsModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
