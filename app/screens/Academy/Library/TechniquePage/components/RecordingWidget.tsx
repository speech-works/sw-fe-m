import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

interface RecordingWidgetProps {
  isRecording?: boolean;
  isPlaying?: boolean;
}

const BAR_COUNT = 30;
const MAX_BAR_HEIGHT = 80;

const RecordingWidget: React.FC<RecordingWidgetProps> = ({
  isRecording = false,
  isPlaying = false,
}) => {
  const animValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    let frameId: number;

    const updateBars = () => {
      const level = isRecording || isPlaying ? MAX_BAR_HEIGHT / 2 : 0;

      // shift left
      for (let i = 0; i < BAR_COUNT - 1; i++) {
        const nextVal = (animValues[i + 1] as any)._value;
        animValues[i].setValue(nextVal);
      }
      // add new
      animValues[BAR_COUNT - 1].setValue(level);

      frameId = requestAnimationFrame(updateBars);
    };

    if (isRecording || isPlaying) {
      frameId = requestAnimationFrame(updateBars);
    } else {
      animValues.forEach((v) => v.setValue(0));
    }

    return () => cancelAnimationFrame(frameId);
  }, [isRecording, isPlaying]);

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
              color={theme.colors.library.green[500]}
            />
          </View>
        )}
      </View>

      <View style={styles.wave}>
        <View style={styles.barContainer}>
          {animValues.map((val, idx) => (
            <Animated.View key={idx} style={[styles.bar, { height: val }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

export default RecordingWidget;

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
    height: MAX_BAR_HEIGHT,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    width: "100%",
  },
  bar: {
    backgroundColor: theme.colors.library.green[300],
    borderRadius: 2,
    flex: 1,
    marginHorizontal: 1,
  },
});
