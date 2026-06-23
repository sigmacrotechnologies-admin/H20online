import ProfileScreen from "@/src/screens/ProfileScreen";
import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function ProfileRoute() {
  const { user } = useAuth();
  if (user?.role === "society") {
    return <Redirect href="/society-profile" />;
  }
  return <ProfileScreen />;
}
