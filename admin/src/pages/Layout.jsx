import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: "◆", end: true }],
  },
  {
    label: "Management",
    items: [
      { to: "/users", label: "Users", icon: "👤" },
      { to: "/orders", label: "Orders", icon: "📦" },
      { to: "/suppliers", label: "Suppliers", icon: "🚚" },
      { to: "/products", label: "Supplier products", icon: "🏷️" },
      { to: "/delivery-partners", label: "Delivery partners", icon: "🏍️" },
      { to: "/plans", label: "Plans & rates", icon: "📋" },
      { to: "/subscriptions", label: "Subscriptions", icon: "📅" },
      { to: "/societies", label: "Society management", icon: "🏘️" },
      { to: "/stores", label: "Store management", icon: "🏬" },
      { to: "/wallet-management", label: "Wallet management", icon: "💳" },
    ],
  },
  {
    label: "Survey & marketing",
    items: [{ to: "/surveys", label: "Surveys", icon: "📊" }],
  },
  {
    label: "Support",
    items: [
      { to: "/customer-support", label: "Customer support", icon: "🎫" },
      { to: "/supplier-support", label: "Supplier support", icon: "💬" },
      { to: "/delivery-support", label: "Delivery support", icon: "📨" },
    ],
  },
];

function getInitials(user) {
  const name = user?.name || user?.email || "A";
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Layout() {
  const { user, logout, canSeeFinancials, canCreateAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const adminItems = [];
  if (canSeeFinancials) adminItems.push({ to: "/financials", label: "Financials", icon: "💰" });
  if (canCreateAdmin) adminItems.push({ to: "/admin-users", label: "Admin users", icon: "🔐" });

  const groups = [...NAV_GROUPS];
  if (adminItems.length) {
    groups.push({ label: "Finance & admin", items: adminItems });
  }

  return (
    <div className="admin-shell">
      <div className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={closeSidebar} />
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <h1>H2O Admin</h1>
          <p>Operations portal</p>
        </div>
        <nav className="admin-nav">
          {groups.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <div className="admin-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-chip">
            <div className="admin-user-avatar">{getInitials(user)}</div>
            <div className="admin-user-meta">
              <div className="admin-user-name">{user?.name || user?.email}</div>
              <div className="admin-user-role">{user?.role || "admin"}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%", color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.2)" }}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <span style={{ fontWeight: 600, color: "var(--teal-dark)" }}>H2O Admin</span>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
