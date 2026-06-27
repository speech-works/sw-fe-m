import React, { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/FontAwesome5";
import { WeeklyDistribution } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
  Skeleton,
} from "../../../../../design-system";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 20; // also drives the chart-width math below
const CHART_SIZE = SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2;
const DONUT = 200;
const HOLE = 104;

type ContentTypeKey =
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "FUN_PRACTICE"
  | "READING_PRACTICE";

/** Practice content types → our practice-category hues. */
const CATEGORY_KEY: Record<ContentTypeKey, "reading" | "exposure" | "fun" | "mirror"> = {
  READING_PRACTICE: "reading",
  COGNITIVE_PRACTICE: "mirror",
  EXPOSURE_PRACTICE: "exposure",
  FUN_PRACTICE: "fun",
};

const LABELS: Record<ContentTypeKey, string> = {
  COGNITIVE_PRACTICE: "Cognitive",
  EXPOSURE_PRACTICE: "Exposure",
  FUN_PRACTICE: "Fun",
  READING_PRACTICE: "Reading",
};

const formatTime = (timeInMinutes: number) => {
  if (timeInMinutes < 60) return `${Math.round(timeInMinutes)}m`;
  return `${(timeInMinutes / 60).toFixed(1)}h`;
};

export const DPSummarySkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Skeleton width={140} height={12} />
          <Skeleton width={180} height={14} />
        </View>
        <Skeleton width={20} height={20} />
      </View>
      <View style={styles.donutWrap}>
        <Skeleton width={DONUT} height={DONUT} radius={DONUT / 2} />
      </View>
      <View style={styles.legend}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={"100%"} height={20} />
        ))}
      </View>
    </View>
  );
};

type DPSummaryProps = {
  distribution: WeeklyDistribution | null;
  timeframe: "weekly" | "lifetime";
  loading?: boolean;
  hasError?: boolean;
};

const DPSummary = ({
  distribution,
  timeframe,
  loading = false,
  hasError = false,
}: DPSummaryProps) => {
  const { colors } = useTheme();

  const { chartData, totalPracticeTime } = useMemo(() => {
    if (!distribution || Object.keys(distribution).length === 0)
      return { chartData: [], totalPracticeTime: 0 };

    const overallTotalTime = Object.values(distribution).reduce(
      (sum, v) => sum + v,
      0,
    );

    const dataForChart = (Object.entries(distribution) as [string, number][])
      .filter(([, v]) => v > 0)
      .map(([key, totalTime]) => {
        const contentType = key as ContentTypeKey;
        const catKey = CATEGORY_KEY[contentType];
        return {
          name: LABELS[contentType] || key,
          totalTime,
          color: catKey ? colors.category[catKey] : colors.text.tertiary,
        };
      });

    return { chartData: dataForChart, totalPracticeTime: overallTotalTime };
  }, [distribution, colors]);

  if (loading && !distribution) {
    return <DPSummarySkeleton />;
  }

  if (!distribution) {
    return null;
  }

  const hasData = chartData.length > 0 && totalPracticeTime > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            PRACTICE DISTRIBUTION
          </Text>
          <Text variant="bodySm" color="secondary">
            {timeframe === "weekly"
              ? "Category breakdown this week"
              : "All-time category breakdown"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {hasError ? (
            <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          ) : null}
          <Icon name="chart-pie" size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      {hasData ? (
        <>
          {/* Donut */}
          <View style={styles.donutWrap}>
            <PieChart
              data={chartData.map((item) => ({
                name: item.name,
                population: item.totalTime,
                color: item.color,
                legendFontColor: colors.text.primary,
                legendFontSize: 12,
              }))}
              width={CHART_SIZE}
              height={DONUT}
              chartConfig={{ color: () => colors.text.primary }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft={(CHART_SIZE / 4).toString()}
              hasLegend={false}
              center={[0, 0]}
              absolute
            />
            <View style={[styles.donutHole, { backgroundColor: colors.surface.elevated }]}>
              <Text variant="caption" color="tertiary" style={styles.totalLabel}>
                TOTAL
              </Text>
              <Text variant="h3">{formatTime(totalPracticeTime)}</Text>
            </View>
          </View>

          {/* Legend — dot · name · time · % */}
          <View style={styles.legend}>
            {chartData.map((item) => {
              const pct = Math.round((item.totalTime / totalPracticeTime) * 100);
              return (
                <View key={item.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text variant="body" style={styles.legendName}>{item.name}</Text>
                  <Text variant="bodySm" color="secondary">{formatTime(item.totalTime)}</Text>
                  <Text variant="body" style={styles.legendPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="chart-pie" size={40} color={colors.text.tertiary} />
          <Text variant="bodySm" color="secondary">No practice data found</Text>
        </View>
      )}
    </View>
  );
};

export default DPSummary;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xxs,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerErrorIcon: {
    marginRight: spacing.sm,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: DONUT,
    position: "relative",
  },
  donutHole: {
    position: "absolute",
    width: HOLE,
    height: HOLE,
    borderRadius: HOLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  totalLabel: {
    letterSpacing: 1,
  },
  legend: {
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
  },
  legendPct: {
    minWidth: 44,
    textAlign: "right",
    fontFamily: fonts.bold,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["4xl"],
    gap: spacing.md,
  },
});
