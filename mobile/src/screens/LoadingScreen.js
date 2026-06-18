import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AppLogo from "@/src/components/AppLogo";
import DropletOverlay from "@/src/components/modern/DropletOverlay";
import { theme } from "@/src/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOAD_DURATION_MS = 2400;
const DOT_COUNT = 14;

const SPLASH_DROPLETS = [
  { left: 12, top: "8%", width: 22, height: 30, phase: "a" },
  { left: 68, top: "14%", width: 16, height: 22, phase: "b" },
  { left: 148, top: "6%", width: 20, height: 28, phase: "c" },
  { right: 24, top: "10%", width: 18, height: 24, phase: "a" },
  { right: 96, top: "18%", width: 14, height: 20, phase: "b" },
  { left: 36, top: "28%", width: 14, height: 20, phase: "c" },
  { right: 52, top: "32%", width: 22, height: 30, phase: "a" },
  { left: 24, top: "62%", width: 18, height: 24, phase: "b" },
  { right: 18, top: "58%", width: 16, height: 22, phase: "c" },
  { left: 88, top: "72%", width: 14, height: 20, phase: "a" },
  { right: 72, top: "78%", width: 18, height: 24, phase: "b" },
  { left: 44, top: "84%", width: 16, height: 22, phase: "c" },
];

const LOADING_MESSAGES = [
  "Preparing your experience",
  "Syncing hydration tools",
  "Almost ready",
];

function RippleRing({ delay, size }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.38, 0.16, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.28] }) }],
        },
      ]}
    />
  );
}

function ProgressDot({ filled, active }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const scale = active
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1.45] })
    : filled
      ? 1
      : 0.85;

  return (
    <Animated.View
      style={[
        styles.progressDot,
        filled ? styles.progressDotFilled : styles.progressDotEmpty,
        active && styles.progressDotActive,
        {
          opacity: filled ? 1 : active ? 0.72 : 0.28,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function DottedLoader({ filledCount }) {
  const activeIndex = Math.min(DOT_COUNT - 1, filledCount);

  return (
    <View style={styles.dottedTrack}>
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <ProgressDot
          key={`dot-${index}`}
          filled={index < filledCount}
          active={index === activeIndex && filledCount < DOT_COUNT}
        />
      ))}
    </View>
  );
}

export default function LoadingScreen({ onFinish }) {
  const progress = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const loadSkinOpacity = useRef(new Animated.Value(0)).current;
  const loadSkinY = useRef(new Animated.Value(18)).current;
  const [filledCount, setFilledCount] = useState(0);
  const [percent, setPercent] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 48, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(loadSkinOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(loadSkinY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    const progressAnim = Animated.timing(progress, {
      toValue: 1,
      duration: LOAD_DURATION_MS,
      easing: Easing.bezier(0.22, 0.08, 0.24, 1),
      useNativeDriver: false,
    });
    progressAnim.start();

    const progressListener = progress.addListener(({ value }) => {
      const count = Math.min(DOT_COUNT, Math.floor(value * DOT_COUNT + 0.15));
      setFilledCount(count);
      setPercent(Math.min(100, Math.round(value * 100)));
    });

    const messageTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 820);

    const finishTimer = setTimeout(() => onFinish?.(), LOAD_DURATION_MS);

    return () => {
      clearTimeout(finishTimer);
      clearInterval(messageTimer);
      progress.removeListener(progressListener);
    };
  }, [loadSkinOpacity, loadSkinY, logoOpacity, logoScale, onFinish, progress]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.gradientWithEnd} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <DropletOverlay droplets={SPLASH_DROPLETS} />

      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <View style={styles.heroWrap}>
        <RippleRing delay={0} size={200} />
        <RippleRing delay={800} size={240} />
        <RippleRing delay={1600} size={280} />

        <Animated.View
          style={[
            styles.logoStage,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <AppLogo size="hero" />
        </Animated.View>

        <Animated.View
          style={[
            styles.loadSkin,
            {
              opacity: loadSkinOpacity,
              transform: [{ translateY: loadSkinY }],
            },
          ]}
        >
          <Text style={styles.tagline}>Pure water. Delivered fresh.</Text>
          <Text style={styles.loadMessage}>{LOADING_MESSAGES[messageIndex]}</Text>

          <DottedLoader filledCount={filledCount} />

          <View style={styles.loadMetaRow}>
            <Text style={styles.loadHint}>Please wait a moment</Text>
            <Text style={styles.loadPercent}>{percent}%</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.medium,
  },
  glowOrbTop: {
    position: "absolute",
    top: -SCREEN_HEIGHT * 0.08,
    right: -SCREEN_WIDTH * 0.18,
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: SCREEN_WIDTH * 0.36,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  glowOrbBottom: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.12,
    left: -SCREEN_WIDTH * 0.22,
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.58,
    borderRadius: SCREEN_WIDTH * 0.29,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: SCREEN_HEIGHT * 0.04,
  },
  ripple: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  logoStage: {
    alignItems: "center",
  },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: { elevation: 0 },
    }),
  },
  logo: {
    width: 176,
    height: 48,
  },
  loadSkin: {
    width: "100%",
    maxWidth: 340,
    marginTop: 40,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3A4A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 0 },
    }),
  },
  tagline: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  loadMessage: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
  },
  dottedTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  progressDotEmpty: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  progressDotFilled: {
    backgroundColor: "#FFFFFF",
  },
  progressDotActive: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
      android: { elevation: 0 },
    }),
  },
  loadMetaRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
  },
  loadHint: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
  },
  loadPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
