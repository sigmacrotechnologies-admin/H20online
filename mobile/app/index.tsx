import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import RoleSelectionScreen from "@/src/screens/RoleSelectionScreen";
import LoadingScreen from "@/src/screens/LoadingScreen";
import { useAuth } from "@/src/context/AuthContext";
import { resolveHomeRoute } from "@/src/utils/authRouting";
import { theme } from "@/src/theme";

export default function IndexRoute() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const redirecting = useRef(false);

  useEffect(() => {
    if (!splashDone || authLoading || !isAuthenticated || redirecting.current) return;
    redirecting.current = true;
    (async () => {
      const route = await resolveHomeRoute(user);
      router.replace(route);
    })();
  }, [splashDone, authLoading, isAuthenticated, user, router]);

  if (!splashDone) {
    return <LoadingScreen onFinish={() => setSplashDone(true)} />;
  }

  if (authLoading || isAuthenticated) {
    return (
      <View style={styles.bootWrap}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <RoleSelectionScreen
      onReplayLoading={() => {
        setSplashDone(false);
        redirecting.current = false;
      }}
    />
  );
}

const styles = StyleSheet.create({
  bootWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.screenBackground,
  },
});
