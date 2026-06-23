import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

const tiles = [
  { to: "/users", title: "Users", subtitle: "View, add, edit and manage app users", icon: "👤" },
  { to: "/orders", title: "Orders", subtitle: "Ongoing and past orders", icon: "📦" },
  { to: "/suppliers", title: "Supplier onboarding", subtitle: "Add or remove suppliers", icon: "🚚" },
  { to: "/products", title: "Supplier products", subtitle: "View & delete any supplier catalog item", icon: "🏷️" },
  { to: "/plans", title: "Plans & rates", subtitle: "Update subscription plans and bottle rates", icon: "📋" },
  { to: "/subscriptions", title: "Subscription orders", subtitle: "Active subscriptions, financials, delivery assignment", icon: "📅" },
  { to: "/societies", title: "Society management", subtitle: "Societies, members, tanker plans & assignment", icon: "🏘️" },
  { to: "/stores", title: "Store management", subtitle: "Approve stores, locator & supplier links", icon: "🏬" },
  { to: "/wallet-management", title: "Wallet management", subtitle: "Customer, supplier & delivery wallets", icon: "💳" },
  { to: "/financials", title: "Financials", subtitle: "Revenue, settlements, supplier & rider cuts", icon: "💰", requireMasterOrAdmin: true },
  { to: "/admin-users", title: "Admin users", subtitle: "Create admin or sub-admin", icon: "🔐", requireMasterOrAdmin: true },
  { to: "/delivery-partners", title: "Delivery partners", subtitle: "Verify & approve delivery partners", icon: "🏍️" },
  { to: "/customer-support", title: "Customer support", subtitle: "Complaints and support tickets", icon: "🎫" },
  { to: "/surveys", title: "Surveys & marketing", subtitle: "Create, launch surveys & view results", icon: "📊" },
  { to: "/supplier-support", title: "Supplier support", subtitle: "Messages from suppliers", icon: "💬" },
  { to: "/delivery-support", title: "Delivery support", subtitle: "Messages from delivery partners", icon: "📨" },
];

export default function Dashboard() {
  const { canSeeFinancials, canCreateAdmin, user } = useAuth();

  return (
    <div className="admin-page">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle="Manage users, orders, suppliers, plans, wallets and support from one place."
      />
      <div className="tile-grid">
        {tiles.map((t) => {
          if (t.requireMasterOrAdmin && t.to === "/financials" && !canSeeFinancials) return null;
          if (t.requireMasterOrAdmin && t.to === "/admin-users" && !canCreateAdmin) return null;
          return (
            <Link key={t.to} to={t.to} className="dashboard-tile">
              <div className="dashboard-tile-icon">{t.icon}</div>
              <h2>{t.title}</h2>
              <p>{t.subtitle}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
