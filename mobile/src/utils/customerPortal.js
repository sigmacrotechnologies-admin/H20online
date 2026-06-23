import { useAuth } from "@/src/context/AuthContext";

export function useCustomerPortal() {
  const { user } = useAuth();
  const isSociety = user?.role === "society";
  return {
    isSociety,
    home: isSociety ? "/society-dashboard" : "/dashboard",
    profile: isSociety ? "/society-profile" : "/profile",
    productAudience: isSociety ? "society" : "customer",
    orderChannel: isSociety ? "society" : "customer",
  };
}

export function getPortalHomeForUser(user) {
  return user?.role === "society" ? "/society-dashboard" : "/dashboard";
}

export function getPortalProfileForUser(user) {
  return user?.role === "society" ? "/society-profile" : "/profile";
}
