import React, { useState, useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { format, startOfWeek, addDays } from "date-fns";
import { WeeklyStat } from "../../../../../api/stats/types";
import ExplorerFace from "../../../../../assets/sw-faces/ExplorerFace";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

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
  percentChange: number;
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
  percentChange,
  title = "Weekly Activity",
  emptyTitle = "No activity yet",
  emptySubtitle = "Start your first session",
  showTitle = true,
  backgroundColor = "#fff3ed",
  contentColor = "#333",
  barColor, // NEW
}) => {
  const [chartWidth, setChartWidth] = useState(0);

  // 1) Process Real Data
  const dayMap = new Map<number, number>();
  data.forEach(({ date, totalTime }) => {
    const d = new Date(date);
    dayMap.set(d.getDay(), Math.round(totalTime));
  });

  // 2) Display order Mon(1) → Sun(0)
  const order = [1, 2, 3, 4, 5, 6, 0] as const;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const labels = order.map((dayOffset) =>
    format(addDays(weekStart, dayOffset - 1), "EEE")
  );

  const realValues = order.map((wd) => dayMap.get(wd) ?? 0);
  const totalMinutes = realValues.reduce((sum, v) => sum + v, 0);
  const isEmpty = totalMinutes === 0;

  // 2) Determine Display Values (Real vs Dummy)
  const displayValues = isEmpty ? EMPTY_DUMMY_VALUES : realValues;

  // 3) Compute today & yesterday
  const todayIdx = new Date().getDay();
  const yesterdayIdx = (todayIdx + 6) % 7;

  // 4) Per-bar colors
  const getColors = () => {
    if (isEmpty) {
      // Ghost colors: All same, low opacity
      return displayValues.map(
        () =>
          (opacity = 1) =>
            contentColor === "#333"
              ? `rgba(0,0,0, 0.06)`
              : `rgba(255,255,255, 0.15)` // Increased visibility for white ghost bars
      );
    }
    // Real colors logic
    return order.map((wd) => (opacity = 1) => {
      // If barColor override is provided (e.g. White for Hero Card)
      if (barColor) {
        if (wd === todayIdx) return `rgba(255,255,255, 1)`; // Brightest
        if (wd === yesterdayIdx) return `rgba(255,255,255, 0.7)`;
        return `rgba(255,255,255, 0.4)`; // Dim
      }

      // Default Orange Theme
      if (wd === todayIdx) return `rgba(169,65,3,${opacity})`; // dark
      if (wd === yesterdayIdx) return `rgba(215,108,43,${opacity})`; // medium
      return `rgba(253,220,198,${opacity})`; // light peach
    });
  };

  // 5) Chart config
  const chartData = {
    labels,
    datasets: [{ data: displayValues, colors: getColors() }],
  };

  // Helper to handle "transparent" passed from parent for Gradient backgrounds
  const isTransparent = backgroundColor === "transparent";
  const containerStyle = isTransparent
    ? {
        backgroundColor: "transparent",
        borderWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowColor: "transparent",
        padding: 0, // Reduce padding as parent likely handles it
      }
    : { backgroundColor };

  // Helper for Chart Transparency
  const transparentColor = "rgba(0, 0, 0, 0)";

  const chartConfig = {
    backgroundGradientFrom: isTransparent ? transparentColor : backgroundColor,
    backgroundGradientTo: isTransparent ? transparentColor : backgroundColor,
    // Axis/Text color
    color: (opacity = 1) =>
      contentColor === "#333"
        ? `rgba(0,0,0,${opacity * (isEmpty ? 0.3 : 0.7)})`
        : `rgba(255,255,255,${opacity * (isEmpty ? 0.6 : 0.9)})`,
    strokeWidth: 0,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke:
        contentColor === "#333" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.1)",
      strokeWidth: 1,
      strokeDasharray: "", // Solid lines look better on gradient
    },
    fillShadowGradientOpacity: 1, // Full opacity for bars since we handle color alpha
    yAxisLabel: "",
    yAxisSuffix: "m",
    barRadius: BAR_RADIUS, // rounds all corners
    contentInset: { top: 0, bottom: BAR_RADIUS }, // push bottom corner out of view
  };

  // 6) Measure chart width
  const onLayout = (e: LayoutChangeEvent) =>
    setChartWidth(e.nativeEvent.layout.width);

  const percentText =
    percentChange === 0
      ? "Same as last week"
      : percentChange > 0
      ? `+${percentChange}% from last week`
      : `${percentChange}% from last week`;

  return (
    <View style={[styles.container, containerStyle]}>
      {showTitle && (
        <Text
          style={[
            styles.title,
            {
              color: contentColor === "#333" ? "#555" : "rgba(255,255,255,0.7)",
            },
          ]}
        >
          {title}
        </Text>
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
            {percentText}
          </Text>
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

            <ExplorerFace size={84} />

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
    backgroundColor: "#fff3ed",
    borderRadius: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 220, // ensure consistent height
  },
  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
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
    marginBottom: 16,
    color: "#555",
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
});

export default PracticeBarChartKit;
