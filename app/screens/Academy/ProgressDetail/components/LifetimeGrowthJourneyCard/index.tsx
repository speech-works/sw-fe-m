import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { LifetimeGrowthJourneyResponse } from "../../../../../api/progressReport/types";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

type LifetimeGrowthJourneyCardProps = {
  growthJourney: LifetimeGrowthJourneyResponse | null;
  loading?: boolean;
  hasError?: boolean;
};

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 140;
const PADDING_X = 20;
const PADDING_Y = 18;
const CHART_HEIGHT = VIEWBOX_HEIGHT - 44;

const AXIS_LABELS = {
  mastery: "Mastery",
  ease: "Ease",
  courage: "Courage",
  confidence: "Confidence",
  social: "Social",
} as const;

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) {
    return "";
  }

  return points.reduce(
    (path, point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`,
    "",
  );
};

const LifetimeGrowthJourneyCard = ({
  growthJourney,
  loading = false,
  hasError = false,
}: LifetimeGrowthJourneyCardProps) => {
  const chart = useMemo(() => {
    if (!growthJourney || growthJourney.history.length === 0) {
      return null;
    }

    const step =
      growthJourney.history.length > 1
        ? (VIEWBOX_WIDTH - PADDING_X * 2) / (growthJourney.history.length - 1)
        : 0;

    const points = growthJourney.history.map((point, index) => ({
      ...point,
      x:
        growthJourney.history.length > 1
          ? PADDING_X + step * index
          : VIEWBOX_WIDTH / 2,
      y:
        PADDING_Y +
        (1 - Math.max(0, Math.min(100, point.overallProgressScore)) / 100) *
          CHART_HEIGHT,
    }));

    return {
      points,
      linePath: buildLinePath(points),
    };
  }, [growthJourney]);

  if (loading && !growthJourney) {
    return null;
  }

  if (!growthJourney) {
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

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        <View style={styles.contentLayer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>GROWTH JOURNEY</Text>
              <Text style={styles.headerTitle}>
                {growthJourney.hasComparison
                  ? growthJourney.baselineLabel
                  : "Lifetime baseline is still forming"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {growthJourney.comparisonLabel}
              </Text>
            </View>
            <View style={styles.iconBubble}>
              {hasError ? (
                <Icon
                  name="exclamation-circle"
                  size={14}
                  color="rgba(255,255,255,0.85)"
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <Icon name="chart-line" size={18} color="#FFF" />
            </View>
          </View>

          {chart ? (
            <View style={styles.chartCard}>
              <Svg
                width="100%"
                height={VIEWBOX_HEIGHT}
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              >
                <Defs>
                  <SvgLinearGradient
                    id="lifetime-growth-line"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <Stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                    <Stop offset="100%" stopColor="#FFFFFF" />
                  </SvgLinearGradient>
                </Defs>
                {[0.25, 0.5, 0.75].map((level, index) => (
                  <Rect
                    key={index}
                    x={PADDING_X}
                    y={PADDING_Y + CHART_HEIGHT * level}
                    width={VIEWBOX_WIDTH - PADDING_X * 2}
                    height={1}
                    fill="rgba(255,255,255,0.12)"
                  />
                ))}
                {chart.linePath ? (
                  <Path
                    d={chart.linePath}
                    stroke="url(#lifetime-growth-line)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : null}
                {chart.points.map((point, index) => {
                  const isCurrent = index === chart.points.length - 1;
                  return (
                    <React.Fragment key={point.periodKey}>
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={isCurrent ? 7 : 5}
                        fill="#FFF"
                        stroke="rgba(99,102,241,0.45)"
                        strokeWidth={isCurrent ? 3 : 2}
                      />
                    </React.Fragment>
                  );
                })}
              </Svg>

              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>
                  {format(new Date(growthJourney.history[0].periodStart), "MMM d")}
                </Text>
                <Text style={styles.chartLabel}>Now</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.axisRow}>
            {(Object.entries(growthJourney.current) as [string, number][]).map(([axis, value]) => (
              <View key={axis} style={styles.axisChip}>
                <Text style={styles.axisLabel}>
                  {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
                </Text>
                <Text style={styles.axisValue}>{value}</Text>
              </View>
            ))}
          </View>

          {topPositiveDeltas.length > 0 ? (
            <View style={styles.deltaSection}>
              {topPositiveDeltas.map(([axis, delta]) => (
                <View key={axis} style={styles.deltaPill}>
                  <Text style={styles.deltaAxis}>
                    {AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}
                  </Text>
                  <Text style={styles.deltaValue}>
                    +{delta.absoluteDelta ?? 0} pts
                    {delta.percentDelta !== null ? ` • ${delta.percentDelta}%` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.deltaFallback}>
              <Icon name="compass" size={12} color="rgba(255,255,255,0.78)" />
              <Text style={styles.deltaFallbackText}>
                We’ll compare your long-horizon growth once you have more than one
                saved weekly baseline.
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default LifetimeGrowthJourneyCard;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    backgroundColor: "#E0E7FF",
    overflow: "hidden",
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -100,
    right: -60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -50,
    left: -30,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  contentLayer: {
    gap: 18,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    marginTop: 6,
  },
  headerSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.84)",
    marginTop: 4,
    fontSize: 13,
  },
  iconBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: -2,
  },
  chartLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.72)",
  },
  axisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  axisChip: {
    minWidth: "30%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  axisLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.72)",
    marginBottom: 4,
  },
  axisValue: {
    ...parseTextStyle(theme.typography.Heading4),
    color: "#FFF",
  },
  deltaSection: {
    gap: 10,
  },
  deltaPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  deltaAxis: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 4,
  },
  deltaValue: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.8)",
  },
  deltaFallback: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  deltaFallbackText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
});
