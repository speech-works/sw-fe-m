import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

const RecordingWidget: React.FC<{
  isRecording?: boolean;
  isPlaying?: boolean;
  meteringData: number[];
}> = ({ isRecording = false, isPlaying = false, meteringData }) => {
  // Convert dB to height (0-100%) with improved scaling
  const normalizeDB = (db: number) => {
    const MIN_DB = -100;
    const MAX_DB = -10; // Adjust for more responsive visualization
    if (db <= MIN_DB) return 0;
    if (db >= MAX_DB) return 1;
    return Math.pow((db - MIN_DB) / (MAX_DB - MIN_DB), 0.5); // Square root for better visual distribution
  };

  // Debug logging with reduced frequency
  if (Math.random() < 0.1) {
    // Only log 10% of renders to avoid spam
    console.log(
      `RecordingWidget render: recording=${isRecording}, playing=${isPlaying}, bars=${meteringData.length}`
    );
    console.log(
      `Sample dB values: [${meteringData
        .slice(-5)
        .map((db) => db.toFixed(1))
        .join(", ")}]`
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <View style={styles.infoBarInner}>
          <Icon
            name="wave-square"
            size={16}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.infoBarLeftText}>Speech</Text>
        </View>
        {(isRecording || isPlaying) && (
          <View style={styles.infoBarInner}>
            <Text style={styles.infoBarRightText}>
              {isRecording ? "Recording" : "Playing"}
            </Text>
            <Icon
              solid
              name="circle"
              size={8}
              color={
                isRecording
                  ? theme.colors.library.red[500]
                  : theme.colors.library.green[500]
              }
            />
          </View>
        )}
      </View>

      <View style={styles.wave}>
        <View style={styles.barContainer}>
          {meteringData.map((db, idx) => {
            const normalizedHeight = normalizeDB(db);
            const height = normalizedHeight * 76; // 76 = 80 - 4 (padding)
            const minHeight = 2; // Minimum visible height
            const finalHeight = Math.max(minHeight, height);

            // Add slight variation to make visualization more dynamic
            const variation =
              isRecording || isPlaying
                ? Math.sin(Date.now() * 0.001 + idx) * 2
                : 0;
            const adjustedHeight = Math.max(minHeight, finalHeight + variation);

            return (
              <View
                key={idx}
                style={[
                  styles.bar,
                  {
                    height: adjustedHeight,
                    backgroundColor:
                      normalizedHeight > 0.1
                        ? isRecording
                          ? theme.colors.library.red[400]
                          : theme.colors.library.green[400]
                        : theme.colors.library.gray[200],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBarLeftText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  infoBarRightText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[500],
  },
  wave: {
    height: 80,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
    padding: 2, // Add padding for better bar alignment
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    width: "100%",
    height: "100%",
  },
  bar: {
    borderRadius: 1,
    flex: 1,
    marginHorizontal: 0.5,
    minHeight: 2,
    //transition: "height 0.1s ease-out", // Smooth transitions (if supported)
  },
});

export default RecordingWidget;
