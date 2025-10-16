import { StyleSheet, Text, View, Dimensions } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { useUserStore } from "../../../../../stores/user";
import { getUserStats } from "../../../../../api";
import { PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

type ContentTypeKey =
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "FUN_PRACTICE"
  | "READING_PRACTICE";

interface PracticeStatSummary {
  contentType: string;
  itemsCompleted: number;
  totalTime: number; // Assuming this is the 'totalTime' field
}

const DPSummary = () => {
  const { user } = useUserStore();
  const [chartData, setChartData] = useState<
    Array<{
      name: string;
      totalTime: number;
      color: string;
      legendFontColor: string;
      legendFontSize: number;
    }>
  >([]);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);

  const chartColors: Record<ContentTypeKey, string> = {
    READING_PRACTICE: "#FFC24D",
    COGNITIVE_PRACTICE: "#FF8C40",
    FUN_PRACTICE: "#87CEEB",
    EXPOSURE_PRACTICE: "#98FB98",
  };

  const contentTypeLabels: Record<ContentTypeKey, string> = {
    COGNITIVE_PRACTICE: "Cognitive",
    EXPOSURE_PRACTICE: "Exposure",
    FUN_PRACTICE: "Fun",
    READING_PRACTICE: "Reading",
  };

  useEffect(() => {
    if (!user) return;
    const fetchSummary = async () => {
      const stats: PracticeStatSummary[] = await getUserStats(user.id);

      // --- DEBUGGING STEP 1: Check raw data from API ---
      console.log("Raw stats from API:", stats);

      const overallTotalTime = stats.reduce(
        (sum, item) => sum + item.totalTime,
        0
      );
      // --- DEBUGGING STEP 2: Check overall total time ---
      console.log(
        "Overall total time calculated (raw value):",
        overallTotalTime
      );

      const dataForChart = stats.map((item) => {
        const contentType = item.contentType as ContentTypeKey;
        const label = contentTypeLabels[contentType] || item.contentType;
        const color = chartColors[contentType] || "#CCCCCC";

        return {
          name: label,
          totalTime: item.totalTime, // This value is used for the slice size
          color: color,
          legendFontColor: theme.colors.text.default,
          legendFontSize: 12,
        };
      });

      // --- DEBUGGING STEP 3: Check prepared chart data before setting state ---
      console.log("Prepared chart data for display:", dataForChart);

      setChartData(dataForChart);
      setTotalPracticeTime(overallTotalTime);
    };
    fetchSummary();
  }, [user]);

  // Function to format time for display (e.g., "30 mins" or "1.5 hrs")
  const formatTime = (timeInMinutes: number) => {
    if (timeInMinutes < 60) {
      // If less than 60 minutes, display in minutes.
      // Using Math.round to display whole minutes, e.g., 30 mins, not 30.0 mins
      return `${Math.round(timeInMinutes)} mins`;
    } else {
      // If 60 minutes or more, convert to hours and display.
      const hours = timeInMinutes / 60;
      return `${hours.toFixed(1)} hrs`; // Round to one decimal place for hours
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titleText}>Practice Time Distribution</Text>
      {/* Ensure overallTotalTime > 0 so that if there's no data,
          it displays the message instead of a blank chart or one with 0s */}
      {chartData.length > 0 && totalPracticeTime > 0 ? (
        <View>
          <View style={styles.legendContainer}>
            {chartData.map((item) => (
              <View key={item.name} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.legendText}>
                  {item.name}: {formatTime(item.totalTime)}
                </Text>
              </View>
            ))}
          </View>
          {/* Chart Container for Donut Effect */}
          <View style={styles.chartContainer}>
            <PieChart
              data={chartData.map((item) => ({
                name: item.name,
                population: item.totalTime, // The actual numerical value for the slice
                color: item.color,
                legendFontColor: item.legendFontColor,
                legendFontSize: item.legendFontSize,
              }))}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                // Ensure PieChart background is transparent so the hole can be seen
                backgroundColor: "transparent",
                backgroundGradientFrom: "transparent",
                backgroundGradientTo: "transparent",
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"0"}
              hasLegend={false}
              absolute
            />
            {/* The "hole" to make it a donut chart */}
            <View style={styles.pieChartHole} />
          </View>
        </View>
      ) : (
        <View style={styles.noDataWrapper}>
          <Text
            style={{ textAlign: "center", color: theme.colors.text.default }}
          >
            No practice data available.
          </Text>
        </View>
      )}
    </View>
  );
};

export default DPSummary;

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    backgroundColor: theme.colors.background.light,
    ...parseShadowStyle(theme.shadow.elevation1),
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  chartContainer: {
    position: "relative",
    width: screenWidth - 40, // Match the PieChart's width
    height: 200, // Match the PieChart's height
    alignItems: "center",
    justifyContent: "center",
    left: "25%",
  },
  pieChartHole: {
    width: 90, // Diameter of the hole. Adjust this value to change hole size.
    height: 90, // Must match width for a perfect circle
    borderRadius: 45, // Half of width/height to make it a circle
    backgroundColor: theme.colors.background.light, // Must match your card's background color
    position: "absolute",
    // These transform properties perfectly center the hole
    top: "50%",
    left: "25%",
    transform: [{ translateX: -45 }, { translateY: -45 }], // Negative half of its width/height
    zIndex: 1, // Ensure the hole is rendered on top of the pie slices
  },

  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  noDataWrapper: {
    marginTop: -8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.background.default,
    width: "100%",
    alignItems: "flex-start",
  },
});
