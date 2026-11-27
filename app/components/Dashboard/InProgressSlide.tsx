import React from "react";
import { Image, StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import {
  Icon,
  Text,
  borderWidth,
  icons,
  primaryEdge,
  radius,
  size,
  space,
  spacing,
  fonts,
  useTheme,
  withAlpha,
} from "../../design-system";
import type { ActiveProgram } from "./useActiveProgram";
import { dayCloseLine } from "../../util/packs/dayLock";
import { packIconFor } from "./packIcon";
import { COVER_SLIDE_HEIGHT } from "./CoverSlide";
import { programCoverFor } from "../../util/packs/programCover";

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

  // True only when we KNOW the next day has not opened. Null (no progress call,
  // or a pack with no arc) leaves the card exactly as it was.
  const dayLocked = program.nextModuleLocked === true;
  const dayCloseState = {
    // The day they finished is the one before the locked one, and `currentDay`
    // is a better answer than arithmetic when we have it.
    finishedDay: program.currentDay,
    nextDay: program.nextModuleDay,
    currentDay: program.currentDay,
    nextDayOpensAt: program.nextDayOpensAt,
  };

  const a11yLabel =
    `${program.title}, in progress. ` +
    (dayLocked
      ? `${dayCloseLine(dayCloseState)} `
      : nextModule
        ? `Next: ${nextModule.title}. `
        : "") +
    (totalModules ? `Day ${moduleOrder} of ${totalModules}. ` : "") +
    "Opens it.";

  const ctaLabel = program.isRefresher
    ? "Start again"
    : dayLocked
      ? "Done for today"
      : percentComplete > 0 || program.dayStarted
        ? "Continue"
        : "Start";

  /**
   * ── WITH A COVER ──────────────────────────────────────────────────────────
   * The same four facts, rearranged: the program, its status and what is next
   * beside the cover, then one strip for how far in and the way in. The
   * description goes, as the note above already argues for the plain card: the
   * person reading this has bought the program, and the picture now says what
   * it is about. The watermark goes too; the cover is the program's mark here.
   */
  const cover = programCoverFor(program.catalogKey, program.coverImage);
  if (cover) {
    // Big cover tile: the cover across the top at a fixed height, then the
    // words. The reason owns its top gap, so a program without one leaves no
    // hole. A finished program has no bar and no day count, only the line that
    // says so.
    const showBar = !program.isRefresher && totalModules > 0;
    const doneDays = Math.round(
      Math.max(0, Math.min(1, percentComplete)) * totalModules,
    );
    const reason = program.reason?.trim() ? program.reason.trim() : null;
    return (
      <PressableScale
        scaleTo={0.98}
        onPress={() => onPress(program)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={styles.press}
      >
        <View
          style={[
            styles.tile,
            {
              backgroundColor: colors.surface.default,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Image
            source={cover.source}
            resizeMode="cover"
            style={styles.tileCover}
            accessible={false}
            importantForAccessibility="no"
          />
          <View style={styles.tileBody}>
            <Text variant="h3" color="primary" style={styles.tileTitle}>
              {program.title}
            </Text>
            {reason ? (
              <Text variant="bodySm" color="accent" numberOfLines={2} style={styles.tileReason}>
                {reason}
              </Text>
            ) : null}
            {showBar ? (
              <View style={styles.segs}>
                {Array.from({ length: totalModules }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.seg,
                      {
                        backgroundColor:
                          i < doneDays
                            ? colors.action.primary
                            : colors.surface.control,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
            <View style={styles.tileRow}>
              <Text variant="caption" color="secondary" numberOfLines={1} style={styles.tileMeta}>
                {program.isRefresher
                  ? "You finished this"
                  : totalModules > 0
                    ? `Day ${moduleOrder} of ${totalModules}`
                    : ""}
              </Text>
              <View style={[styles.coverCta, { backgroundColor: colors.action.primary }]}>
                <Icon
                  name={dayLocked ? icons.success : icons.play}
                  size={size.iconInline}
                  color={ink}
                />
                <Text variant="label" color={ink}>
                  {ctaLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => onPress(program)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
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
        {/* THE WATERMARK, FIRST. Absolutely positioned and painted before
            everything else, so every line of type lands on top of it without
            needing a zIndex to say so. Bled off two corners on purpose: a mark
            that sits neatly inside its card is an illustration, not a
            watermark. The card clips it.

            THE PROGRAM'S OWN MARK, not one shared by all ten. The server says
            which; `packIconFor` guarantees the answer is a glyph this build
            actually has, because an unknown key would render an empty SVG at
            220 points and leave a hole in the card. */}
        <View style={styles.watermark} pointerEvents="none">
          <Icon
            name={icons[packIconFor(program.icon)]}
            size={220}
            color={withAlpha(ink, 0.1)}
          />
        </View>

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
              {dayLocked ? "TODAY" : "NEXT UP"}
            </Text>
            <Text
              variant="title"
              color={ink}
              numberOfLines={2}
              style={styles.next}
            >
              {/* Don't advertise a day that cannot be started. `nextModule` is
                  the next UNFINISHED day, and on an arc pack the ordinary way
                  to be looking at a locked one is to have finished today. */}
              {dayLocked ? dayCloseLine(dayCloseState) : nextModule.title}
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
              Day {moduleOrder} of {totalModules}
            </Text>
          </>
        ) : null}

        <View style={[styles.cta, { backgroundColor: ink }]}>
          <Icon
            name={dayLocked ? icons.success : icons.play}
            size={size.iconInline}
            color={colors.action.primary}
          />
          <Text variant="label" style={{ color: colors.action.primary }}>
            {ctaLabel}
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
  // The floor is on the pressable itself, not only on the card inside it: on
  // native a `flex: 1` chain under an auto-height carousel row can resolve to 0
  // and leave the card empty (seen on the S22).
  press: { flex: 1, minHeight: COVER_SLIDE_HEIGHT },
  card: {
    flex: 1,
    borderRadius: radius.card,
    padding: space.cardPad,
    // Clips the watermark to the card's corners.
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    top: -20,
    right: -60,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
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
  tile: {
    flex: 1,
    minHeight: COVER_SLIDE_HEIGHT,
    borderRadius: 22,
    borderWidth: borderWidth.hairline,
    overflow: "hidden",
  },
  // An explicit height, never a flex chain: on Android a flex child of an
  // auto-height carousel row can resolve to 0.
  tileCover: { width: "100%", height: 150 },
  tileBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  tileTitle: { fontSize: 17, lineHeight: 21, fontFamily: fonts.extrabold, fontWeight: "800" },
  tileReason: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  segs: { flexDirection: "row", gap: 3, marginTop: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  tileRow: {
    marginTop: "auto",
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  tileMeta: { flex: 1, minWidth: 0 },
  coverCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.pill,
  },
});
