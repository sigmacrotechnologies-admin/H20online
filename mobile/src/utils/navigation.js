import { useCallback } from "react";
import { router, usePathname } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

/** Sensible fallback when there is no navigation history (e.g. after router.replace). */
export const ROUTE_FALLBACKS = {
  "/": "/",
  "/dashboard": "/",
  "/society-dashboard": "/",
  "/society-profile": "/society-dashboard",
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
  "/supplier-plan": "/supplier-dashboard",
  "/supplier-plan-subscription": "/supplier-plan",
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

export function getFallbackForPath(pathname, user) {
  const path = normalizePath(pathname);
  let fb = ROUTE_FALLBACKS[path] || "/dashboard";
  if (user?.role === "society") {
    if (fb === "/dashboard") fb = "/society-dashboard";
    if (fb === "/profile") fb = "/society-profile";
  }
  return fb;
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
  const { user } = useAuth();
  return useCallback(() => {
    goBackOr(overrideFallback ?? getFallbackForPath(pathname, user));
  }, [pathname, overrideFallback, user]);
}
