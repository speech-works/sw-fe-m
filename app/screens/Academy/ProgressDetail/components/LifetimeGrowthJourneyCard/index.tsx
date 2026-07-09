import { format } from "date-fns";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LifetimeGrowthJourneyResponse } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
  Icon,
  icons,
} from "../../../../../design-system";

type LifetimeGrowthJourneyCardProps = {
  growthJourney: LifetimeGrowthJourneyResponse | null;
  loading?: boolean;
  hasError?: boolean;
};

// Same construction as the weekly RhythmLine (DetailedWeeklySummary).
const CHART_W = 320;
const CHART_H = 88;
const CHART_PAD_Y = 14;

const AXIS_LABELS = {
  mastery: "Mastery",
  ease: "Ease",
  courage: "Courage",
  confidence: "Confidence",
  social: "Social",
} as const;

/** Catmull-Rom → cubic-bezier smoothing. */
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

const LifetimeGrowthJourneyCard = ({
  growthJourney,
  loading = false,
  hasError = false,
}: LifetimeGrowthJourneyCardProps) => {
  const { colors } = useTheme();
  // On-surface accent (stroke/dot/"Now" text) needs the per-scheme legible cut,
  // not the bright fill hue, to pass AA on the light paper canvas.
  const accent = colors.feedback.successText;

  const chart = useMemo(() => {
    if (!growthJourney || growthJourney.history.length === 0) return null;
    const n = growthJourney.history.length;
    const innerH = CHART_H - CHART_PAD_Y * 2;
    const points = growthJourney.history.map((point, index) => ({
      ...point,
      x: (CHART_W / n) * (index + 0.5),
      y:
        CHART_PAD_Y +
        (1 - Math.max(0, Math.min(100, point.overallProgressScore)) / 100) * innerH,
    }));
    return { points, linePath: buildSmoothPath(points) };
  }, [growthJourney]);

  if ((loading && !growthJourney) || !growthJourney) {
    return null;
  }

  const topPositiveDeltas = Object.entries(growthJourney.deltas)
    .filter(([, delta]) => (delta.percentDelta ?? delta.absoluteDelta ?? 0) > 0)
    .sort(
      (left, right) =>
        (right[1].percentDelta ?? right[1].absoluteDelta ?? 0) -
        (left[1].percentDelta ?? left[1].absoluteDelta ?? 0),
    )
    .slice(0, 3);

  const headerTitle = growthJourney.hasComparison
    ? growthJourney.baselineLabel
    : "Lifetime baseline is still forming";
  const headerSubtitle =
    growthJourney.comparisonLabel === headerTitle ? null : growthJourney.comparisonLabel;

  const lastPoint = chart?.points[chart.points.length - 1];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>GROWTH JOURNEY</Text>
          <Text variant="h3">{headerTitle}</Text>
          {headerSubtitle ? (
            <Text variant="bodySm" color="secondary">{headerSubtitle}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {hasError ? (
            <Icon name={icons.warning} size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          ) : null}
          <Icon name={icons.growthSeed} size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      {chart ? (
        <View>
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            {chart.linePath ? (
              <Path
                d={chart.linePath}
                stroke={accent}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
            {lastPoint ? (
              <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={accent} />
            ) : null}
          </Svg>

          <View style={styles.chartLabels}>
            <Text variant="caption" color="tertiary">
              {format(new Date(growthJourney.history[0].periodStart), "MMM d")}
            </Text>
            <Text variant="caption" color={accent}>Now</Text>
          </View>
        </View>
      ) : null}

      {/* Current dimension scores */}
      <View style={styles.axisRow}>
        {(Object.entries(growthJourney.current) as [string, number][]).map(([axis, value]) => (
          <View key={axis} style={[styles.axisChip, { backgroundColor: colors.surface.default, borderColor: colors.border.hairline }]}>
            <Text variant="caption" color="tertiary">
              {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
            </Text>
            <Text variant="h3">{value}</Text>
          </View>
        ))}
      </View>

      {/* Top long-range gains */}
      {topPositiveDeltas.length > 0 ? (
        <View style={styles.deltaSection}>
          {topPositiveDeltas.map(([axis, delta]) => (
            <View key={axis} style={[styles.deltaPill, { backgroundColor: colors.surface.control }]}>
              <Text variant="bodySm" style={styles.bold}>
                {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
              </Text>
              <Text variant="bodySm" color={colors.feedback.successText} style={styles.bold}>
                +{delta.absoluteDelta ?? 0}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.fallback, { backgroundColor: colors.surface.default, borderColor: colors.border.hairline }]}>
          <Text variant="bodySm" color="secondary">
            Long-range comparison appears after another saved baseline.
          </Text>
        </View>
      )}
    </View>
  );
};

export default LifetimeGrowthJourneyCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    gap: spacing["2xl"],
  },
  flex1: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.xxs },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerErrorIcon: { marginRight: spacing.sm },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  axisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  axisChip: {
    flexGrow: 1,
    minWidth: "30%",
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xxs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deltaSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  deltaPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fallback: {
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
