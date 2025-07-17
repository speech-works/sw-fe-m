import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { theme } from "../Theme/tokens";

import { parseTextStyle } from "../util/functions/parseStyles";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showStepIndicator?: boolean;
  showPercentage?: boolean;
  style?: object;
  themeStyle?: "light" | "dark";
}

const ProgressBar = ({
  currentStep,
  totalSteps,
  showStepIndicator = true,
  showPercentage = true,
  style,
  themeStyle = "dark",
}: ProgressBarProps) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetProgress = (currentStep / totalSteps) * 100;

    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <View style={[style]}>
      {(showStepIndicator || showPercentage) && (
        <View style={styles.stepInfo}>
          {showStepIndicator && (
            <Text style={styles.stepText}>
              Step {currentStep} of {totalSteps}
            </Text>
          )}
          {showPercentage && (
            <Text style={styles.percentageText}>{percentage}%</Text>
          )}
        </View>
      )}
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
              backgroundColor:
                themeStyle === "dark"
                  ? theme.colors.progressBar.bar
                  : theme.colors.progressBar.barLight,
            },
          ]}
        />
      </View>
    </View>
  );
};

export default ProgressBar;

const styles = StyleSheet.create({
  stepInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  percentageText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.progressBar.base,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.progressBar.bar,
    borderRadius: 4,
  },
});
