import React, { useState } from "react"; // Import useState
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const data = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      data: [20, 25, 20, 35, 45, 20, 15], // Your minutes data
      colors: [
        (opacity = 1) => `rgba(253, 220, 198, ${opacity})`,
        (opacity = 1) => `rgba(253, 220, 198, ${opacity})`,
        (opacity = 1) => `rgba(253, 220, 198, ${opacity})`,
        (opacity = 1) => `rgba(253, 220, 198, ${opacity})`,
        (opacity = 1) => `rgba(253, 220, 198, ${opacity})`,
        (opacity = 1) => `rgba(215, 108, 43, ${opacity})`, //  Medium orange
        (opacity = 1) => `rgba(169, 65, 3, ${opacity})`, //  Darker orange
      ],
    },
  ],
};

const chartConfig = {
  backgroundGradientFrom: "#fff3ed",
  backgroundGradientTo: "#fff3ed",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
  strokeWidth: 0,
  barPercentage: 0.6,
  decimalPlaces: 0,
  fillShadowGradient: "#d76c2b",
  fillShadowGradientOpacity: 0.3,
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: "rgba(0, 0, 0, 0.05)",
    strokeWidth: 1,
  },
  propsForLabels: {
    fontSize: 12,
  },
  barRadius: 8,
  yAxisLabel: "",
  yAxisSuffix: "m",
  // Crucial for accommodating labels and padding within the chart itself:
  // contentInset helps define inner padding for the chart's data points.
  // We can add some to ensure labels don't get cut off.
  contentInset: { left: 10, right: 10, top: 0, bottom: 0 },
};

const PracticeBarChartKit = () => {
  const [chartContainerWidth, setChartContainerWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    // We want the width of the container *excluding* its own padding,
    // so the chart can precisely fit.
    // The parent 'container' has paddingHorizontal: 24.
    // If we wrap the chart in another View, we need to measure that inner View's width.
    setChartContainerWidth(width);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Activity</Text>
      <Text style={styles.total}>
        <Text style={styles.bold}>145</Text>m
      </Text>
      <Text style={styles.percent}>+10% from last week</Text>

      {/* This View will act as the direct parent for the chart
          and its width will be measured. */}
      <View
        onLayout={onLayout}
        style={styles.chartWrapper} // Add a style for this wrapper if needed
      >
        {chartContainerWidth > 0 && ( // Only render chart when width is known
          <BarChart
            data={data}
            width={chartContainerWidth} // Use the dynamically measured width
            height={200}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars={false}
            fromZero={true}
            flatColor={true}
            withCustomBarColorFromData={true}
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
    paddingHorizontal: 24, // Total effective horizontal padding: 48
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    // This wrapper will take up the available width inside the container.
    // It should not have horizontal padding or margins itself, as we want to measure
    // the exact space the chart can fill.
    // If you need more space around the chart, add it here via marginHorizontal
    // or by further reducing the width passed to the chart, but `onLayout` is best.
    flex: 1, // Ensures it takes up available horizontal space
    alignSelf: "stretch", // Important for width calculation if flex is used
  },
  chartStyle: {
    borderRadius: 12,
  },
});

export default PracticeBarChartKit;
