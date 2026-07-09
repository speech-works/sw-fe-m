import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { duration, easing } from "../motion";
import { spacing } from "../primitives/scale";
import { withAlpha } from "../utils/color";
import { Text } from "./Text";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Logical viewBox — the SVG scales to its container via width="100%".
const VW = 320;
const PAD_Y = 10;

export interface TrendLineProps {
  /** Per-week values; `null` marks a missing week (the line spans the gap). */
  data: (number | null)[];
  /** Optional x-axis labels rendered under the points. */
  labels?: string[];
  /** Stroke, endpoint dot, and area-fill accent. */
  color: string;
  min?: number;
  max?: number;
  height?: number;
  /** Soft area gradient under the line (default true). */
  fill?: boolean;
  /** Draw the stroke on mount (default true; skipped under reduced motion). */
  animate?: boolean;
}

/** Catmull-Rom → cubic-bezier smoothing — the app's signature trend curve. */
const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

/**
 * A smooth line/area trend chart — the reusable version of the hand-rolled curves
 * in Progress Report (`RhythmLine`, `LifetimeGrowthJourneyCard`). Points sit in
 * centered slots (so end labels stay inside), the current point gets an emphasized
 * dot, and the stroke draws on from the left. Renders nothing when there's no data
 * (the caller owns the empty state).
 */
export const TrendLine: React.FC<TrendLineProps> = ({
  data,
  labels,
  color,
  min = 0,
  max = 100,
  height = 120,
  fill = true,
  animate = true,
}) => {
  const reduced = useReducedMotion();
  const n = data.length;
  const innerH = height - PAD_Y * 2;
  const span = Math.max(1, max - min);

  // Keep each value's slot x (so labels line up) but only plot present points.
  const points = data
    .map((value, i) =>
      value == null
        ? null
        : {
            x: (VW * (i + 0.5)) / n,
            y:
              PAD_Y +
              innerH -
              ((Math.max(min, Math.min(max, value)) - min) / span) * innerH,
          },
    )
    .filter((p): p is { x: number; y: number } => p !== null);

  // Approximate curve length for the draw-on dash (segment sum + slack).
  const pathLen =
    points.reduce((sum, p, i) => {
      if (i === 0) return sum;
      const prev = points[i - 1];
      return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
    }, 0) * 1.15 || 1;

  const offset = useSharedValue(animate && !reduced ? pathLen : 0);
  useEffect(() => {
    offset.value =
      animate && !reduced
        ? withTiming(0, { duration: duration.reveal, easing: easing.out })
        : 0;
  }, [pathLen, animate, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const strokeProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  if (points.length === 0) return null;

  const linePath = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const baseline = PAD_Y + innerH;
  const areaPath =
    points.length > 1
      ? `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
      : "";

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VW} ${height}`}>
        {fill && areaPath ? (
          <>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                {/* Soft wash, not a slab — flat data would otherwise fill a block. */}
                <Stop offset="0" stopColor={withAlpha(color, 0.12)} />
                <Stop offset="1" stopColor={withAlpha(color, 0)} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#trendFill)" />
          </>
        ) : null}
        {points.length > 1 ? (
          <AnimatedPath
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            animatedProps={strokeProps}
          />
        ) : null}
        <Circle cx={last.x} cy={last.y} r={4} fill={color} />
      </Svg>

      {labels && labels.length === n ? (
        <View style={styles.labels}>
          {labels.map((label, i) => (
            <Text
              key={`${i}-${label}`}
              variant="caption"
              color={i === n - 1 ? "secondary" : "tertiary"}
              center
              style={styles.label}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  labels: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  label: {
    flex: 1,
  },
});
