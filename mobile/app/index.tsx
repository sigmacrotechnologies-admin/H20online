import React, { useState } from "react";
import RoleSelectionScreen from "@/src/screens/RoleSelectionScreen";
import LoadingScreen from "@/src/screens/LoadingScreen";

export default function IndexRoute() {
  const [loadingDone, setLoadingDone] = useState(false);

  if (!loadingDone) {
    return <LoadingScreen onFinish={() => setLoadingDone(true)} />;
  }
  return <RoleSelectionScreen onReplayLoading={() => setLoadingDone(false)} />;
}
