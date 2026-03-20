import { useState, useEffect } from "react";
import { api } from "../api/client";

const card = { background: "#f0f7fcd7", borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E5E7EB", fontWeight: 600, color: "#1B2B34" };
const td = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", color: "#1B2B34" };

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

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Unable to load financials or access denied.</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Financials</h1>
      <p style={{ color: "#6B7C85", marginBottom: 24 }}>
        Revenue, platform cut, and wallet-based payment settled. Net profit after supplier and delivery payouts.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Total revenue (orders)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Platform cut (est.)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.platformCutTotal || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Payment settled (wallet)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.walletRevenue || 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "#6B7C85" }}>Revenue from wallet orders & bills</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Amount to suppliers</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#B91C1C" }}>₹{Number(data.amountToSuppliers || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Amount to delivery partners</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#B91C1C" }}>₹{Number(data.amountToDeliveryPartners || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Net profit (wallet)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>₹{Number(data.netProfit ?? 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "#6B7C85" }}>Settled revenue − payouts</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Platform wallet balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.platformWalletBalance || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Order count</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1B2B34" }}>{data.orderCount || 0}</div>
        </div>
      </div>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>By day (last 30 days)</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Revenue</th>
                <th style={th}>Platform cut</th>
                <th style={th}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {(data.byDay || []).map((row) => (
                <tr key={row.date}>
                  <td style={td}>{row.date}</td>
                  <td style={td}>₹{Number(row.revenue || 0).toLocaleString()}</td>
                  <td style={td}>₹{Number(row.platformCut || 0).toLocaleString()}</td>
                  <td style={td}>{row.orderCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
