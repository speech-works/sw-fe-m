import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

interface PageStepperProps {
  steps: Array<{
    label: string;
    icon: string;
    disabled?: boolean; // Added disabled optional prop
  }>;
  onStepChange?: (stepIndex: number) => void;
  currentStepIndex: number;
}

const PageStepper = ({
  steps,
  currentStepIndex,
  onStepChange,
}: PageStepperProps) => {
  const inactiveLineColor = theme.colors.library.orange[100];

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isDisabled = step.disabled;

        // --- Color Logic ---
        let circleBgColor;
        let iconColor;
        let labelColor;

        if (isDisabled) {
          // Locked/Disabled State (Grey)
          circleBgColor = theme.colors.surface.disabled;
          iconColor = theme.colors.text.disabled || "#9CA3AF";
          labelColor = theme.colors.text.disabled || "#9CA3AF";
        } else if (isActive) {
          // Active State (Primary Orange)
          circleBgColor = theme.colors.actionPrimary.default;
          iconColor = theme.colors.text.onDark;
          labelColor = theme.colors.text.default;
        } else {
          // Inactive but Enabled (Light Orange)
          circleBgColor = theme.colors.library.orange[100];
          iconColor = theme.colors.actionPrimary.default;
          labelColor = theme.colors.text.default;
        }

        return (
          <React.Fragment key={index}>
            <View style={styles.stepItem}>
              {/* Step Circle */}
              <TouchableOpacity
                // Disable press if it's the current step OR if it is explicitly disabled
                disabled={isActive || isDisabled}
                style={[styles.circle, { backgroundColor: circleBgColor }]}
                onPress={() => onStepChange && onStepChange(index)}
              >
                <Icon size={14} name={step.icon} color={iconColor} />
              </TouchableOpacity>
              {/* Step Label */}
              <Text style={[styles.label, { color: labelColor }]}>
                {step.label}
              </Text>
            </View>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <View
                style={[styles.line, { backgroundColor: inactiveLineColor }]}
              />
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
    // Color is handled inline based on state
  },
  line: {
    flex: 1,
    height: 2,
    transform: [{ translateY: -12 }],
  },
});
