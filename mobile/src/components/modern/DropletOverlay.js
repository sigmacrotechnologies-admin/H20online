import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_DROPLETS = [
  { left: -8, top: 18, width: 16, height: 22, phase: "a" },
  { left: 22, top: 58, width: 14, height: 20, phase: "b" },
  { left: 56, top: 20, width: 18, height: 24, phase: "c" },
  { left: 92, top: 86, width: 14, height: 20, phase: "a" },
  { right: 118, top: 68, width: 14, height: 20, phase: "a" },
  { right: 82, top: 30, width: 16, height: 22, phase: "b" },
  { right: 46, top: 94, width: 14, height: 20, phase: "c" },
  { right: 10, top: 54, width: 16, height: 22, phase: "a" },
];

export default function DropletOverlay({ droplets = DEFAULT_DROPLETS }) {
  const dropletAnimA = useRef(new Animated.Value(0)).current;
  const dropletAnimB = useRef(new Animated.Value(0)).current;
  const dropletAnimC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(dropletAnimA, 3400);
    const b = loop(dropletAnimB, 4200);
    const c = loop(dropletAnimC, 3800);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [dropletAnimA, dropletAnimB, dropletAnimC]);

  const getDropletAnim = (phase) => (phase === "b" ? dropletAnimB : phase === "c" ? dropletAnimC : dropletAnimA);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {droplets.map((drop, idx) => {
        const dropAnim = getDropletAnim(drop.phase);
        return (
          <Animated.View
            key={`drop-${idx}`}
            style={[
              styles.dropletWrap,
              {
                left: drop.left,
                right: drop.right,
                top: drop.top,
                width: drop.width,
                height: drop.height,
                opacity: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.28] }),
                transform: [
                  { translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
                  { scale: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) },
                ],
              },
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 60 80">
              <Path d="M30 6 C47 24 57 41 57 54 C57 69 45 78 30 78 C15 78 3 69 3 54 C3 41 13 24 30 6 Z" fill="rgba(255,255,255,0.28)" />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  dropletWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
});
