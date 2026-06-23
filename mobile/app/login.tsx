import { Redirect, useLocalSearchParams } from "expo-router";
import LoginScreen from "@/src/screens/LoginScreen";

const PARTNER_ROLES = new Set(["Supplier", "Delivery partner", "Partner"]);

export default function LoginRoute() {
  const params = useLocalSearchParams();
  const role = typeof params.role === "string" ? params.role : null;

  if (role && PARTNER_ROLES.has(role)) {
    const partnerRole = role === "Partner" ? "Supplier" : role;
    return <Redirect href={{ pathname: "/partner-login", params: { role: partnerRole } }} />;
  }

  return <LoginScreen />;
}
