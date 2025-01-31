import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";

// Define TypeScript types
type Step = {
  name: string;
  completed: boolean;
};

type StepperProps = {
  steps: Step[];
};

const Stepper: React.FC<StepperProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = step.completed;
        const isCurrent =
          !isCompleted && (index === 0 || steps[index - 1].completed);

        return (
          <View key={index} style={styles.stepContainer}>
            {/* Step Indicator */}
            <View style={styles.iconContainer}>
              {isCompleted ? (
                <View
                  style={{
                    padding: 4,
                    borderRadius: 50,
                    backgroundColor: theme.colors.actionSecondary.default,
                  }}
                >
                  <MaterialIcons name="check" size={12} color="white" />
                </View>
              ) : (
                <View
                  style={[
                    styles.circle,
                    isCurrent ? styles.currentCircle : styles.pendingCircle,
                  ]}
                ></View>
              )}
              {index !== steps.length - 1 && <View style={styles.line} />}
            </View>

            {/* Step Text */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.stepText,
                  isCurrent
                    ? styles.currentText
                    : isCompleted
                    ? styles.completedText
                    : styles.pendingText,
                ]}
              >
                {step.name}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    alignItems: "center",
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currentCircle: {
    borderColor: theme.colors.actionPrimary.default,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  pendingCircle: {
    borderColor: theme.colors.neutral[7],
    backgroundColor: theme.colors.neutral[7],
  },
  line: {
    width: 2,
    height: 40,
    backgroundColor: theme.colors.neutral[7],
    marginVertical: 5,
  },
  textContainer: {
    marginLeft: 15,
  },
  stepText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  completedText: {
    color: theme.colors.actionSecondary.default,
  },
  currentText: {
    color: theme.colors.actionPrimary.default,
  },
  pendingText: {
    color: theme.colors.neutral[7],
  },
});

export default Stepper;
