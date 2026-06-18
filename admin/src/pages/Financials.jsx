import { useState, useEffect } from "react";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";

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

  return (
    <div className="admin-page">
      <PageHeader
        title="Financials"
        subtitle="Revenue, platform cut, and wallet-based payment settled. Net profit after supplier and delivery payouts."
      />
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total revenue (orders)</div>
          <div className="stat-card-value">₹{Number(data.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform cut (est.)</div>
          <div className="stat-card-value">₹{Number(data.platformCutTotal || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Payment settled (wallet)</div>
          <div className="stat-card-value">₹{Number(data.walletRevenue || 0).toLocaleString()}</div>
          <div className="stat-card-hint">Revenue from wallet orders & bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Amount to suppliers</div>
          <div className="stat-card-value danger">₹{Number(data.amountToSuppliers || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Amount to delivery partners</div>
          <div className="stat-card-value danger">₹{Number(data.amountToDeliveryPartners || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net profit (wallet)</div>
          <div className="stat-card-value success">₹{Number(data.netProfit ?? 0).toLocaleString()}</div>
          <div className="stat-card-hint">Settled revenue − payouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Platform wallet balance</div>
          <div className="stat-card-value">₹{Number(data.platformWalletBalance || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Order count</div>
          <div className="stat-card-value">{data.orderCount || 0}</div>
        </div>
      </div>
      <div className="card">
        <h3 className="card-title">By day (last 30 days)</h3>
        <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Platform cut</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {(data.byDay || []).map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>₹{Number(row.revenue || 0).toLocaleString()}</td>
                  <td>₹{Number(row.platformCut || 0).toLocaleString()}</td>
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
