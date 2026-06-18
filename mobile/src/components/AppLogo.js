import React, { memo } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { glassSurface, surfaceShadow } from "@/src/utils/platformStyles";

const LOGO_SOURCE = require("../../assets/images/h20-logo-light-full.png");

const SIZES = {
  compact: { width: 108, height: 30, padV: 8, padH: 14, radius: 14 },
  header: { width: 108, height: 30, padV: 8, padH: 14, radius: 16 },
  hero: { width: 210, height: 58, padV: 14, padH: 24, radius: 22 },
};

function AppLogo({ size = "header", style, imageStyle }) {
  const dim = SIZES[size] || SIZES.header;

  return (
    <View style={[styles.clip, { borderRadius: dim.radius }, style]}>
      <View
        style={[
          styles.logoGlass,
          glassSurface,
          {
            borderRadius: dim.radius,
            paddingVertical: dim.padV,
            paddingHorizontal: dim.padH,
          },
        ]}
      >
        <Image
          source={LOGO_SOURCE}
          style={[{ width: dim.width, height: dim.height }, imageStyle]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

export default memo(AppLogo);

const styles = StyleSheet.create({
  clip: {
    alignSelf: "center",
    ...(Platform.OS === "android" ? { overflow: "hidden" } : {}),
  },
  logoGlass: {
    alignItems: "center",
    justifyContent: "center",
    ...surfaceShadow("sm"),
  },
});
