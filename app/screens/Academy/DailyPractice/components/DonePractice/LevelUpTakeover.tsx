import React from "react";
import { StyleSheet, View } from "react-native";
import {
  AnimatedModal,
  Button,
  Icon,
  icons,
  radius,
  spacing,
  Text,
  useTheme,
} from "../../../../../design-system";

interface LevelUpTakeoverProps {
  visible: boolean;
  newLevel: number;
  stageTitle: string | null;
  /**
   * The single exit path — backdrop tap and the CTA both route through it.
   * Deliberately the Phase-5 seam: reward-grant chaining hooks here.
   */
  onClose: () => void;
}

/**
 * The level-up celebration — the one moment a level is announced in-app.
 * Same content grammar as BreakthroughModal (icon disc + eyebrow + h2 + body +
 * full-width CTA), riding the DS AnimatedModal with `exclusive` so it defers
 * while any other native modal (e.g. the Reminder sheet) is up — never two
 * live native Modals. No confetti here (DonePractice already burst once) and
 * no faces (one-face rule).
 */
export const LevelUpTakeover: React.FC<LevelUpTakeoverProps> = ({
  visible,
  newLevel,
  stageTitle,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <AnimatedModal visible={visible} onClose={onClose} maxWidth={380} exclusive>
      <View style={styles.content}>
        <View style={[styles.iconDisc, { backgroundColor: colors.action.primary }]}>
          <Icon name={icons.levelUp} size={30} color={colors.action.onPrimary} />
        </View>

        <Text variant="label" color="secondary" center>
          Your character grew
        </Text>
        <Text variant="h2" color="primary" center>
          {stageTitle ?? `Level ${newLevel}`}
        </Text>
        <Text variant="caption" color="secondary" center>
          Level {newLevel}
        </Text>

        <Text variant="body" color="secondary" center style={styles.message}>
          Every practice makes you stronger.
        </Text>

        <View style={styles.actions}>
          <Button label="Keep going" onPress={onClose} />
        </View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  // Centred, gap-driven stack — the shared dark-modal content grammar.
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  message: {
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    marginTop: spacing.xs,
  },
});
