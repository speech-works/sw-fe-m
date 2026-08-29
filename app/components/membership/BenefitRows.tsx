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
  borderWidth,
  typography,
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
  /**
   * The other direction from {@link compact}: fuller padding, a bigger tile and
   * more air between rows, for a surface with height to spare. The paywall's
   * middle page is 450pt tall on a 17 Pro Max and the default density left a
   * third of it empty, which reads as a rendering fault rather than as room.
   *
   * Ignored when `compact` is set. A caller that passes both is asking for two
   * opposite things and compact is the one that prevents clipping.
   */
  roomy?: boolean;
}

/**
 * The three densities, as the numbers the styles below use. Exported through
 * {@link benefitRowsHeight} so a caller that has to lay out a band AROUND these
 * rows can ask how tall they are instead of hardcoding a guess that goes stale
 * the first time this padding changes.
 */
const DENSITY = {
  compact: { pad: spacing.sm, gap: spacing.xs, tile: 36 },
  default: { pad: spacing.md, gap: spacing.sm, tile: 44 },
  roomy: { pad: spacing.lg, gap: spacing.md, tile: 56 },
} as const;

export type BenefitRowsDensity = keyof typeof DENSITY;

/** The label line, its 2pt gap, and the one-line second line. */
const SECOND_LH = 17;
const TEXT_H = typography.label.lineHeight + 2 + SECOND_LH;

/**
 * Exact rendered height at a given density, for the short (one-line) second
 * line this component draws by default.
 *
 * Deliberately NOT valid for `long`, whose descriptions wrap to a count that
 * depends on the width they land in. A caller that needs to reserve space must
 * either measure that case or not use it.
 */
export function benefitRowsHeight(density: BenefitRowsDensity): number {
  const d = DENSITY[density];
  const row = d.pad * 2 + Math.max(d.tile, TEXT_H) + borderWidth.thin * 2;
  const n = MEMBERSHIP_BENEFITS.length;
  return row * n + d.gap * (n - 1);
}

export const BenefitRows: React.FC<BenefitRowsProps> = ({
  leadId,
  long = false,
  animate = false,
  staggerFrom = 0,
  compact = false,
  roomy = false,
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
    <View style={[styles.list, compact ? styles.listCompact : roomy && styles.listRoomy]}>
      {ordered.map((benefit, i) => {
        const isLead = !!leadId && benefit.id === leadId;
        const accent = colors.accent[benefit.accentKey as BenefitRowsAccent];

        return (
          <Animated.View
            key={benefit.id}
            entering={animate ? motion.stagger(staggerFrom + i) : undefined}
            style={[
              styles.row,
              compact ? styles.rowCompact : roomy && styles.rowRoomy,
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
                compact ? styles.tileCompact : roomy && styles.tileRoomy,
                { backgroundColor: withAlpha(accent, isLead ? 0.18 : 0.12) },
              ]}
            >
              <Icon
                name={icons[benefit.iconKey as keyof typeof icons]}
                size={compact ? size.iconSm : roomy ? size.iconLg : size.icon}
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
  // Every number below comes from DENSITY, so `benefitRowsHeight` and what is
  // actually drawn cannot drift apart.
  list: { gap: DENSITY.default.gap },
  listCompact: { gap: DENSITY.compact.gap },
  listRoomy: { gap: DENSITY.roomy.gap },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    padding: DENSITY.default.pad,
  },
  rowCompact: { padding: DENSITY.compact.pad, gap: spacing.sm },
  rowRoomy: { padding: DENSITY.roomy.pad, gap: spacing.lg },
  // A fixed square. The rows have different text lengths, and letting the tile
  // stretch to the row would make the three icons visibly different sizes.
  tile: {
    width: DENSITY.default.tile,
    height: DENSITY.default.tile,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tileCompact: {
    width: DENSITY.compact.tile,
    height: DENSITY.compact.tile,
    flexBasis: DENSITY.compact.tile,
  },
  tileRoomy: {
    width: DENSITY.roomy.tile,
    height: DENSITY.roomy.tile,
    flexBasis: DENSITY.roomy.tile,
    borderRadius: radius.input,
  },
  text: { flex: 1, gap: 2 },
  second: { lineHeight: SECOND_LH },
});
