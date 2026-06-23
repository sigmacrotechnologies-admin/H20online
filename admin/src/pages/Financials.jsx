import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString()}`;
}

function categoryBadge(category) {
  const map = {
    wallet_order: { label: "Wallet order", className: "badge-success" },
    subscription_bill: { label: "Subscription", className: "badge-progress" },
    order_payout: { label: "Payout", className: "badge-open" },
    refund: { label: "Refund", className: "badge-danger" },
    other_credit: { label: "Credit", className: "badge-muted" },
    other_debit: { label: "Debit", className: "badge-muted" },
  };
  const info = map[category] || { label: category || "—", className: "badge-muted" };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

export default function Financials() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.financials()
      .then(setData)
      .catch((e) => {
        if (e.message?.includes("403") || e.message?.toLowerCase().includes("permission")) {
          alert("You do not have permission to view financials.");
        } else {
          console.error(e);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <div className="admin-page"><div className="empty-state">Unable to load financials or access denied.</div></div>;

  const rates = data.rates || {};
  const settlements = data.recentSettlements || [];
  const platformTx = data.recentPlatformTransactions || [];
  const razorpayPayments = data.recentRazorpayPayments || [];

  return (
    <div className="admin-page">
      <PageHeader
        title="Financials"
        subtitle="Unified settlements: revenue collected, supplier & rider cuts, platform retention, and wallet movements."
      />

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 className="card-title">Settlement rules</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Supplier fee: each supplier&apos;s commission % (default {rates.defaultCommissionPercent || 20}% on their item subtotal).
          Rider share: {rates.deliverySharePercent || 10}% of order total (incl. tax).
          Platform retention = order total − supplier payouts − rider share.
          Wallet orders credit the platform wallet; Razorpay goes to Razorpay. Payouts credit supplier/rider wallets on delivery.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total order revenue</div>
          <div className="stat-card-value">{money(data.totalOrderRevenue)}</div>
          <div className="stat-card-hint">{data.orderCount || 0} orders · {data.deliveredOrderCount || 0} delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Collected (settled)</div>
          <div className="stat-card-value">{money(data.settledRevenue)}</div>
          <div className="stat-card-hint">
            Wallet orders {money(data.walletOrderCredits)} · Bills {money(data.billRevenue)} · Razorpay {money(data.razorpayRevenue)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform fee (suppliers)</div>
          <div className="stat-card-value">{money(data.platformCutTotal)}</div>
          <div className="stat-card-hint">{Number(data.platformCutPercent || 0).toFixed(1)}% of order revenue (est.)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Supplier share (est.)</div>
          <div className="stat-card-value">{money(data.supplierPayoutEstimated)}</div>
          <div className="stat-card-hint">Paid to wallets: {money(data.amountToSuppliers)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Rider share (est.)</div>
          <div className="stat-card-value">{money(data.riderPayoutEstimated)}</div>
          <div className="stat-card-hint">Paid to wallets: {money(data.amountToRiders)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform retention (est.)</div>
          <div className="stat-card-value success">{money(data.platformRetentionEstimated)}</div>
          <div className="stat-card-hint">After supplier & rider shares</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform wallet balance</div>
          <div className="stat-card-value">{money(data.platformWalletBalance)}</div>
          <div className="stat-card-hint">Credits {money(data.walletRevenue)} − debits {money(data.walletDebitsTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net wallet flow</div>
          <div className="stat-card-value">{money(data.netWalletFlow)}</div>
          <div className="stat-card-hint">Payouts {money(data.payoutDebits)} · refunds {money(data.refundDebits)}</div>
        </div>
        {data.codPendingRevenue > 0 && (
          <div className="stat-card">
            <div className="stat-card-label">COD pending</div>
            <div className="stat-card-value">{money(data.codPendingRevenue)}</div>
            <div className="stat-card-hint">Not yet collected</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Order settlements (delivered)</h3>
        <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Per-order breakdown using supplier commission % and {rates.deliverySharePercent || 10}% rider share.
        </p>
        {settlements.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem 0" }}>No delivered orders yet.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Platform fee</th>
                  <th>Supplier</th>
                  <th>Rider</th>
                  <th>Platform keeps</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((row) => (
                  <tr key={row.id || row.orderId}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.orderId}</td>
                    <td>
                      {row.paymentMethod}
                      {row.isRazorpayTest && <span className="badge badge-open" style={{ marginLeft: 6 }}>Test</span>}
                    </td>
                    <td>{money(row.orderTotal)}</td>
                    <td>{money(row.platformCutFromSuppliers)}</td>
                    <td>{money(row.supplierPayoutTotal)}</td>
                    <td>{money(row.deliveryShare)}</td>
                    <td>{money(row.platformRetention)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Platform wallet transactions</h3>
        {platformTx.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem 0" }}>No platform wallet activity yet.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {platformTx.map((row, i) => (
                  <tr key={`${row.ref}-${i}`}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      <span className={row.type === "credit" ? "badge badge-success" : "badge badge-danger"}>
                        {row.type}
                      </span>
                    </td>
                    <td>{categoryBadge(row.category)}</td>
                    <td>{money(row.amount)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{row.label || row.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <h3 className="card-title" style={{ margin: 0 }}>Razorpay payments</h3>
          {data.razorpayCurrentTestMode && <span className="badge badge-open">Gateway: Test mode</span>}
          {!data.razorpayConfigured && <span className="badge badge-muted">Razorpay not configured</span>}
        </div>
        <div className="stat-grid" style={{ marginBottom: "1rem" }}>
          <div className="stat-card">
            <div className="stat-card-label">Razorpay total</div>
            <div className="stat-card-value">{money(data.razorpayRevenue)}</div>
            <div className="stat-card-hint">{data.razorpayOrderCount || 0} payments</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Live</div>
            <div className="stat-card-value">{money(data.razorpayLiveRevenue)}</div>
            <div className="stat-card-hint">{data.razorpayLiveOrderCount || 0} payments</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Test</div>
            <div className="stat-card-value">{money(data.razorpayTestRevenue)}</div>
            <div className="stat-card-hint">{data.razorpayTestOrderCount || 0} payments</div>
          </div>
        </div>
        {razorpayPayments.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem 0" }}>No Razorpay payments yet.</div>
        ) : (
          <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment ID</th>
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {razorpayPayments.map((row) => (
                  <tr key={row.id || row.orderId}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.orderId}</td>
                    <td>{row.customerName || row.customerEmail || "—"}</td>
                    <td>{money(row.total)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{row.razorpayPaymentId || "—"}</td>
                    <td>
                      {row.isTest ? <span className="badge badge-open">Test</span> : <span className="badge badge-success">Live</span>}
                    </td>
                    <td>{row.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">By day (last 30 days)</h3>
        <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Razorpay</th>
                <th>Platform fee</th>
                <th>Supplier</th>
                <th>Rider</th>
                <th>Platform keeps</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {(data.byDay || []).map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{money(row.revenue)}</td>
                  <td>{money(row.razorpayRevenue)}</td>
                  <td>{money(row.platformCut)}</td>
                  <td>{money(row.supplierPayout)}</td>
                  <td>{money(row.riderPayout)}</td>
                  <td>{money(row.platformRetention)}</td>
                  <td>{row.orderCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
