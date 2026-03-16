import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const card = { background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };
const input = { padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", marginRight: 8 };
const btnSmall = { padding: "6px 12px", borderRadius: 8, border: "none", background: "#E0F2FE", color: "#1B2B34", cursor: "pointer", fontSize: 13 };
const btnPrimary = { padding: "10px 20px", borderRadius: 8, border: "none", background: "#1EA7FD", color: "#fff", fontWeight: 600, cursor: "pointer" };
const tabStyle = (active) => ({
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: active ? "#1EA7FD" : "#E0F2FE",
  color: active ? "#fff" : "#1B2B34",
  fontWeight: 600,
  cursor: "pointer",
});

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
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Wallet management</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>
        View and update wallet balances by user type. Add, deduct, or set balance. Click <strong>View details</strong> to see transaction history.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} style={tabStyle(tab === t.id)} onClick={() => { setTab(t.id); setPage(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#6B7C85" }}>Total: {total} {tab === "customer" ? "customers" : tab === "supplier" ? "suppliers" : tab === "deliveryPartner" ? "delivery partners" : ""}</span>
      </div>

      <div style={card}>
        {loading ? (
          <p>Loading...</p>
        ) : list.length === 0 ? (
          <p style={{ color: "#6B7C85" }}>No users in this category.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>{idLabel}</th>
                    <th style={th}>Name</th>
                    <th style={th}>Email</th>
                    <th style={th}>Balance (₹)</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.userId}>
                      <td style={td}>{row.displayId ?? row.userCode ?? row.userId ?? "—"}</td>
                      <td style={td}>{row.name || "—"}</td>
                      <td style={td}>{row.email || "—"}</td>
                      <td style={td}>{Number(row.balance || 0).toLocaleString()}</td>
                      <td style={td}>
                        <button style={btnSmall} onClick={() => openAdjust(row, "add")}>Add</button>
                        <button style={btnSmall} onClick={() => openAdjust(row, "deduct")} disabled={!(row.balance > 0)}>Deduct</button>
                        <button style={btnSmall} onClick={() => openAdjust(row, "set")}>Set balance</button>
                        <button style={{ ...btnSmall, marginLeft: 8 }} onClick={() => openTransactions(row)}>View details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6B7C85" }}>Page {page}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnSmall} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button style={btnSmall} disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Adjust balance modal */}
      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setAdjustModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 400, width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{adjustModal.action === "add" ? "Add balance" : adjustModal.action === "deduct" ? "Deduct balance" : "Set balance"}</h3>
            <p style={{ fontSize: 14, color: "#6B7C85", marginBottom: 12 }}>{adjustModal.user.name} ({adjustModal.user.userCode || adjustModal.user.email})</p>
            <form onSubmit={handleAdjust}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
                style={{ ...input, width: "100%", marginBottom: 12 }}
              />
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Note (optional)</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. Refund"
                style={{ ...input, width: "100%", marginBottom: 16 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={btnPrimary} disabled={adjustSaving}>{adjustSaving ? "Saving..." : "Save"}</button>
                <button type="button" style={btnSmall} onClick={() => setAdjustModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions popover */}
      {transactionsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={() => setTransactionsModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 560, width: "95%", maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Wallet transactions</h3>
            <p style={{ fontSize: 14, color: "#6B7C85", marginBottom: 12 }}>
              {transactionsModal.user.name} ({transactionsModal.user.userCode || transactionsModal.user.email}) · Balance: ₹{Number(transactionsModal.balance || 0).toLocaleString()}
            </p>
            {txLoading ? (
              <p>Loading...</p>
            ) : (transactionsModal.transactions || []).length === 0 ? (
              <p style={{ color: "#6B7C85" }}>No transactions yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Type</th>
                      <th style={th}>Amount (₹)</th>
                      <th style={th}>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsModal.transactions.map((t, i) => (
                      <tr key={i}>
                        <td style={td}>{formatDate(t.createdAt)}</td>
                        <td style={td}>{t.type}</td>
                        <td style={{ ...td, color: t.type === "credit" ? "#059669" : "#B91C1C" }}>{t.type === "credit" ? "+" : "-"}₹{Number(t.amount || 0).toLocaleString()}</td>
                        <td style={td}>{t.ref || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button style={{ ...btnSmall, marginTop: 16 }} onClick={() => setTransactionsModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
