import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

interface PageStepperProps {
  steps: Array<{
    label: string;
    icon: string;
  }>;
  onStepChange?: (stepIndex: number) => void;
  currentStepIndex: number;
}
const PageStepper = ({
  steps,
  currentStepIndex,
  onStepChange,
}: PageStepperProps) => {
  // Define colors based on the provided image
  const activeColor = theme.colors.actionPrimary.default;
  const inactiveColor = theme.colors.library.orange[100]; // Light orange for inactive elements and lines

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;

        // The circle background color is activeColor only if isActive
        const circleBgColor = isActive ? activeColor : inactiveColor;

        // The icon color is theme.colors.text.onDark only if isActive
        const iconColor = isActive ? theme.colors.text.onDark : activeColor;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepItem}>
              {/* Step Circle */}
              <TouchableOpacity
                disabled={currentStepIndex === index}
                style={[styles.circle, { backgroundColor: circleBgColor }]}
                onPress={() => onStepChange && onStepChange(index)}
              >
                <Icon size={14} name={step.icon} color={iconColor} />
              </TouchableOpacity>
              {/* Step Label */}
              <Text style={styles.label}>{step.label}</Text>
            </View>

            {index < steps.length - 1 && (
              <View style={[styles.line, { backgroundColor: inactiveColor }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default PageStepper;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    gap: 8,
    zIndex: 1,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  line: {
    flex: 1,
    height: 2,
    transform: [{ translateY: -12 }],
  },
});
