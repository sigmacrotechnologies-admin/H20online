import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navStyle = {
  background: "linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%)",
  color: "#fff",
  padding: "12px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};
const linkStyle = (isActive) => ({
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
  background: isActive ? "rgba(255,255,255,0.2)" : "transparent",
});
const mainStyle = { flex: 1, padding: 24, maxWidth: 1400, margin: "0 auto", width: "100%" };

export default function Layout() {
  const { user, logout, canSeeFinancials, canCreateAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav style={navStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <NavLink to="/" style={({ isActive }) => linkStyle(isActive)}>Dashboard</NavLink>
          <NavLink to="/users" style={({ isActive }) => linkStyle(isActive)}>Users</NavLink>
          <NavLink to="/orders" style={({ isActive }) => linkStyle(isActive)}>Orders</NavLink>
          <NavLink to="/suppliers" style={({ isActive }) => linkStyle(isActive)}>Suppliers</NavLink>
          <NavLink to="/plans" style={({ isActive }) => linkStyle(isActive)}>Plans & rates</NavLink>
          <NavLink to="/subscriptions" style={({ isActive }) => linkStyle(isActive)}>Subscription orders</NavLink>
          <NavLink to="/delivery-partners" style={({ isActive }) => linkStyle(isActive)}>Delivery partners</NavLink>
          <NavLink to="/supplier-support" style={({ isActive }) => linkStyle(isActive)}>Supplier support</NavLink>
          <NavLink to="/delivery-support" style={({ isActive }) => linkStyle(isActive)}>Delivery partner support</NavLink>
          {canSeeFinancials && (
            <NavLink to="/financials" style={({ isActive }) => linkStyle(isActive)}>Financials</NavLink>
          )}
          {canCreateAdmin && (
            <NavLink to="/admin-users" style={({ isActive }) => linkStyle(isActive)}>Admin users</NavLink>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14 }}>{user?.name || user?.email} ({user?.role})</span>
          <button
            type="button"
            onClick={() => { logout(); navigate("/login"); }}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600 }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}
