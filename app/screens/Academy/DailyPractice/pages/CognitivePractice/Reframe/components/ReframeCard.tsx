import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../../../../components/PressableScale";
import {
  Surface,
  Text,
  Icon,
  useTheme,
  spacing,
  radius,
  space,
} from "../../../../../../../design-system";

interface ReframeCardProps {
  name?: string;
  description?: string;
  /** How many thoughts this series holds. Hidden when 0/unknown. */
  count?: number;
  /** Omit when there's only one series — the card then just states the subject. */
  onPress?: () => void;
  /** AA-safe on-surface cut of the flow's accent, so "Change" inherits the
   *  screen's colour instead of the default orange link. */
  accentTextColor?: string;
}

/**
 * The series you're about to work on, and the way into the library. Mirrors
 * `BreathingCard` / `MeditationCard` so every activity's start screen states its
 * subject the same way — a real card, not a cramped label row.
 */
const ReframeCard = ({
  name,
  description,
  count,
  onPress,
  accentTextColor,
}: ReframeCardProps) => {
  const { colors } = useTheme();
  const changeColor = accentTextColor ?? colors.text.link;

  const card = (
    <Surface level="elevated" rounded="card" padded={spacing["2xl"]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <View style={styles.header}>
            <Text variant="h3" color="primary" style={styles.name}>
              {name ?? "Choose a series"}
            </Text>
            {count ? (
              <Text variant="caption" color="tertiary">
                {count} thoughts
              </Text>
            ) : null}
          </View>
          {description ? (
            <Text variant="bodySm" color="secondary" numberOfLines={3}>
              {description}
            </Text>
          ) : null}
        </View>

        {onPress ? (
          <View style={styles.cardFooter}>
            <View
              style={[
                styles.changeButton,
                { backgroundColor: colors.surface.control },
              ]}
            >
              <Text variant="bodySm" color={changeColor}>
                Change
              </Text>
              <Icon name="chevron-right" size={12} color={changeColor} />
            </View>
          </View>
        ) : null}
      </View>
    </Surface>
  );

  if (!onPress) return card;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change reframe series"
      testID="reframe-change-card"
    >
      {card}
    </PressableScale>
  );
};

export default ReframeCard;

const styles = StyleSheet.create({
  content: {
    gap: space.groupGap,
  },
  textContainer: {
    gap: space.titleSub,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  name: {
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
  },
});
