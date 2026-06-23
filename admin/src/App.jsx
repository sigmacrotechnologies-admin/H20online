import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Plans from "./pages/Plans";
import Subscriptions from "./pages/Subscriptions";
import Financials from "./pages/Financials";
import AdminUsers from "./pages/AdminUsers";
import DeliveryPartners from "./pages/DeliveryPartners";
import SupplierSupport from "./pages/SupplierSupport";
import DeliveryPartnerSupport from "./pages/DeliveryPartnerSupport";
import CustomerSupport from "./pages/CustomerSupport";
import WalletManagement from "./pages/WalletManagement";
import Societies from "./pages/Societies";
import Stores from "./pages/Stores";
import Products from "./pages/Products";
import Surveys from "./pages/Surveys";
import SurveyResults from "./pages/SurveyResults";
import LoadingState from "./components/LoadingState";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Loading admin portal..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FinancialsRoute() {
  const { canSeeFinancials } = useAuth();
  if (!canSeeFinancials) return <Navigate to="/" replace />;
  return <Financials />;
}

function AdminUsersRoute() {
  const { canCreateAdmin } = useAuth();
  if (!canCreateAdmin) return <Navigate to="/" replace />;
  return <AdminUsers />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="orders" element={<Orders />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="plans" element={<Plans />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="societies" element={<Societies />} />
        <Route path="stores" element={<Stores />} />
        <Route path="products" element={<Products />} />
        <Route path="wallet-management" element={<WalletManagement />} />
        <Route path="financials" element={<FinancialsRoute />} />
        <Route path="admin-users" element={<AdminUsersRoute />} />
        <Route path="delivery-partners" element={<DeliveryPartners />} />
        <Route path="supplier-support" element={<SupplierSupport />} />
        <Route path="delivery-support" element={<DeliveryPartnerSupport />} />
        <Route path="customer-support" element={<CustomerSupport />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="surveys/:id/results" element={<SurveyResults />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
