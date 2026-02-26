import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, ClipPath, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DROPLET_WIDTH = 120;
const DROPLET_HEIGHT = 160;
const VIEWBOX = `0 0 ${DROPLET_WIDTH} ${DROPLET_HEIGHT}`;
const WAVE_AMP = 4;
const WAVE_FREQ = 0.08;

// Teardrop path: point at top, rounded bottom
function getDropletPath() {
  const w = DROPLET_WIDTH;
  const h = DROPLET_HEIGHT;
  const cx = w / 2;
  return `M ${cx} 4 C ${w * 0.92} ${h * 0.25} ${w} ${h * 0.55} ${w * 0.85} ${h * 0.82} C ${w * 0.7} ${h * 0.98} ${cx} ${h - 2} ${w * 0.15} ${h * 0.82} C 0 ${h * 0.55} ${w * 0.08} ${h * 0.25} ${cx} 4 Z`;
}

// Build water path with wavy top (phase in radians)
function buildWaterPath(fillTop, phase) {
  "worklet";
  const w = DROPLET_WIDTH;
  const h = DROPLET_HEIGHT;
  let d = `M 0 ${h} L ${w} ${h} L ${w} ${fillTop + WAVE_AMP * 2} `;
  for (let x = w; x >= 0; x -= 4) {
    const y = fillTop + WAVE_AMP + WAVE_AMP * Math.sin(x * WAVE_FREQ + phase);
    d += `L ${x} ${y} `;
  }
  d += `L 0 ${fillTop + WAVE_AMP * 2} Z`;
  return d;
}

export default function WaterDroplet({ percentage = 50, volumeText = "", goalText = "" }) {
  const pct = Math.min(100, Math.max(0, Number(percentage) || 0));
  const fillTopY = DROPLET_HEIGHT * (1 - pct / 100);
  const wavePhase = useSharedValue(0);
  const fillTop = useSharedValue(fillTopY);

  useEffect(() => {
    fillTop.value = fillTopY;
  }, [fillTopY, fillTop]);

  useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, [wavePhase]);

  const animatedWaterProps = useAnimatedProps(() => {
    const phase = wavePhase.value;
    const top = fillTop.value;
    return { d: buildWaterPath(top, phase) };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={DROPLET_WIDTH} height={DROPLET_HEIGHT} viewBox={VIEWBOX} style={styles.svg}>
        <Defs>
          <ClipPath id="dropletClip">
            <Path d={getDropletPath()} />
          </ClipPath>
        </Defs>
        {/* Light blue droplet outline / empty fill */}
        <Path
          d={getDropletPath()}
          fill="#A5D6FA"
          stroke="#93C5FD"
          strokeWidth={1.5}
        />
        {/* Water fill with wavy top - clipped by droplet */}
        <G clipPath="url(#dropletClip)">
          <AnimatedPath fill="#0EA5E9" animatedProps={animatedWaterProps} />
        </G>
      </Svg>
      <View style={styles.textOverlay} pointerEvents="none">
        <Text style={styles.percentText}>{Math.round(pct)}%</Text>
        {volumeText ? <Text style={styles.volumeText}>{volumeText}</Text> : null}
        {goalText ? <Text style={styles.goalText}>{goalText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: DROPLET_WIDTH,
    height: DROPLET_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  textOverlay: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  percentText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  volumeText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 2,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  goalText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    marginTop: 0,
  },
});
