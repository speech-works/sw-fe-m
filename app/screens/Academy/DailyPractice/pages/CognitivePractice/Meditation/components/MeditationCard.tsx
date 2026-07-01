import React from "react";
import { StyleSheet, View } from "react-native";
import { CognitivePractice } from "../../../../../../../api/dailyPractice/types";
import PressableScale from "../../../../../../../components/PressableScale";
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

interface MeditationCardProps {
  onMedToggle: () => void;
  selectedMed: CognitivePractice;
}

const MeditationCard = ({ onMedToggle, selectedMed }: MeditationCardProps) => {
  const { colors } = useTheme();

  return (
    <PressableScale onPress={onMedToggle} testID="meditation-change-card">
      <Surface level="elevated" rounded="card" padded={spacing["2xl"]}>
        <View style={styles.content}>
          {/* Voice-guided chip */}
          <View style={styles.chipRow}>
            <Chip label="Voice Guided" icon={icons.headphones} />
          </View>

          <View style={styles.textContainer}>
            <Text variant="h3" color="primary">
              {selectedMed?.name}
            </Text>
            <Text variant="bodySm" color="secondary" numberOfLines={2}>
              {selectedMed?.description}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.timeBadge}>
              <Icon name="clock" size={12} color={colors.text.tertiary} />
              <Text variant="bodySm" color="tertiary">
                {selectedMed?.guidedMeditationData?.durationMinutes} mins
              </Text>
            </View>

            {/* Change button */}
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

export default MeditationCard;

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
