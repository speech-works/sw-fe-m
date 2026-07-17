import React from "react";
import { StyleSheet, View } from "react-native";
import { CognitivePractice } from "../../../../../../../api/dailyPractice/types";
import PressableScale from "../../../../../../../components/PressableScale";
import { patternLabel } from "../../../../../../../constants/breathing";
import {
  Surface,
  Chip,
  Text,
  Icon,
  useTheme,
  spacing,
  radius,
  space,
  icons,
} from "../../../../../../../design-system";

interface BreathingCardProps {
  onPress: () => void;
  technique: CognitivePractice;
}

/**
 * The chosen technique, and the way into the library. Mirrors `MeditationCard`,
 * with one addition: the rhythm chip. A breathing technique IS its pattern, and
 * showing it is also a standing check on the bug this feature fixed — the label
 * is derived from the phases the pacer runs, so the two can't drift apart.
 */
const BreathingCard = ({ onPress, technique }: BreathingCardProps) => {
  const { colors } = useTheme();
  const phases = technique?.guidedBreathingData?.phases;

  return (
    <PressableScale onPress={onPress} testID="breathing-change-card">
      <Surface level="elevated" rounded="card" padded={spacing["2xl"]}>
        <View style={styles.content}>
          <View style={styles.chipRow}>
            {phases?.length ? (
              <Chip label={patternLabel(phases)} icon={icons.energy} />
            ) : null}
          </View>

          <View style={styles.textContainer}>
            <Text variant="h3" color="primary">
              {technique?.name}
            </Text>
            <Text variant="bodySm" color="secondary" numberOfLines={3}>
              {technique?.description}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.timeBadge}>
              <Icon name="clock" size={12} color={colors.text.tertiary} />
              <Text variant="bodySm" color="tertiary">
                {technique?.guidedBreathingData?.durationMinutes} mins
              </Text>
            </View>

            <View
              style={[
                styles.changeButton,
                { backgroundColor: colors.surface.control },
              ]}
            >
              <Text variant="bodySm" color="link">
                Change
              </Text>
              <Icon name="chevron-right" size={12} color={colors.text.link} />
            </View>
          </View>
        </View>
      </Surface>
    </PressableScale>
  );
};

export default BreathingCard;

const styles = StyleSheet.create({
  content: {
    gap: space.groupGap,
  },
  chipRow: {
    flexDirection: "row",
  },
  textContainer: {
    gap: space.titleSub,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
