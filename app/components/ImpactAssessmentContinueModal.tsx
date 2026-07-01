import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Sheet,
  IconButton,
  Text,
  Button,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../design-system";

interface ImpactAssessmentContinueModalProps {
  visible: boolean;
  remainingQuestions: number;
  onContinue: () => void;
  onSaveForLater: () => void;
}

/**
 * "Great job — keep going?" prompt shown between assessment sets. Built on the
 * design-system `Sheet` (floating close button in the header, outside the card)
 * so it matches the shared `PromptBottomSheet` chrome, with an extra badge for
 * the remaining-question count.
 */
const ImpactAssessmentContinueModal: React.FC<ImpactAssessmentContinueModalProps> = ({
  visible,
  remainingQuestions,
  onContinue,
  onSaveForLater,
}) => {
  const { colors } = useTheme();
  // If the assessment is complete, don't show this modal.
  if (remainingQuestions === 0) {
    return null;
  }

  return (
    <Sheet
      visible={visible}
      onClose={onSaveForLater}
      right={<IconButton name={icons.close} onPress={onSaveForLater} />}
    >
      <View style={styles.container}>
        {/* Success disc — a "set complete" celebration. */}
        <View style={[styles.iconDisc, { backgroundColor: colors.accentTint.success }]}>
          <Icon name={icons.success} size={28} color={colors.accent.success} />
        </View>

        <Text variant="h3" color="primary" center style={styles.title}>
          Great job!
        </Text>
        <Text variant="body" color="secondary" center style={styles.subtitle}>
          You completed this set.
        </Text>

        {/* Remaining-question badge. */}
        <View style={[styles.remainingBadge, { backgroundColor: colors.action.primaryTint }]}>
          <Icon name={icons.duration} size={14} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary" style={styles.remainingText}>
            {remainingQuestions} question{remainingQuestions !== 1 ? "s" : ""}{" "}
            remaining
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button label="Continue Now" onPress={onContinue} variant="primary" />
          <Button label="Save for Later" variant="ghost" onPress={onSaveForLater} />
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  remainingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    gap: spacing.sm,
    marginBottom: spacing["2xl"],
  },
  remainingText: {
    fontWeight: "600",
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
  },
});

export default ImpactAssessmentContinueModal;
