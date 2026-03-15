import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const tileStyle = {
  background: "#f0f7fcd7",
  borderRadius: 20,
  padding: 24,
  textDecoration: "none",
  color: "#1B2B34",
  display: "block",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  transition: "transform 0.2s, box-shadow 0.2s",
};
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 };

const tiles = [
  { to: "/users", title: "Users", subtitle: "View, add, edit and manage app users", emoji: "👤" },
  { to: "/orders", title: "Orders", subtitle: "Ongoing and past orders", emoji: "📦" },
  { to: "/suppliers", title: "Supplier onboarding", subtitle: "Add or remove suppliers", emoji: "🚚" },
  { to: "/plans", title: "Plans & rates", subtitle: "Update subscription plans and bottle rates", emoji: "📋" },
  { to: "/financials", title: "Financials", subtitle: "Revenue, platform cut (20% / 30%)", emoji: "💰", requireMasterOrAdmin: true },
  { to: "/admin-users", title: "Admin users", subtitle: "Create admin or sub-admin", emoji: "🔐", requireMasterOrAdmin: true },
  { to: "/delivery-partners", title: "Delivery partners", subtitle: "Verify & approve delivery partners", emoji: "🏍️" },
  { to: "/supplier-support", title: "Supplier support", subtitle: "Messages from suppliers", emoji: "💬" },
];

export default function Dashboard() {
  const { canSeeFinancials, canCreateAdmin } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B2B34", marginBottom: 8 }}>Admin Dashboard</h1>
      <p style={{ fontSize: 15, color: "#6B7C85", marginBottom: 24 }}>Manage users, orders, suppliers, plans and financials.</p>
      <div style={gridStyle}>
        {tiles.map((t) => {
          if (t.requireMasterOrAdmin && t.to === "/financials" && !canSeeFinancials) return null;
          if (t.requireMasterOrAdmin && t.to === "/admin-users" && !canCreateAdmin) return null;
          return (
            <Link
              key={t.to}
              to={t.to}
              style={tileStyle}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
            >
              <span style={{ fontSize: 32, marginBottom: 12, display: "block" }}>{t.emoji}</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t.title}</h2>
              <p style={{ fontSize: 13, color: "#6B7C85", margin: 0 }}>{t.subtitle}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
