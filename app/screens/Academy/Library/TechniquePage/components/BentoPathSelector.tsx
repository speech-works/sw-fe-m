import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import React, { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BentoPathSelectorProps {
  steps: Array<{
    label: string;
    icon: string;
    disabled?: boolean;
    colorStart?: string;
    colorEnd?: string;
  }>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
}

const BentoPathSelector = ({
  steps,
  currentStepIndex,
  onStepChange,
}: BentoPathSelectorProps) => {
  // Trigger animation when index changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [currentStepIndex]);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isDisabled = step.disabled;

        // Dynamic Colors based on active state
        const activeGradient = [
          step.colorStart || theme.colors.library.orange[400],
          step.colorEnd || theme.colors.library.orange[500],
        ] as const;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.tabItem,
              isActive && styles.tabItemActive,
              isDisabled && styles.tabItemDisabled,
            ]}
            onPress={() => !isDisabled && onStepChange(index)}
            activeOpacity={0.7}
            disabled={isDisabled || isActive}
          >
            {isActive ? (
              // Active State: Gradient Card
              <LinearGradient
                colors={activeGradient}
                style={styles.activeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon
                  name={step.icon}
                  size={16}
                  color="#FFF"
                  style={styles.icon}
                />
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {step.label}
                </Text>
              </LinearGradient>
            ) : (
              // Inactive State: Glass/Ghost
              <View style={styles.inactiveContainer}>
                <Icon
                  name={isDisabled ? "lock" : step.icon}
                  size={16}
                  color={
                    isDisabled
                      ? theme.colors.text.disabled
                      : theme.colors.text.default
                  }
                />
              </View>
            )}

            {/* Connector Line (Virtual) - handled by gap in container */}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BentoPathSelector;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8, // Tighter gap
    paddingHorizontal: 4,
    height: 48, // Compact height (was 56)
  },
  tabItem: {
    flex: 1,
    height: "100%",
    borderRadius: 12, // Smaller radius (was 16)
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabItemActive: {
    flex: 2, // Slight reduction in expansion ratio (was 2.5)
    borderWidth: 0,
    backgroundColor: "transparent",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItemDisabled: {
    backgroundColor: "rgba(0,0,0,0.03)", // Darker glass for disabled
    borderColor: "rgba(0,0,0,0.05)",
  },
  // Active Inner
  activeGradient: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  activeLabel: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    marginTop: -2, // Optical alignment
    fontWeight: "700",
  },
  icon: {
    // shadowColor: "rgba(0,0,0,0.2)",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 1,
    // shadowRadius: 2,
  },
  // Inactive Inner
  inactiveContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
