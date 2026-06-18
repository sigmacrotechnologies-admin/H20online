import { useCallback } from "react";
import { router, usePathname } from "expo-router";

/** Sensible fallback when there is no navigation history (e.g. after router.replace). */
export const ROUTE_FALLBACKS = {
  "/": "/",
  "/dashboard": "/",
  "/profile": "/dashboard",
  "/order": "/dashboard",
  "/cart": "/order",
  "/checkout": "/cart",
  "/payment": "/checkout",
  "/order-confirmed": "/dashboard",
  "/order-history": "/dashboard",
  "/track-order": "/dashboard",
  "/water-intake": "/dashboard",
  "/plan-subscription": "/dashboard",
  "/billing": "/dashboard",
  "/saved-addresses": "/dashboard",
  "/customer-support": "/profile",
  "/privacy-policy": "/profile",
  "/create-profile": "/",
  "/login": "/",
  "/login-otp": "/login",
  "/forgot-password": "/login",
  "/supplier-dashboard": "/",
  "/supplier-incoming-orders": "/supplier-dashboard",
  "/supplier-order-history": "/supplier-dashboard",
  "/supplier-products": "/supplier-dashboard",
  "/supplier-financials": "/supplier-dashboard",
  "/supplier-wallet": "/supplier-dashboard",
  "/supplier-support": "/supplier-dashboard",
  "/supplier-assign-rider": "/supplier-incoming-orders",
  "/supplier-onboarding": "/",
  "/supplier-onboarding-status": "/",
  "/supplier-verification-pending": "/login",
  "/delivery-dashboard": "/",
  "/delivery-incoming-orders": "/delivery-dashboard",
  "/delivery-subscription-orders": "/delivery-dashboard",
  "/delivery-order-history": "/delivery-dashboard",
  "/delivery-summary": "/delivery-dashboard",
  "/delivery-financials": "/delivery-dashboard",
  "/delivery-help": "/delivery-dashboard",
  "/delivery-profile": "/delivery-dashboard",
  "/delivery-onboarding": "/",
  "/delivery-verification-pending": "/login",
  "/corporate-dashboard": "/",
  "/corporate-order-history": "/corporate-dashboard",
  "/corporate-invoices": "/corporate-dashboard",
  "/corporate-validation": "/corporate-profile",
  "/corporate-profile": "/",
};

export function normalizePath(pathname) {
  if (!pathname) return "";
  const base = String(pathname).split("?")[0];
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function getFallbackForPath(pathname) {
  const path = normalizePath(pathname);
  return ROUTE_FALLBACKS[path] || "/dashboard";
}

export function goBackOr(fallback = "/dashboard") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

export function useAppBack(overrideFallback) {
  const pathname = usePathname();
  return useCallback(() => {
    goBackOr(overrideFallback ?? getFallbackForPath(pathname));
  }, [pathname, overrideFallback]);
}
