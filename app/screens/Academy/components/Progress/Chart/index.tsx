// src/components/Progress/PracticeBarChartKit.tsx

import React, { useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { format, startOfWeek, addDays } from "date-fns";
import { WeeklyStat } from "../../../../../api/stats/types";

interface Props {
  data: WeeklyStat[];
  percentChange: number;
}

const BAR_RADIUS = 8;
const PracticeBarChartKit: React.FC<Props> = ({ data, percentChange }) => {
  const [chartWidth, setChartWidth] = useState(0);

  // 1) Map weekday (0=Sun..6=Sat) → minutes
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
  const values = order.map((wd) => dayMap.get(wd) ?? 0);

  // 3) Compute today & yesterday
  const todayIdx = new Date().getDay();
  const yesterdayIdx = (todayIdx + 6) % 7;

  // 4) Per-bar colors
  const colors = order.map((wd) => (opacity = 1) => {
    if (wd === todayIdx) return `rgba(169,65,3,${opacity})`; // dark
    if (wd === yesterdayIdx) return `rgba(215,108,43,${opacity})`; // medium
    return `rgba(253,220,198,${opacity})`; // light peach
  });

  // 5) Chart config
  const chartData = { labels, datasets: [{ data: values, colors }] };
  const chartConfig = {
    backgroundGradientFrom: "#fff3ed",
    backgroundGradientTo: "#fff3ed",
    color: (opacity = 1) => `rgba(0,0,0,${opacity * 0.7})`,
    strokeWidth: 0,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)", strokeWidth: 1 },
    fillShadowGradientOpacity: 0.3,
    yAxisLabel: "",
    yAxisSuffix: "m",
    barRadius: BAR_RADIUS, // rounds all corners
    contentInset: { top: 0, bottom: BAR_RADIUS }, // push bottom corner out of view
  };

  // 6) Measure chart width
  const onLayout = (e: LayoutChangeEvent) =>
    setChartWidth(e.nativeEvent.layout.width);

  const totalMinutes = values.reduce((sum, v) => sum + v, 0);
  const percentText =
    percentChange === 0
      ? "Same as last week"
      : percentChange > 0
      ? `+${percentChange}% from last week`
      : `${percentChange}% from last week`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Activity</Text>
      <Text style={styles.total}>
        <Text style={styles.bold}>{totalMinutes}</Text>m
      </Text>
      <Text style={styles.percent}>{percentText}</Text>

      <View
        onLayout={onLayout}
        style={[styles.chartWrapper, { overflow: "hidden" }]}
      >
        {chartWidth > 0 && (
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
            style={styles.chartStyle}
          />
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
    flex: 1,
    alignSelf: "stretch",
    borderTopLeftRadius: BAR_RADIUS,
    borderTopRightRadius: BAR_RADIUS,
  },
  chartStyle: {
    backgroundColor: "#fff3ed",
  },
});

export default PracticeBarChartKit;
