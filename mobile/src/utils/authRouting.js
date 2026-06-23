import { api } from "@/src/api/client";

export async function resolveHomeRoute(user) {
  if (!user) return "/";

  if (user.role === "supplier") {
    const supplierData = await api.suppliers.me().catch(() => null);
    return supplierData?.onboardingStatus === "approved" ? "/supplier-dashboard" : "/supplier-verification-pending";
  }

  if (user.role === "deliveryPartner") {
    const dpData = await api.deliveryPartners.me().catch(() => null);
    return dpData?.onboardingStatus === "approved" ? "/delivery-dashboard" : "/delivery-verification-pending";
  }

  if (user.role === "corporate") {
    return "/corporate-dashboard";
  }

  if (user.role === "society") {
    return "/society-dashboard";
  }

  return "/dashboard";
}
