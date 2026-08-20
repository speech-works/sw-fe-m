import React from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  Text,
  Icon,
  icons,
  radius,
  size,
  spacing,
  useTheme,
  useMotion,
  withAlpha,
} from "../../design-system";
import { MEMBERSHIP_BENEFITS } from "../../services/membershipOffer";

/**
 * ===========================================================================
 * WHAT MEMBERSHIP INCLUDES, AS THREE ROWS
 * ---------------------------------------------------------------------------
 * One component, used by the sheet AND by the screen that charges.
 *
 * ── WHY IT IS SHARED, NOT COPIED ───────────────────────────────────────────
 * It used to be copied. The sheet listed three benefits and the Payments
 * screen listed four, and the fourth was "Guided programs: all of them" —
 * a thing membership does not include. That claim survived a rewrite of the
 * sheet purely because the two lists were separate arrays in separate files,
 * and the one that mattered was the one nobody looked at: the screen taking
 * the money. Two copies of a sales claim is two chances to be wrong, and the
 * wrong one is always the expensive one.
 *
 * So the sentences live in `membershipOffer.ts` and the pixels live here.
 *
 * ── THE LEAD ROW ───────────────────────────────────────────────────────────
 * One row can be raised. It gets the accent border and a lifted tile, because
 * a person who arrived from a locked technique should see the library answer
 * first without having to find it. Everything else is still on screen: the
 * lead is emphasis, never omission.
 * ===========================================================================
 */

export type BenefitRowsAccent = "purple" | "info" | "warning";

export interface BenefitRowsProps {
  /**
   * Which benefit to raise. Omit for an unweighted list where nothing leads,
   * which is right when there was no triggering context.
   */
  leadId?: string;
  /**
   * Long descriptions instead of the short scan lines. For surfaces with the
   * room, e.g. a full screen rather than a dock.
   */
  long?: boolean;
  /**
   * Stagger the rows in. Off by default: a component cannot know whether it is
   * mounting into a screen that just appeared or re-rendering mid-scroll, and
   * an entrance that replays on a re-render is worse than none.
   */
  animate?: boolean;
  /** Index of the first row, so a caller can continue an existing stagger. */
  staggerFrom?: number;
  /**
   * Tighter padding and gaps, for a screen that has to fit all three rows in a
   * fixed band. On a 667pt phone the roomy density overflowed by about 11pt and
   * clipped the third row, which is the worst possible one to lose: the list is
   * the whole argument, and a reader who sees two of three is being shown less
   * than the offer contains.
   */
  compact?: boolean;
}

export const BenefitRows: React.FC<BenefitRowsProps> = ({
  leadId,
  long = false,
  animate = false,
  staggerFrom = 0,
  compact = false,
}) => {
  const { colors } = useTheme();
  const motion = useMotion();

  // Lead first, the rest in their declared order. Ordering here rather than in
  // the caller keeps "what leads" a one-word prop everywhere it is used.
  const ordered = leadId
    ? [
      ...MEMBERSHIP_BENEFITS.filter((b) => b.id === leadId),
      ...MEMBERSHIP_BENEFITS.filter((b) => b.id !== leadId),
    ]
    : [...MEMBERSHIP_BENEFITS];

  return (
    <View style={[styles.list, compact && styles.listCompact]}>
      {ordered.map((benefit, i) => {
        const isLead = !!leadId && benefit.id === leadId;
        const accent = colors.accent[benefit.accentKey as BenefitRowsAccent];

        return (
          <Animated.View
            key={benefit.id}
            entering={animate ? motion.stagger(staggerFrom + i) : undefined}
            style={[
              styles.row,
              compact && styles.rowCompact,
              {
                backgroundColor: isLead
                  ? withAlpha(accent, 0.08)
                  : colors.surface.elevated,
                borderColor: isLead ? withAlpha(accent, 0.35) : colors.border.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.tile,
                compact && styles.tileCompact,
                { backgroundColor: withAlpha(accent, isLead ? 0.18 : 0.12) },
              ]}
            >
              <Icon
                name={icons[benefit.iconKey as keyof typeof icons]}
                size={compact ? size.iconSm : size.icon}
                color={accent}
              />
            </View>

            <View style={styles.text}>
              <Text variant="label" color="primary">
                {benefit.label}
              </Text>
              <Text variant="caption" color="tertiary" style={styles.second}>
                {long ? benefit.desc : benefit.short}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

export default BenefitRows;

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  listCompact: { gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  rowCompact: { padding: spacing.sm, gap: spacing.sm },
  // A fixed square. The rows have different text lengths, and letting the tile
  // stretch to the row would make the three icons visibly different sizes.
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tileCompact: { width: 36, height: 36, flexBasis: 36 },
  text: { flex: 1, gap: 2 },
  second: { lineHeight: 17 },
});
