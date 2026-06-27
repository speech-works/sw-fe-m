import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { WeeklyGrowthReport } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
} from "../../../../../design-system";

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
  if (value === null || value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value}`;
};

const WeeklyGrowthCard = ({
  growth,
  loading = false,
  hasError = false,
}: WeeklyGrowthCardProps) => {
  const { colors } = useTheme();

  const currentScore = useMemo(
    () => (growth ? getAverageScore(growth.axes.combined) : 0),
    [growth],
  );
  const previousScore = useMemo(() => {
    if (!growth || !growth.comparison.hasComparison) return null;
    const deltas = Object.values(growth.comparison.deltas);
    const previousValues = deltas
      .map((delta) => delta.previous)
      .filter((value): value is number => value !== null);
    if (previousValues.length === 0) return null;
    return Math.round(
      previousValues.reduce((sum, value) => sum + value, 0) /
        previousValues.length,
    );
  }, [growth]);
  const overallDelta = useMemo(() => {
    if (previousScore === null) return null;
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
          deltaValue: delta && delta.hasComparison ? delta.absoluteDelta : null,
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

  if (loading && !growth) return null;
  if (!growth) return null;

  const deltaColor = (v: number | null) =>
    v === null || v === 0
      ? colors.text.tertiary
      : v > 0
        ? colors.feedback.successText
        : colors.feedback.dangerText;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            PROFILE COMPARISON
          </Text>
          <Text variant="h3">{growth.comparison.comparisonLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          {hasError ? (
            <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          ) : null}
          <Icon name="seedling" size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      {/* Comparison numbers */}
      <View>
        <View style={styles.eyebrowRow}>
          <Text variant="caption" color="tertiary" style={[styles.eyebrow, styles.flex1]}>Current profile</Text>
          <View style={styles.connectorSpacer} />
          <Text variant="caption" color="tertiary" style={[styles.eyebrow, styles.flex1]}>Previous week</Text>
        </View>
        <View style={styles.numbersRow}>
          <Text variant="display" style={styles.flex1}>{currentScore}</Text>
          <View style={[styles.connector, { backgroundColor: colors.surface.control }]}>
            <Icon name="long-arrow-alt-right" size={14} color={colors.text.secondary} />
          </View>
          <Text variant="display" style={styles.flex1}>{previousScore ?? "—"}</Text>
        </View>
      </View>

      {/* Overall change + Momentum — same stat-card style as the weekly card */}
      <View style={styles.metaRow}>
        <View style={[styles.statChip, { backgroundColor: colors.surface.default }]}>
          <Text variant="h1" color={deltaColor(overallDelta)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {overallDelta === null ? "—" : formatSignedDelta(overallDelta)}
          </Text>
          <Text variant="bodySm" color="secondary" style={styles.bold}>Overall change</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.surface.default }]}>
          <Text variant="h1" style={styles.capitalize} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {growth.meta.momentumState.toLowerCase()}
          </Text>
          <Text variant="bodySm" color="secondary" style={styles.bold}>Momentum</Text>
        </View>
      </View>

      {/* Changed axes */}
      {changedAxisComparisons.length > 0 ? (
        <View style={styles.axisPanel}>
          {changedAxisComparisons.map((axis) => (
            <View key={axis.axis} style={styles.axisRow}>
              <View style={styles.axisRowHeader}>
                <Text variant="body" style={styles.bold}>{axis.label}</Text>
                <View style={styles.axisValuesRow}>
                  <Text variant="bodySm" color="tertiary">{axis.previous ?? "—"}</Text>
                  <Icon name="long-arrow-alt-right" size={12} color={colors.text.tertiary} />
                  <Text variant="body" style={styles.bold}>{axis.current}</Text>
                  <View style={[styles.deltaPill, { backgroundColor: colors.surface.control }]}>
                    <Text variant="caption" color={deltaColor(axis.deltaValue)} style={styles.bold}>
                      {axis.deltaLabel}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surface.control }]}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${axis.currentPosition}%`, backgroundColor: colors.accent.success },
                  ]}
                />
                {axis.previous !== null ? (
                  <View
                    style={[
                      styles.trackMarker,
                      { left: `${axis.markerPosition}%`, backgroundColor: colors.text.primary, borderColor: colors.surface.elevated },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.steadyState, { backgroundColor: colors.surface.default }]}>
          <Icon name="wind" size={12} color={colors.text.tertiary} />
          <Text variant="bodySm" color="secondary" style={styles.flex1}>
            No major changes yet.
          </Text>
        </View>
      )}
    </View>
  );
};

export default WeeklyGrowthCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    gap: spacing["2xl"],
  },
  flex1: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  eyebrow: { letterSpacing: 0.8, textTransform: "uppercase" },
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
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  connectorSpacer: {
    width: 28,
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  connector: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statChip: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  capitalize: { textTransform: "capitalize" },
  axisPanel: {
    gap: spacing.lg,
  },
  axisRow: {
    gap: spacing.sm,
  },
  axisRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  axisValuesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deltaPill: {
    minWidth: 32,
    alignItems: "center",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: "visible",
    justifyContent: "center",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.full,
  },
  trackMarker: {
    position: "absolute",
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  steadyState: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
