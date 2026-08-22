import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import {
  Icon,
  Text,
  icons,
  primaryEdge,
  radius,
  size,
  space,
  spacing,
  useTheme,
  withAlpha,
} from "../../design-system";
import type { ActiveProgram } from "./useActiveProgram";

/**
 * ===========================================================================
 * THE PROGRAM THEY ARE IN THE MIDDLE OF, AS SLIDE ONE
 * ---------------------------------------------------------------------------
 * This was a separate card above the shelf. Two rows about programs, stacked,
 * and the top one always the taller — so the thing you could buy was pushed off
 * the fold by the thing you already own.
 *
 * ── IT SETS THE SHELF'S HEIGHT, SO IT STAYS LEAN ───────────────────────────
 * Every slide in the carousel stretches to the tallest, and this is the tallest.
 * Whatever it carries, every offer beside it carries the same height. That is
 * the whole argument for what is NOT here:
 *
 *   the nested "Current Module" card — a card inside a card, and the only thing
 *   it added was a border around a line of text.
 *
 *   the description at more than two lines — it is the selling copy, and the
 *   person reading it has already bought the thing.
 *
 * What is left is the four facts they need: which program, how far in, what is
 * next, and the way in.
 *
 * ── A FINISHED PACK IS NOT A PACK IN PROGRESS ──────────────────────────────
 * The recommendation engine offers a pack you have completed back to you as a
 * refresher. Drawn with the in-progress furniture that read as a lie: "NEXT UP
 * Day 1 · Module 1 of 7" with an empty bar says you are at the start of a
 * seven-day arc, when you are at the end of one.
 *
 * Worse, it was a dead end. Nothing restarts a pack by opening a module, so
 * every module stayed COMPLETED, "the first module that is not completed"
 * found none, and the card said Day 1 for ever — including straight after
 * somebody finished Day 1 again. That is the bug this state was reported for.
 *
 * So a refresher says what it is, drops the bar and the module count, and its
 * button actually restarts the pack. After that it is a real day 1 and behaves
 * like any other run.
 *
 * ── NO CONFIRMATION SHEET ──────────────────────────────────────────────────
 * The old card opened a "Ready to start?" sheet that named the module and then
 * navigated. The module's own screen names it too, so the sheet cost a tap to
 * repeat a title. Pressing the card starts the day.
 * ===========================================================================
 */
export interface InProgressSlideProps {
  program: ActiveProgram;
  onPress: (program: ActiveProgram) => void;
}

const InProgressSlide: React.FC<InProgressSlideProps> = ({
  program,
  onPress,
}) => {
  const { colors } = useTheme();
  const ink = colors.action.onPrimary;

  const { nextModule, moduleOrder, totalModules, percentComplete } = program;

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => onPress(program)}
      accessibilityRole="button"
      accessibilityLabel={
        `${program.title}, in progress. ` +
        (nextModule ? `Next: ${nextModule.title}. ` : "") +
        (totalModules ? `Module ${moduleOrder} of ${totalModules}. ` : "") +
        "Opens it."
      }
      style={styles.press}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.action.primary },
          // The brand fill has no identifiable edge on the paper scheme.
          primaryEdge(colors),
        ]}
      >
        <Text variant="eyebrow" color={ink}>
          {program.isRefresher ? "YOU FINISHED THIS" : "IN PROGRESS"}
        </Text>

        <Text variant="h2" color={ink} numberOfLines={2} style={styles.title}>
          {program.title}
        </Text>

        {program.description ? (
          <Text
            variant="bodySm"
            color={ink}
            numberOfLines={2}
            style={styles.desc}
          >
            {program.description}
          </Text>
        ) : null}

        {/* Pushes everything below to the bottom edge, so a stretched slide
            grows in the MIDDLE and the action never drifts up the card. */}
        <View style={styles.spacer} />

        {/* A refresher has no "next" and no position in an arc it already
            finished. One line about what pressing this does, and nothing that
            looks like progress. */}
        {program.isRefresher ? (
          <Text variant="body" color={ink} style={styles.again}>
            Start it again from day one.
          </Text>
        ) : null}

        {!program.isRefresher && nextModule ? (
          <>
            <Text variant="caption" color={ink} style={styles.nextLabel}>
              NEXT UP
            </Text>
            <Text
              variant="title"
              color={ink}
              numberOfLines={2}
              style={styles.next}
            >
              {nextModule.title}
            </Text>
          </>
        ) : null}

        {!program.isRefresher && totalModules > 0 ? (
          <>
            {/* NOT the DS `ProgressBar`. Its track is `surface.control`, a
                neutral step designed for a card surface — on the brand fill it
                reads as a smudge rather than a track. The card's own ink at low
                alpha is the only pairing that holds on both schemes. */}
            <View
              style={[styles.bar, { backgroundColor: withAlpha(ink, 0.22) }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: ink,
                    width: `${Math.round(
                      Math.max(0, Math.min(1, percentComplete)) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color={ink} style={styles.meta}>
              Module {moduleOrder} of {totalModules}
            </Text>
          </>
        ) : null}

        <View style={[styles.cta, { backgroundColor: ink }]}>
          <Icon
            name={icons.play}
            size={size.iconInline}
            color={colors.action.primary}
          />
          <Text variant="label" style={{ color: colors.action.primary }}>
            {program.isRefresher
              ? "Start again"
              : percentComplete > 0
                ? "Continue"
                : "Start"}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
};

export default InProgressSlide;

const styles = StyleSheet.create({
  // `flex: 1` on both, so the slide fills whatever height the tallest card in
  // the row establishes. Without it the card keeps its natural size and the
  // carousel leaves a gap under the short ones.
  press: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: radius.card,
    padding: space.cardPad,
  },
  title: { marginTop: spacing.xs },
  desc: { opacity: 0.85, marginTop: spacing.xs },
  spacer: { flex: 1, minHeight: spacing.md },
  again: { opacity: 0.9 },
  nextLabel: { opacity: 0.7, letterSpacing: 0.6 },
  next: { marginTop: spacing.xxs },
  bar: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  barFill: { height: "100%", borderRadius: radius.full },
  meta: { opacity: 0.8, marginTop: spacing.xs },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
});
