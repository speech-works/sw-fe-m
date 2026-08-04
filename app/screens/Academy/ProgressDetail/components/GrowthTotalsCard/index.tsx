import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  size,
  borderWidth,
  withAlpha,
  type IconName,
} from "../../../../../design-system";
import { GrowthAxis, GrowthTotals, visibleTotals } from "../../../../../api/dailyPlan";
import { FIRST_STEP, lastAtPhrase } from "../../../../../util/growth/format";
import { axisAccent } from "../../../../../util/growth/accents";
import { insetSurface } from "../../insetSurface";

/**
 * ============================================================================
 * WHAT THIS PERSON HAS DONE, FOR GOOD
 * ----------------------------------------------------------------------------
 * The app's memory of somebody. Before this, its only memory was TodayStrip,
 * which resets at local midnight — so a person who had done the hard thing
 * eleven times over six weeks saw exactly the screen of a person who had done
 * it once. Everything the progress report already showed was about the app:
 * practice time, practice count, practice days, level. This is the first thing
 * that is about their life.
 *
 * COUNTS AND DATES. NOTHING ELSE, EVER.
 * No score, no percentage, no bar, no trend line, no month-over-month. Those
 * are all quantities that can FALL, and every one of these numbers describes
 * something already done — nothing a person does later can undo having made the
 * call. For a population whose presenting problem is anxiety-driven avoidance,
 * a number that drops after a bad week is not a neutral piece of feedback; it
 * is evidence for the belief that keeps them avoidant. A count can only ever
 * wait for them.
 *
 * This is also the lesson of the widget this replaces. The Growth Profile was
 * deleted because its five clinical scores were written twice in a user's life,
 * both inside the first three days, and then froze — "a chart that cannot move
 * is worse than no chart". A count moves the first time somebody does anything.
 *
 * NEVER OPENS ON A ZERO. With no history, it shows the frame and an invitation
 * and NOT three zeros. The distinction is the whole point: "0 times" under
 * "taking on harder things" is a verdict about a person, while "not yet, and
 * here is what would be first" is a door. There is deliberately no "we are
 * calculating your growth" state either — nothing is calculating, and a promise
 * with a deadline we cannot meet is how the last one lost people's trust.
 *
 * THE LABEL NEVER APPEARS WITHOUT ITS SUBTITLE. "Wider" alone reads as "did a
 * variety of exercises" — app breadth instead of life breadth, the dishonest
 * meaning the axis was nearly renamed to escape.
 * ============================================================================
 */

const AXIS_ICON: Record<string, IconName> = {
  [GrowthAxis.BRAVER]: icons.courage,
  [GrowthAxis.WIDER]: icons.globe,
  [GrowthAxis.REGULAR]: icons.streak,
};

interface Props {
  totals: GrowthTotals | null;
}

const GrowthTotalsCard: React.FC<Props> = ({ totals }) => {
  const { colors, scheme } = useTheme();
  const rows = visibleTotals(totals);

  // Nothing loaded yet, or the call failed. Render nothing rather than an
  // error: this is a card nobody asked for, and the rest of the report is
  // perfectly usable without it.
  if (!totals || rows.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        {
          // No border on the OUTER card — the weekly card has none, and two
          // nested outlines read as a table. The inset blocks carry the edges.
          backgroundColor: colors.surface.elevated,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          {/* "YOUR GROWTH", not "WHAT YOU'VE DONE".
              The old eyebrow described the card instead of naming it, and it
              was the same sentence as the Home row that opens this — the two
              screens said one thing twice. Deliberately NOT "Growth Profile":
              that is the name of the five-score clinical widget deleted in
              `baa856f7` for being unable to move, and reviving the words would
              promise the chart this card exists to not be. */}
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            YOUR GROWTH
          </Text>
          {/* TWO LINES REMOVED HERE, NOT ONE.
              "Three things we watch" restated the eyebrow, and "None of them
              are about how smooth you sound" was a definition by negation —
              it only lands if you already know what we are declining to
              measure, and it made the reader's first job disproving something.
              The three rows below now plainly count deeds, situations and
              days, which cannot be read as a fluency score. Showing it beats
              saying it, and the card opens on content instead of a caveat. */}
        </View>
        <Icon name={icons.growth} size={size.icon} color={colors.text.tertiary} />
      </View>

      {!totals.hasAny ? (
        <View
          style={[
            styles.invite,
            insetSurface(colors, scheme),
          ]}
        >
          <Icon name={icons.tip} size={16} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary" style={styles.flex1}>
            This fills in as you practice. Nothing to set up.
          </Text>
        </View>
      ) : null}

      <View style={styles.rows}>
        {rows.map((row) => {
          const accent = axisAccent(row.axis, colors);
          const earned = row.count > 0;
          return (
            <View
              key={row.axis}
              style={[
                styles.row,
                // One shared rule for every inset on this screen — see
                // `insetSurface`. Sunken read as a hole punched in the card;
                // this is the softer panel the weekly card has always used.
                insetSurface(colors, scheme),
              ]}
            >
              {/* SOLID DISC ONCE EARNED, TINTED WHILE IT IS STILL EMPTY.
                  The one place a tint is right: an axis at zero should read as
                  waiting rather than as a thing you have, and dimming the
                  colour says that without adding a word or greying the label
                  into illegibility. */}
              <View
                style={[
                  styles.rowIcon,
                  {
                    backgroundColor: earned
                      ? accent.fill
                      : withAlpha(accent.fill, 0.18),
                  },
                ]}
              >
                <Icon
                  name={AXIS_ICON[row.axis] ?? icons.growth}
                  size={20}
                  color={earned ? accent.on : accent.text}
                />
              </View>

              <View style={styles.flex1}>
                <Text variant="body" style={styles.bold}>
                  {row.label}
                </Text>
                {/* Never separated from the label — see the note above. */}
                <Text variant="caption" color="tertiary">
                  {row.subtitle}
                </Text>
                {/* A PROMPT, NOT A VALUE. It used to open with "None yet."
                    and then say what to do — but the row has no number beside
                    it, which states the absence already. Saying it in words
                    too made the sentence about what is missing rather than
                    about the way out of it, and pushed the useful half onto a
                    second line. */}
                {!earned ? (
                  <Text variant="caption" color="tertiary" style={styles.value}>
                    {FIRST_STEP[row.axis] ?? "Not started."}
                  </Text>
                ) : null}
              </View>

              {/* The number gets its own column and the axis hue, because it is
                  the thing somebody opened this card to see. `accent.text`, not
                  `accent.fill` — the bright fills are a documented contrast
                  failure as foreground on the paper scheme. */}
              {earned ? (
                <View style={styles.valueColumn}>
                  <Text variant="h3" color={accent.text}>
                    {row.count}
                  </Text>
                  {/* The date on its own line, under its number. A `totalLine`
                      helper used to join the two into "11 · last Tuesday" for
                      a single-column layout; with the number in a column of its
                      own it had nothing left to join, so it is gone rather than
                      kept around to be picked apart by a caller. */}
                  {lastAtPhrase(row.lastAt) ? (
                    <Text variant="caption" color="tertiary">
                      {lastAtPhrase(row.lastAt)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default GrowthTotalsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  flex1: { flex: 1 },
  bold: { fontWeight: "600" },
  eyebrow: {
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xxs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  invite: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
  },
  rows: { gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    // `radius.card`, matching the weekly stat badges — `radius.input` made
    // these read as form fields sitting in a card.
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  valueColumn: { alignItems: "flex-end", gap: spacing.xxs },
  value: { marginTop: spacing.xs },
});
