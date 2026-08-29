import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import {
  Text,
  Icon,
  icons,
  Gradient,
  radius,
  size,
  space,
  spacing,
  borderWidth,
  useTheme,
  withAlpha,
} from "../../design-system";

/**
 * ===========================================================================
 * THE MEMBERSHIP ROW, IN THE TIER'S OWN CLOTHES
 * ---------------------------------------------------------------------------
 * Settings' one unconditional route into the paywall (see the call site for
 * why it can never be hidden). It was a `ListItem` like the eight rows under
 * it: warm card, grey chip, grey "Free" on the right.
 *
 * ── WHY IT IS NOT A LISTITEM ANY MORE ──────────────────────────────────────
 * That row is the only thing on the screen selling something, and it looked
 * exactly like "Preferences". A list teaches you to skim it (every row the
 * same weight, the same chip, the same chevron) and the one row you want found
 * is the one that discipline hides. So this one steps out of the list's skin
 * and wears the tier's: gold on obsidian, the same identity the paywall's plan
 * page and the buy button already carry, so arriving there feels like having
 * pushed on the thing you were looking at.
 *
 * ── AND WHY IT KEEPS THE LIST'S GEOMETRY ───────────────────────────────────
 * Every number below is `ListItem`'s own: `size.row`, `space.cardPad`,
 * `size.avatarChip`, `space.iconText`, `radius.md` on the chip. It is a
 * different SKIN, not a different shape, so the left column still aligns with
 * the rows beneath and the group rhythm is untouched. Deliberately not a
 * `tone="premium"` prop on `ListItem`: that primitive backs ~40 rows across
 * the app and the premium tier is scoped to the places that sell.
 *
 * ── THE INK IS INVARIANT, BECAUSE THE GROUND IS ────────────────────────────
 * `premium.ground` is the same obsidian in both schemes on purpose. Its text
 * therefore CANNOT be `text.primary`, which is white on ink and near-black on
 * paper: that renders correctly in dark and as charcoal-on-obsidian in light.
 * `premium.onGround` / `onGroundMuted` exist for exactly this.
 *
 * ===========================================================================
 * NO EDGE, ONE LIGHT SOURCE  (the "sheen" build)
 * ---------------------------------------------------------------------------
 * ── THE GOLD OUTLINE IS GONE ───────────────────────────────────────────────
 * It was doing the job the SURFACE should be doing. A hairline is how you tell
 * two things apart when they are made of the same stuff, and this card is not:
 * it is obsidian sitting on a warm ink canvas, at a contrast no border is
 * needed to explain. What the outline added was a second, competing gold
 * shape around a card that already has gold in the chip, the badge and the
 * text, which is what made it read as a warning banner rather than a surface.
 *
 * ── AND A SHEEN TOOK ITS PLACE ─────────────────────────────────────────────
 * The card is lit from the top left: the gradient runs `groundMid` into
 * `ground`, and a soft band of white crosses the upper left at the angle that
 * implies. That band is the whole trick. A flat dark rectangle reads as a hole
 * cut in the screen; the same rectangle with one highlight on it reads as a
 * panel with a surface, and a surface is the thing that can look expensive.
 *
 * The band's geometry is the app's existing one, from `ProgramSalesFlow`'s buy
 * button (`SHEEN_W` 84, `top`/`bottom` -24, 18 degrees, a three stop
 * transparent/light/transparent ramp). The one number that differs is the
 * alpha, and it differs for a reason: that band SWEEPS, and a highlight that
 * is only on screen for 600ms can be strong. This one is parked, and a parked
 * 50% stripe is a stripe.
 *
 * ── THE CHEVRON IS GONE TOO ────────────────────────────────────────────────
 * With the outline off, the right end was carrying a badge and an arrow that
 * both meant "there is more of this elsewhere". The badge is the one that also
 * says something the reader does not already know, so it stays and the arrow
 * goes. The row is still a `PressableScale` with `accessibilityRole="button"`,
 * so nothing about it being a control is being left to the chevron to say.
 * ===========================================================================
 */

/** The sheen band. Geometry copied from `ProgramSalesFlow`'s buy sweep. */
const SHEEN_W = 84;

export interface MembershipRowProps {
  /**
   * `null` while the wallet call is still out. The badge renders nothing until
   * it knows: this is the first row under the profile card, and "Free" flashing
   * on a paying member's screen is worse than a beat of no badge at all.
   */
  isMember: boolean | null;
  onPress: () => void;
}

export const MembershipRow: React.FC<MembershipRowProps> = ({ isMember, onPress }) => {
  const { colors } = useTheme();
  const gold = colors.premium.gold;

  /* A member's badge is FILLED, a prospect's is outlined.
     Same shape, same place, and the difference is legible without reading it:
     one is a state you own, the other is a state you are in. Dark ink on the
     gold fill, per the app's dark-on-bright rule. `onGold` is the tier's own
     obsidian, which measures 10.1:1 on the gold.

     This is now the ONLY outline on the card, which is the point: with the
     border off, the one ring left is the one carrying information. */
  const badge = isMember
    ? { fill: gold, border: gold, ink: colors.premium.onGold, text: "Member" }
    : { fill: "transparent", border: colors.premium.goldBorder, ink: gold, text: "Free" };

  return (
    <PressableScale
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={
        isMember === null
          ? "Membership"
          : `Membership, ${isMember ? "member" : "free"}`
      }
    >
      {/* groundMid to ground, top-left to bottom-right. The flat ground read as
          a dark rectangle among the warm cards rather than as a MATERIAL; the
          two-stop wash is what gives it a surface to catch light on. Same pair
          the paywall's plan page uses for its ground and its wash, so the two
          surfaces are recognisably the same object. */}
      <Gradient
        colors={[colors.premium.groundMid, colors.premium.ground]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* The light the gradient implies, made visible. White, not gold: this is
          a reflection off the surface, and tinting it would read as a third
          gold object rather than as the room the card is sitting in. */}
      <View style={styles.sheen} pointerEvents="none">
        <Gradient
          colors={[
            withAlpha(colors.premium.onGround, 0),
            withAlpha(colors.premium.onGround, 0.07),
            withAlpha(colors.premium.onGround, 0),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.row}>
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.premium.goldTint, borderColor: colors.premium.goldBorder },
          ]}
        >
          <Icon name={icons.pro} size={22} color={gold} />
        </View>

        <View style={styles.text}>
          <Text variant="title" color={colors.premium.onGround}>
            Membership
          </Text>
          {/* One sentence for both states, deliberately. A sublabel that
              switched between a pitch and a receipt would show the wrong one
              for as long as the wallet call takes. */}
          <Text
            variant="bodySm"
            color={colors.premium.onGroundMuted}
            style={styles.sub}
          >
            What membership includes
          </Text>
        </View>

        {isMember === null ? null : (
          <View
            style={[styles.badge, { backgroundColor: badge.fill, borderColor: badge.border }]}
          >
            <Text variant="caption" color={badge.ink} style={styles.badgeText}>
              {badge.text}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
};

export default MembershipRow;

const styles = StyleSheet.create({
  // `overflow: hidden` clips the gradient AND the sheen band to the radius.
  // The band is deliberately over-tall and rotated, so it depends on this.
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  /* Parked, not swept. Sits over the chip and the start of the title, which is
     where the gradient's own light is coming from. */
  sheen: {
    position: "absolute",
    top: -24,
    bottom: -24,
    left: 24,
    width: SHEEN_W,
    transform: [{ rotate: "18deg" }],
  },
  // Straight from `ListItem`. Do not retune these in isolation: the left column
  // has to line up with the rows in the groups below.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    minHeight: size.row,
    paddingHorizontal: space.cardPad,
    paddingVertical: space.cardPad,
  },
  chip: {
    width: size.avatarChip,
    height: size.avatarChip,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thin,
  },
  text: { flex: 1 },
  sub: { marginTop: space.titleSub },
  badge: {
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { letterSpacing: 0.3 },
});
