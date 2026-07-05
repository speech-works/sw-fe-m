import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { makeStyles, Text, useTheme } from "../design-system";

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
  const styles = useStyles();
  const { colors } = useTheme();
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
  const fillColor =
    themeStyle === "dark" ? colors.action.primaryPressed : colors.action.primary;

  return (
    <View style={[style]}>
      {(showStepIndicator || showPercentage) && (
        <View style={styles.stepInfo}>
          {showStepIndicator && (
            <Text variant="bodySm" color="secondary">
              Step {currentStep} of {totalSteps}
            </Text>
          )}
          {showPercentage && (
            <Text variant="bodySm" color="secondary">
              {percentage}%
            </Text>
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
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

export default ProgressBar;

const useStyles = makeStyles((c, t) => ({
  stepInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: t.spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: c.surface.row,
    borderRadius: t.radius.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: t.radius.xs,
  },
}));
