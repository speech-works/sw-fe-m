import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { WeeklyGrowthReport } from "../../../../../api/progressReport/types";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

type WeeklyGrowthCardProps = {
  growth: WeeklyGrowthReport | null;
  loading?: boolean;
  hasError?: boolean;
};

const AXIS_LABELS = {
  mastery: "Mastery",
  ease: "Ease",
  courage: "Courage",
  confidence: "Confidence",
  social: "Social",
} as const;

const getAverageScore = (axes: WeeklyGrowthReport["axes"]["combined"]) =>
  Math.round(
    (axes.mastery + axes.ease + axes.courage + axes.confidence + axes.social) /
      5,
  );

const formatSignedDelta = (value: number | null) => {
  if (value === null || value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${value}`;
};

const WeeklyGrowthCard = ({
  growth,
  loading = false,
  hasError = false,
}: WeeklyGrowthCardProps) => {
  const currentScore = useMemo(
    () => (growth ? getAverageScore(growth.axes.combined) : 0),
    [growth],
  );
  const previousScore = useMemo(() => {
    if (!growth || !growth.comparison.hasComparison) {
      return null;
    }

    const deltas = Object.values(growth.comparison.deltas);
    const previousValues = deltas
      .map((delta) => delta.previous)
      .filter((value): value is number => value !== null);

    if (previousValues.length === 0) {
      return null;
    }

    return Math.round(
      previousValues.reduce((sum, value) => sum + value, 0) /
        previousValues.length,
    );
  }, [growth]);
  const overallDelta = useMemo(() => {
    if (previousScore === null) {
      return null;
    }

    return currentScore - previousScore;
  }, [currentScore, previousScore]);
  const axisComparisons = useMemo(
    () =>
      (Object.entries(growth?.axes.combined ?? {}) as [
        keyof typeof AXIS_LABELS,
        number,
      ][]).map(([axis, value]) => {
        const delta = growth?.comparison.deltas[axis];
        const previousValue = delta?.previous ?? null;
        const markerPosition =
          previousValue === null ? 0 : Math.max(0, Math.min(100, previousValue));
        const currentPosition = Math.max(0, Math.min(100, value));

        return {
          axis,
          label: AXIS_LABELS[axis],
          current: value,
          previous: previousValue,
          deltaLabel:
            delta && delta.hasComparison ? formatSignedDelta(delta.absoluteDelta) : "—",
          markerPosition,
          currentPosition,
        };
      }),
    [growth],
  );
  const changedAxisComparisons = useMemo(
    () =>
      axisComparisons.filter(
        (axis) => axis.previous !== null && axis.current !== axis.previous,
      ),
    [axisComparisons],
  );

  if (loading && !growth) {
    return null;
  }

  if (!growth) {
    return null;
  }

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#22C55E", "#0EA5E9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        <View style={styles.contentLayer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>GROWTH THIS WEEK</Text>
              <Text style={styles.headerTitle}>This week vs last week</Text>
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
              <Icon name="seedling" size={18} color="#FFF" />
            </View>
          </View>

          <View style={styles.heroPanel}>
            <View style={styles.heroScoresRow}>
              <View style={styles.heroScoreBlock}>
                <Text style={styles.comparisonEyebrow}>This week</Text>
                <Text style={styles.heroScoreValue}>{currentScore}</Text>
              </View>
              <View style={styles.heroConnector}>
                <View style={styles.heroConnectorLine} />
                <View style={styles.heroConnectorIcon}>
                  <Icon name="long-arrow-alt-right" size={14} color="#FFF" />
                </View>
              </View>
              <View style={styles.heroScoreBlock}>
                <Text style={styles.comparisonEyebrow}>Last week</Text>
                <Text style={styles.heroScoreValue}>{previousScore ?? "—"}</Text>
              </View>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.deltaChip}>
                <Text style={styles.deltaChipValue}>
                  {overallDelta === null ? "—" : formatSignedDelta(overallDelta)}
                </Text>
                <Text style={styles.deltaChipLabel}>combined</Text>
              </View>
              <View style={styles.momentumChip}>
                <Text style={styles.momentumChipValue}>
                  {growth.meta.momentumState.toLowerCase()}
                </Text>
              </View>
            </View>
          </View>

          {changedAxisComparisons.length > 0 ? (
            <View style={styles.axisPanel}>
              {changedAxisComparisons.map((axis) => (
              <View key={axis.axis} style={styles.axisRow}>
                <View style={styles.axisRowHeader}>
                  <Text style={styles.axisLabel}>{axis.label}</Text>
                  <View style={styles.axisValuesRow}>
                    <Text style={styles.axisPreviousValue}>
                      {axis.previous ?? "—"}
                    </Text>
                    <Icon
                      name="long-arrow-alt-right"
                      size={12}
                      color="rgba(255,255,255,0.52)"
                    />
                    <Text style={styles.axisCurrentValue}>{axis.current}</Text>
                    <Text style={styles.axisDeltaPill}>{axis.deltaLabel}</Text>
                  </View>
                </View>
                <View style={styles.axisTrack}>
                  <View
                    style={[
                      styles.axisTrackFill,
                      { width: `${axis.currentPosition}%` },
                    ]}
                  />
                  {axis.previous !== null ? (
                    <View
                      style={[
                        styles.axisTrackMarker,
                        { left: `${axis.markerPosition}%` },
                      ]}
                    />
                  ) : null}
                </View>
              </View>
              ))}
            </View>
          ) : null}

          {growth.topBreakthroughs.length > 0 ? (
            <View style={styles.breakthroughSection}>
              <Text style={styles.sectionLabel}>Biggest gains</Text>
              <View style={styles.breakthroughRow}>
                {growth.topBreakthroughs.map((item) => (
                  <View key={item.axis} style={styles.breakthroughPill}>
                    <Text style={styles.breakthroughAxis}>{item.label}</Text>
                    <Text style={styles.breakthroughValue}>
                      +{item.absoluteDelta} pts
                      {item.percentDelta !== null
                        ? ` • ${item.percentDelta}%`
                        : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.steadyState}>
              <Icon name="wind" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.steadyStateText}>
                No major changes yet.
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default WeeklyGrowthCard;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
    backgroundColor: "#D1FAE5",
    overflow: "hidden",
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -70,
    right: -60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -60,
    left: -40,
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
  iconBubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroPanel: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
  },
  heroScoresRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  heroScoreBlock: {
    flex: 1,
    gap: 4,
  },
  heroScoreValue: {
    fontSize: 40,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1.2,
  },
  heroConnector: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  heroConnectorLine: {
    position: "absolute",
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  heroConnectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  comparisonEyebrow: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  deltaChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deltaChipValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
  },
  deltaChipLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  momentumChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  momentumChipValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    textTransform: "uppercase",
  },
  axisPanel: {
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
  },
  axisRow: {
    gap: 8,
  },
  axisRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  axisLabel: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  axisValuesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  axisPreviousValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.62)",
  },
  axisCurrentValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFF",
  },
  axisDeltaPill: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.86)",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  axisTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  axisTrackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  axisTrackMarker: {
    position: "absolute",
    top: -1,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "#22C55E",
  },
  breakthroughSection: {
    gap: 10,
  },
  sectionLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  breakthroughRow: {
    gap: 10,
  },
  breakthroughPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 14,
  },
  breakthroughAxis: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 4,
  },
  breakthroughValue: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
  },
  steadyState: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 18,
  },
  steadyStateText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },
});
