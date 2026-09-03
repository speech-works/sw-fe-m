import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Text,
  Icon,
  Gradient,
  castShadow,
  radius,
  size,
  spacing,
  borderWidth,
  typography,
  useTheme,
  useMotion,
  duration,
  easing,
  withAlpha,
  mix,
} from "../../design-system";

/**
 * ===========================================================================
 * MONTHLY OR YEARLY, AS TWO CARDS
 * ---------------------------------------------------------------------------
 * ── THEY ARE THE SAME OBJECT AS THE PAGE BEFORE THEM ───────────────────────
 * Page two of this pager lists what membership includes as three cards: a
 * tinted square tile on the left, a label and a second line beside it, a
 * `radius.card` corner and a hairline. These are that card, carrying a price.
 *
 * Every number is `BenefitRows`' own, not a new set: the `DENSITY` table below
 * is copied from it verbatim (compact 8/4/36, roomy 16/12/56), the tile takes
 * `radius.input` at roomy exactly as that one does, the text block is
 * `flex: 1` with a 2pt gap, and the two lines are `label` over `caption` at a
 * 17pt second line. Somebody swiping from page two to page three should not be
 * able to tell the cards changed component, so when you retune one, retune
 * both.
 *
 * ── WHAT SELECTION LOOKS LIKE ──────────────────────────────────────────────
 * `BenefitRows` already has a raised state: its lead row takes an 8% accent
 * fill and a 35% accent border. This is that move in the tier's gold, plus the
 * two things a card needs that a list row does not.
 *
 * The tile FLIPS. Unselected it is a gold tint holding a faint check; selected
 * it is solid gold holding a dark one, which is the app's dark-on-bright rule
 * and the same flip `MembershipRow`'s badge makes between free and member. A
 * tile that inverts is readable at arm's length, which a border alone is not.
 *
 * And the chosen card LIFTS, on a soft gold glow. That is the one piece of
 * pure decoration here, and it is what stops the block reading as a form.
 *
 * ── WHY THIS IS NOT A BAR ──────────────────────────────────────────────────
 * It was, for one build: two proportional rails borrowed from
 * `CallLengthHero`, monthly full and yearly at 58%, with the saving read off
 * the gap at the end. The arithmetic was honest and the drawing was wrong. A
 * bar is A PICTURE OF A QUANTITY, and page one is allowed one because nothing
 * on page one is pressable. Here the reader is not being shown a fact, they
 * are being asked to choose, and a chart does not look like a choice however
 * much chrome you put around it. The saving is a badge again, which is the
 * right weight for a number that qualifies an option rather than being one.
 *
 * ── THE BILLED AMOUNT IS THE HEADLINE (APP STORE GUIDELINE 3.1.2(c)) ────────
 * The total billed amount must be the primary headline figure on the card.
 * Calculated per-month equivalents may only be shown in subordinate size/position
 * (in `footnote`), per Apple App Store review requirements.
 *
 * ── THE MOTION ─────────────────────────────────────────────────────────────
 * Selection animates COLOUR AND OPACITY ONLY, 200ms: the fill, the border, the
 * tile, the two checks crossfading inside it, and the glow. Not size, not
 * layout. A card that grows when picked shoves its neighbour, and the reader's
 * eye chases the movement instead of reading the price they just chose. Press
 * feedback is a scale on the pressed card, which is the one place motion
 * belongs here.
 * ===========================================================================
 */

/**
 * Copied from `BenefitRows.DENSITY`. Two entries rather than three: there is no
 * middle case here, because the only caller picks by screen height.
 */
const DENSITY = {
  compact: { pad: spacing.sm, gap: spacing.xs, tile: 36 },
  roomy: { pad: spacing.lg, gap: spacing.md, tile: 56 },
} as const;

/** `BenefitRows`' second line: its own line height, not `caption`'s. */
const SECOND_LH = 17;

/** How far the corner badge overhangs the card's top edge. */
const BADGE_LIFT = 6;

/**
 * Exact rendered height of the pair at a given density, so a caller laying out
 * a band around these can ask instead of hardcoding a guess that goes stale the
 * first time this padding changes. Mirrors `benefitRowsHeight`.
 */
export function planCardsHeight(compact: boolean): number {
  const d = compact ? DENSITY.compact : DENSITY.roomy;
  const textH = typography.label.lineHeight + 2 + SECOND_LH;
  const card = d.pad * 2 + Math.max(d.tile, textH) + borderWidth.thin * 2;
  return card * 2 + d.gap + BADGE_LIFT;
}

export interface PlanCardProps {
  /** e.g. "Monthly" */
  title: string;
  /** The big figure, e.g. "₹199" or "₹125". */
  price: string;
  /** Small suffix on the figure, e.g. "/mo". Omit for none. */
  priceSuffix?: string;
  /** The second line, e.g. "₹1,499 a year". Omit for none. */
  footnote?: string;
  /** e.g. "SAVE 37%". Rendered as a corner badge. Omit for none. */
  tag?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Tighter padding, tile and gaps, for a screen with no height to spare. */
  compact?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  price,
  priceSuffix,
  footnote,
  tag,
  selected,
  onPress,
  disabled,
  compact = false,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const gold = colors.premium.gold;
  const d = compact ? DENSITY.compact : DENSITY.roomy;

  // Driven from the `selected` prop rather than from the press, so a tap on the
  // OTHER card deselects this one with the same transition it selected with.
  const progress = useDerivedValue(() =>
    reduced ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, {
      duration: duration.base,
      easing: easing.out,
    }),
  );

  // Resolved on the JS thread, ON PURPOSE. `withAlpha` and `mix` are plain
  // functions, so calling one inside a worklet throws "tried to synchronously
  // call a non-worklet function on the UI thread" the moment the card mounts.
  // The interpolation itself is the only thing that belongs on the UI thread.
  const restFill = colors.surface.elevated;
  /* `BenefitRows`' lead row is `withAlpha(accent, 0.08)`, and this is that
     value flattened to an opaque hex rather than left translucent. It has to be
     opaque because the glow behind the card is painted in it: a see-through
     card would show the glow's own box as a lighter rectangle instead of only
     the light it throws. */
  const onFill = mix(restFill, gold, 0.1);
  const restBorder = colors.border.hairline;
  const onBorder = withAlpha(gold, 0.45);
  const restTile = withAlpha(gold, 0.12);
  const restCheck = withAlpha(gold, 0.42);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [restFill, onFill]),
    borderColor: interpolateColor(progress.value, [0, 1], [restBorder, onBorder]),
  }));

  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [restTile, gold]),
  }));

  /* The two checks crossfade rather than one icon changing colour. An `Icon`'s
     `color` is a plain prop, so swapping it would snap dark-to-light in a
     single frame while the tile underneath was still 200ms from arriving. */
  const restIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
  }));
  const onIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const glowStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const iconSize = compact ? size.icon : size.iconLg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={`${title}, ${price}${priceSuffix ?? ""}${footnote ? `, ${footnote}` : ""}${tag ? `, ${tag}` : ""}`}
    >
      {({ pressed }) => (
        // The press scale lives on the frame so the corner badge and the glow
        // travel with the card. Scaling only the card left the badge pinned to
        // a corner the card had just moved away from.
        <Animated.View style={[styles.frame, pressed && !reduced && styles.pressed]}>
          {/* The lift. A sibling BEHIND the card rather than a shadow on it:
              `castShadow` compiles to a `boxShadow` string, which Reanimated
              cannot interpolate, and a view that both casts a shadow and clips
              a rounded corner renders square on iOS. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              { backgroundColor: onFill },
              castShadow(gold, { y: 8, blur: 24, alpha: 0.3, elevation: 6 }),
              glowStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.card,
              { padding: d.pad, gap: compact ? spacing.sm : spacing.lg },
              cardStyle,
            ]}
          >
            {/* A soft top-edge gloss, so the card catches light rather than
                being drawn. Written out instead of `token="sheen"` because that
                token resolves to 50% white on the light scheme, and this card
                sits on a ground that does not change with the scheme. */}
            <Gradient
              colors={[
                withAlpha(colors.premium.onGround, 0.05),
                withAlpha(colors.premium.onGround, 0),
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <Animated.View
              style={[
                styles.tile,
                {
                  width: d.tile,
                  height: d.tile,
                  borderRadius: compact ? radius.md : radius.input,
                },
                tileStyle,
              ]}
            >
              <Animated.View style={[styles.icon, restIconStyle]}>
                <Icon name="check" size={iconSize} color={restCheck} />
              </Animated.View>
              <Animated.View style={[styles.icon, onIconStyle]}>
                <Icon name="check" size={iconSize} color={colors.premium.onGold} />
              </Animated.View>
            </Animated.View>

            <View style={styles.text}>
              <Text variant="label" color={selected ? gold : colors.text.primary}>
                {title}
              </Text>
              {/* Always rendered, even when empty, so the two cards stay the
                  same height. A card that is shorter than its neighbour reads
                  as the lesser option before a word of it has been read. */}
              <Text variant="caption" color="tertiary" style={styles.second} numberOfLines={1}>
                {footnote ?? " "}
              </Text>
            </View>

            <Text variant="h3" color="primary">
              {price}
              {priceSuffix ? (
                <Text variant="caption" color="tertiary">
                  {priceSuffix}
                </Text>
              ) : null}
            </Text>
          </Animated.View>

          {/* Last child, so it draws over the card's edge. Geometry is the
              app's existing corner badge (`cornerBadge` in CognitivePractice /
              Exposure / PracticeGrid), with its -6 lift moved onto the frame
              because the card clips its own gloss. */}
          {tag ? (
            <View style={[styles.badge, { backgroundColor: gold }]}>
              <Text variant="label" color={colors.premium.onGold}>
                {tag}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
};

export interface PlanPillsProps {
  children: React.ReactNode;
  /** Tighter gap between the cards. Pass alongside each card's own. */
  compact?: boolean;
}

/** The group. Two cards, stacked, sharing one selection. */
export const PlanPills: React.FC<PlanPillsProps> & { Card: typeof PlanCard } = ({
  children,
  compact = false,
}) => (
  <View
    style={{ gap: compact ? DENSITY.compact.gap : DENSITY.roomy.gap }}
    accessibilityRole="radiogroup"
  >
    {children}
  </View>
);

PlanPills.Card = PlanCard;

export default PlanPills;

const styles = StyleSheet.create({
  /* Holds the badge and the glow alongside the card, so neither is clipped by
     the card's own `overflow: hidden`. Its only geometry is the room the badge
     needs above the card. */
  frame: { paddingTop: BADGE_LIFT },
  pressed: { transform: [{ scale: 0.97 }] },
  /* Exactly the card's box, one layer down. Not `absoluteFill`: the frame's
     padding means the card does not start at the frame's top. */
  glow: {
    position: "absolute",
    top: BADGE_LIFT,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
  },
  // `BenefitRows.row`, with `overflow: hidden` added to clip the gloss.
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    overflow: "hidden",
  },
  // A fixed square, like the rows on page two: letting it stretch would make
  // the two tiles visibly different sizes when one card's text is longer.
  tile: { alignItems: "center", justifyContent: "center" },
  // Both checks stack in the same box so the crossfade happens in place.
  icon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  second: { lineHeight: SECOND_LH },
  // The app's `cornerBadge`, verbatim, with the -6 lift moved to the frame.
  badge: {
    position: "absolute",
    top: 0,
    right: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
});
