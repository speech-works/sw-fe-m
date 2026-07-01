import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  IconName,
  Text,
  Icon,
  useTheme,
  spacing,
  radius,
  size,
} from "../../../../../design-system";

interface BentoPathSelectorProps {
  steps: Array<{
    label: string;
    icon: string;
    disabled?: boolean;
    // Legacy accent hints — retained for prop stability; no longer rendered
    // (the dark tab bar uses token roles + an action-primary indicator).
    colorStart?: string;
    colorEnd?: string;
  }>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
}

/** Dark tab bar for the Technique detail: selected tab = primary text + an
 *  action-primary underline; unselected = secondary; disabled = lock. */
const BentoPathSelector = ({
  steps,
  currentStepIndex,
  onStepChange,
}: BentoPathSelectorProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.default }]}>
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isDisabled = step.disabled;
        const fg = isDisabled
          ? colors.text.disabled
          : isActive
            ? colors.text.primary
            : colors.text.secondary;

        return (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => !isDisabled && onStepChange(index)}
            activeOpacity={0.7}
            disabled={isDisabled || isActive}
          >
            <View style={styles.tabContent}>
              <Icon
                name={(isDisabled ? "lock" : step.icon) as IconName}
                size={size.iconSm}
                color={fg}
              />
              <Text variant="label" color={fg} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {/* Selected indicator — an action-primary underline. */}
            <View
              style={[
                styles.indicator,
                {
                  backgroundColor: isActive
                    ? colors.action.primary
                    : "transparent",
                },
              ]}
            />
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
    alignItems: "stretch",
    borderRadius: radius.card,
    padding: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  indicator: {
    height: 3,
    width: "60%",
    borderRadius: radius.xs,
  },
});
