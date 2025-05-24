import React from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const data = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  datasets: [
    {
      data: [20, 25, 20, 35, 45], // Your minutes data
      colors: [
        (opacity = 1) => `#fddcc6`, // Mon
        (opacity = 1) => `#fddcc6`, // Tue
        (opacity = 1) => `#fddcc6`, // Wed
        (opacity = 1) => `#d76c2b`, // Thu
        (opacity = 1) => `#a94103`, // Fri
      ],
    },
  ],
};

const chartConfig = {
  backgroundGradientFrom: "#fff3ed",
  backgroundGradientTo: "#fff3ed",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // For labels
  strokeWidth: 2, // for axis lines
  barPercentage: 0.5, // width of the bars
  // REMOVE OR COMMENT OUT THIS LINE:
  // useShadowColorFromDataset: true, // <--- THIS IS THE LIKELY CULPRIT FOR THE '.map of undefined' ERROR
  fillShadowGradient: "transparent", // Can keep if you want transparency
  fillShadowGradientOpacity: 0, // Can keep if you want transparency
  // Add yAxisLabel and yAxisSuffix for TypeScript
  yAxisLabel: "",
  yAxisSuffix: "m",
};

const PracticeBarChartKit = () => {
  return (
    <View style={styles.container}>
      <BarChart
        data={data}
        width={screenWidth - 32 - 48} // Adjust width to fit container
        height={200}
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        showValuesOnTopOfBars={false}
        fromZero={true}
        flatColor={true} // Keep this to use the colors array directly
        withCustomBarColorFromData={true} // Keep this to use the colors array directly
        yAxisLabel=""
        yAxisSuffix="m"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff3ed",
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  title: { fontSize: 14, color: "#555" },
  total: { fontSize: 28, fontWeight: "bold", marginVertical: 4 },
  bold: { fontWeight: "800" },
  percent: { fontSize: 14, marginBottom: 8, color: "#555" },
});

export default PracticeBarChartKit;
