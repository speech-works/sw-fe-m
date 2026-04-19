import { addDays, format, startOfWeek } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  FlowComparisonSummary,
  WeeklyStat,
} from "../../../../../api/stats/types";
import ExplorerFace from "../../../../../assets/sw-faces/ExplorerFace";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { getFlowBenchmarkCopy } from "../../../../../util/flowBenchmark";

// Reusable Pulse Component for "Sonar" effect
const PulseCircle = ({ delay = 0, color = "rgba(255,255,255,0.3)" }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.8, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

interface Props {
  data: WeeklyStat[];
  comparison?: FlowComparisonSummary | null;
  comparisonLabel?: string;
  // Customization Props
  title?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  showTitle?: boolean;
  backgroundColor?: string;
  contentColor?: string; // For text/axis
  barColor?: string; // NEW: Override bar colors (e.g. white)
}

const BAR_RADIUS = 8;
const EMPTY_DUMMY_VALUES = [35, 60, 25, 65, 40, 55, 30]; // Nice distribution

const PracticeBarChartKit: React.FC<Props> = ({
  data,
  comparison,
  comparisonLabel = "This week so far • benchmarked against last week",
  title = "Weekly Activity",
  emptyTitle = "No activity yet",
  emptySubtitle = "Start your first session",
  showTitle = true,
  backgroundColor = "#fff3ed",
  contentColor = "#333",
  barColor, // NEW
}) => {
  const [chartWidth, setChartWidth] = useState(0);

  // 1) Process Real Data (Memoized)
  const { displayValues, isEmpty, totalMinutes, labels } = useMemo(() => {
    const dayMap = new Map<number, number>();
    data.forEach(({ date, totalTime }) => {
      const d = new Date(date);
      dayMap.set(d.getDay(), Math.round(totalTime));
    });

    // Display order Mon(1) → Sun(0)
    const order = [1, 2, 3, 4, 5, 6, 0] as const;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const labels = order.map((dayOffset) =>
      format(addDays(weekStart, dayOffset - 1), "EEE")
    );

    const realValues = order.map((wd) => dayMap.get(wd) ?? 0);
    const totalMinutes = realValues.reduce((sum, v) => sum + v, 0);
    const isEmpty = totalMinutes === 0;

    return {
      displayValues: isEmpty ? EMPTY_DUMMY_VALUES : realValues,
      isEmpty,
      totalMinutes,
      labels,
    };
  }, [data]);

  // 2) Per-bar colors (Memoized)
  const chartData = useMemo(() => {
    const todayIdx = new Date().getDay();
    const yesterdayIdx = (todayIdx + 6) % 7;
    const order = [1, 2, 3, 4, 5, 6, 0] as const;

    const getColors = () => {
      if (isEmpty) {
        return displayValues.map(
          () =>
            (opacity = 1) =>
              contentColor === "#333"
                ? `rgba(0,0,0, 0.06)`
                : `rgba(255,255,255, 0.15)`
        );
      }
      return order.map((wd) => (opacity = 1) => {
        if (barColor) {
          if (wd === todayIdx) return `rgba(255,255,255, 1)`;
          if (wd === yesterdayIdx) return `rgba(255,255,255, 0.7)`;
          return `rgba(255,255,255, 0.4)`;
        }
        if (wd === todayIdx) return `rgba(169,65,3,${opacity})`;
        if (wd === yesterdayIdx) return `rgba(215,108,43,${opacity})`;
        return `rgba(253,220,198,${opacity})`;
      });
    };

    return {
      labels,
      datasets: [{ data: displayValues, colors: getColors() }],
    };
  }, [displayValues, isEmpty, contentColor, barColor, labels]); // displayValues depends on data, so this updates when data updates

  // 3) Chart config (Memoized)
  const isTransparent = backgroundColor === "transparent";
  const containerStyle = isTransparent
    ? styles.transparentContainer
    : { backgroundColor };

  // Helper for Chart Transparency
  const transparentColor = "rgba(0, 0, 0, 0)";

  const chartConfig = useMemo(() => {
    return {
      backgroundGradientFrom: isTransparent
        ? transparentColor
        : backgroundColor,
      backgroundGradientTo: isTransparent ? transparentColor : backgroundColor,
      backgroundGradientFromOpacity: 0,
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) =>
        contentColor === "#333"
          ? `rgba(0,0,0,${opacity * (isEmpty ? 0.3 : 0.7)})`
          : `rgba(255,255,255,${opacity * (isEmpty ? 0.5 : 0.7)})`,
      strokeWidth: 0,
      barPercentage: 0.5,
      decimalPlaces: 0,
      propsForBackgroundLines: {
        stroke:
          contentColor === "#333"
            ? "rgba(0,0,0,0.04)"
            : "rgba(255,255,255,0.08)",
        strokeWidth: 0.5,
        strokeDasharray: "3, 6",
      },
      fillShadowGradientOpacity: 1,
      yAxisLabel: "",
      yAxisSuffix: "m",
      barRadius: BAR_RADIUS,
      contentInset: { top: 0, bottom: BAR_RADIUS },
      propsForLabels: {
        fontSize: 10,
        fontWeight: "500",
      },
    };
  }, [backgroundColor, isTransparent, contentColor, isEmpty]);

  // 6) Measure chart width
  const onLayout = (e: LayoutChangeEvent) =>
    setChartWidth(e.nativeEvent.layout.width);

  const benchmarkCopy = getFlowBenchmarkCopy(comparison, "minutes", {
    compact: false,
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {showTitle && (
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              {
                color:
                  contentColor === "#333" ? "#555" : "rgba(255,255,255,0.7)",
              },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.comparisonBasisText,
              {
                color:
                  contentColor === "#333" ? "#666" : "rgba(255,255,255,0.75)",
              },
            ]}
          >
            {comparisonLabel}
          </Text>
        </View>
      )}

      {/* Header Info (Total + Percent) */}
      {!isEmpty && (
        <>
          <Text style={styles.total}>
            <Text
              style={[
                styles.bold,
                { color: contentColor === "#333" ? "#333" : "#FFF" },
              ]}
            >
              {totalMinutes}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: contentColor === "#333" ? "#333" : "#FFF",
              }}
            >
              m
            </Text>
          </Text>
          <Text
            style={[
              styles.percent,
              { color: contentColor === "#333" ? "#555" : "#94A3B8" },
            ]}
          >
            {benchmarkCopy.primary}
          </Text>
          {benchmarkCopy.secondary ? (
            <Text
              style={[
                styles.comparisonSecondaryText,
                { color: contentColor === "#333" ? "#666" : "#CBD5E1" },
              ]}
            >
              {benchmarkCopy.secondary}
            </Text>
          ) : null}
        </>
      )}

      {/* Main Content Area: Chart OR Empty State */}
      <View
        onLayout={onLayout}
        style={[styles.chartWrapper, { overflow: "hidden", minHeight: 200 }]}
      >
        {!isEmpty ? (
          chartWidth > 0 && (
            <BarChart
              data={chartData}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              fromZero
              withCustomBarColorFromData
              flatColor
              yAxisLabel=""
              yAxisSuffix="m"
              style={{
                backgroundColor: transparentColor,
              }}
            />
          )
        ) : (
          /* EMPTY STATE: Sonar Pulse Animation */
          <View style={[StyleSheet.absoluteFill, styles.centeredOverlay]}>
            {/* Pulse Effects */}
            <PulseCircle
              delay={0}
              color={
                contentColor === "#333"
                  ? "rgba(255,100,0,0.1)"
                  : "rgba(255,255,255,0.15)"
              }
            />
            <PulseCircle
              delay={1000}
              color={
                contentColor === "#333"
                  ? "rgba(255,100,0,0.1)"
                  : "rgba(255,255,255,0.15)"
              }
            />
            <PulseCircle
              delay={2000}
              color={
                contentColor === "#333"
                  ? "rgba(255,100,0,0.1)"
                  : "rgba(255,255,255,0.15)"
              }
            />

            <ExplorerFace size={84} shouldAnimate loop />

            <View style={styles.emptyTextContainer}>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      contentColor === "#333"
                        ? theme.colors.text.title
                        : "#FFF",
                  },
                ]}
              >
                {emptyTitle}
              </Text>
              <Text
                style={[
                  styles.emptySubText,
                  {
                    color:
                      contentColor === "#333"
                        ? theme.colors.text.default
                        : "#CBD5E1",
                  },
                ]}
              >
                {emptySubtitle}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 24,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    minHeight: 220, // ensure consistent height
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  comparisonBasisText: {
    fontSize: 12,
    lineHeight: 16,
  },
  total: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 4,
    color: "#333",
  },
  bold: {
    fontWeight: "800",
    color: "#a94103",
  },
  percent: {
    fontSize: 14,
    marginBottom: 4,
    color: "#555",
  },
  comparisonSecondaryText: {
    fontSize: 12,
    marginBottom: 16,
  },
  chartWrapper: {
    marginTop: 24,
    width: "100%",
    position: "relative",
  },
  chartStyle: {
    paddingRight: 0,
    paddingTop: 10,
  },
  centeredOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    paddingBottom: 20, // Adjustment for chart axis
  },
  blurBackdrop: {
    // Optional
  },
  emptyTextContainer: {
    paddingVertical: 8,
    gap: 4,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)", // slight contrast shim for readability
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  emptySubText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  transparentContainer: {
    backgroundColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: "transparent",
    padding: 0,
  },
});

export default React.memo(PracticeBarChartKit);
