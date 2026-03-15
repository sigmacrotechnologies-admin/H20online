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
        Revenue and platform cut. 20% from single-supplier orders, 30% from multi-supplier orders.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Total revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.totalRevenue || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Platform cut</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2B34" }}>₹{Number(data.platformCutTotal || 0).toLocaleString()}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Cut % of revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2B34" }}>{Number(data.platformCutPercent || 0).toFixed(1)}%</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, color: "#6B7C85", marginBottom: 4 }}>Order count</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2B34" }}>{data.orderCount || 0}</div>
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
