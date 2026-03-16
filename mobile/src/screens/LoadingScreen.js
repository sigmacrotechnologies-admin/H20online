import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/src/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOAD_DURATION_MS = 2000;

export default function LoadingScreen({ onFinish }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: LOAD_DURATION_MS,
      useNativeDriver: false,
    });
    anim.start();
    const t = setTimeout(() => {
      onFinish?.();
    }, LOAD_DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish, progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradientWithEnd}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle pattern - circles */}
      <View style={styles.pattern}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
        <View style={[styles.circle, styles.circle4]} />
        <View style={[styles.circle, styles.circle5]} />
        <View style={[styles.circle, styles.circle6]} />
        <View style={[styles.circle, styles.circle7]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/H2-Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.loadBarBg}>
          <Animated.View style={[styles.loadBarFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.medium,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  circle1: { width: 120, height: 120, top: "15%", left: "10%" },
  circle2: { width: 80, height: 80, top: "25%", right: "15%" },
  circle3: { width: 60, height: 60, bottom: "35%", left: "20%" },
  circle4: { width: 100, height: 100, bottom: "25%", right: "5%" },
  circle5: { width: 50, height: 50, top: "50%", left: "5%" },
  circle6: { width: 70, height: 70, top: "60%", right: "20%" },
  circle7: { width: 90, height: 90, bottom: "15%", left: "35%" },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoWrap: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 90,
    marginBottom: 48,
    elevation: 2,
  },
  logo: {
    width: 140,
    height: 140,
  },
  loadBarBg: {
    width: SCREEN_WIDTH - 80,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 3,
    overflow: "hidden",
  },
  loadBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
});
