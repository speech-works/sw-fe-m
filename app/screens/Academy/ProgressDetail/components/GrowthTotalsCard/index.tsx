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
  type IconName,
} from "../../../../../design-system";
import { GrowthAxis, GrowthTotals, visibleTotals } from "../../../../../api/dailyPlan";
import { FIRST_STEP, totalLine } from "../../../../../util/growth/format";

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
  [GrowthAxis.REGULAR]: icons.routine,
};

interface Props {
  totals: GrowthTotals | null;
}

const GrowthTotalsCard: React.FC<Props> = ({ totals }) => {
  const { colors } = useTheme();
  const rows = visibleTotals(totals);

  // Nothing loaded yet, or the call failed. Render nothing rather than an
  // error: this is a card nobody asked for, and the rest of the report is
  // perfectly usable without it.
  if (!totals || rows.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            WHAT YOU&apos;VE DONE
          </Text>
          <Text variant="h3">Three things we watch</Text>
          {/* The differentiator, said to the user instead of only living in a
              test file. It is also the sentence that stops somebody reading
              these three numbers as a fluency score. */}
          <Text variant="bodySm" color="secondary" style={styles.subhead}>
            None of them are about how smooth you sound.
          </Text>
        </View>
        <Icon name={icons.growth} size={size.icon} color={colors.text.tertiary} />
      </View>

      {!totals.hasAny ? (
        <View style={[styles.invite, { backgroundColor: colors.surface.default }]}>
          <Icon name={icons.tip} size={16} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary" style={styles.flex1}>
            We fill this in from what you actually do — not from anything you
            told us. Do one thing and there&apos;ll be something here.
          </Text>
        </View>
      ) : null}

      <View style={styles.rows}>
        {rows.map((row) => (
          <View
            key={row.axis}
            style={[styles.row, { backgroundColor: colors.surface.default }]}
          >
            <View style={styles.rowIcon}>
              <Icon
                name={AXIS_ICON[row.axis] ?? icons.growth}
                size={18}
                color={colors.text.secondary}
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
              <Text
                variant="bodySm"
                color={row.count > 0 ? "primary" : "secondary"}
                style={styles.value}
              >
                {row.count > 0
                  ? totalLine(row.axis, row.count, row.lastAt)
                  : (FIRST_STEP[row.axis] ?? "Not yet.")}
              </Text>
            </View>
          </View>
        ))}
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
  subhead: { marginTop: spacing.xxs },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  invite: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.input,
    padding: spacing.lg,
  },
  rows: { gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: radius.input,
    padding: spacing.lg,
  },
  rowIcon: { paddingTop: spacing.xxs },
  value: { marginTop: spacing.xs },
});
