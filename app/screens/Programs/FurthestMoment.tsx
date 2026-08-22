import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  AnimatedModal,
  Button,
  Icon,
  Text,
  haptics,
  icons,
  radius,
  space,
  spacing,
  useTheme,
} from "../../design-system";

/**
 * ===========================================================================
 * THE FURTHEST THING THEY HAVE DONE
 * ---------------------------------------------------------------------------
 * Full screen, once, when somebody closes a goal that takes them past
 * everything they have closed in that program before.
 *
 * ── WHY IT IS NOT LevelUpTakeover ──────────────────────────────────────────
 * That component is about levels: it takes fromLevel, newLevel, a stage title
 * and an avatar manifest, and it draws the wardrobe a level unlocked. None of
 * that applies here, and parameterising it into something that means two
 * different things would make both harder to read. What is reused is the part
 * that matters: the same AnimatedModal with `exclusive`, so this can never be
 * the second live native Modal, and the same content grammar (icon disc,
 * eyebrow, their words, one full-width way out).
 *
 * ── THE LADDER IS THEIRS ───────────────────────────────────────────────────
 * "Furthest" means further along the order the USER put their own answers in
 * on day 1. We never computed a difficulty. That is the whole reason this
 * moment is honest: nobody else's goals are in it, and the scale was built by
 * the person being congratulated.
 *
 * ── NO CONFETTI ────────────────────────────────────────────────────────────
 * The app's existing rule, and it holds here for a stronger reason than usual.
 * Confetti is what a game does when you clear a level. This is a person saying
 * they made a phone call they had been avoiding for a year, and treating it
 * like a coin pickup would be the app failing to understand what it just heard.
 * ===========================================================================
 */
export function FurthestMoment({
  visible,
  goalText,
  xpAwarded = 0,
  onClose,
}: {
  visible: boolean;
  /** Their words, exactly. Never summarised, never re-cased. */
  goalText: string;
  /**
   * What the act paid. Shown HERE and nowhere else.
   *
   * The daily log's chips deliberately have nothing hanging off them: the
   * moment a tap is visibly worth points, the honest answer and the profitable
   * answer stop being the same one. A celebration screen is different ground.
   * It is not a control somebody taps to farm, and the biggest single award in
   * the app passing unmentioned reads as the app not noticing.
   */
  xpAwarded?: number;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) haptics.success();
  }, [visible]);

  return (
    <AnimatedModal visible={visible} onClose={onClose} exclusive>
      <View style={styles.root}>
        <View
          style={[styles.disc, { backgroundColor: colors.action.primaryTint }]}
        >
          <Icon name={icons.milestone} size={40} color={colors.text.accent} />
        </View>

        <Text variant="eyebrow" color="tertiary">
          FURTHEST YET
        </Text>

        {/* THEIR SENTENCE IS THE HEADLINE. Anything we wrote would be smaller
            than what they just told us. */}
        <Text variant="h2" color="primary" center>
          {goalText}
        </Text>

        <Text variant="body" color="secondary" center>
          On day 1 you put this further down your own list than anything you
          have done so far.
        </Text>

        {xpAwarded > 0 && (
          <Text variant="label" color="tertiary">
            +{xpAwarded} XP
          </Text>
        )}

        <Button label="Keep going" onPress={onClose} />
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  disc: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.inlineGap,
  },
});
