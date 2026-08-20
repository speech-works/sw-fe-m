import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import PressableScale from "./PressableScale";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { useUserStore } from "../stores/user";
import { isMember } from "../util/functions/membership";
import { purchasesAvailable } from "../services/purchases";
import { canAskForMembership, recordMembershipAsk } from "../services/membershipAsk";
import {
  Text,
  Icon,
  icons,
  radius,
  size,
  spacing,
  useTheme,
  elevation,
  accentEdge,
} from "../design-system";

/**
 * ===========================================================================
 * THE ASK, MOVED TO A MOMENT WORTH ASKING IN
 * ---------------------------------------------------------------------------
 * Today the only place we sell membership is the instant somebody runs out of
 * practice. That is the worst moment available: they wanted to keep going, the
 * app stopped them, and the next thing they see is a price. The price gets
 * attached to the frustration.
 *
 * This is the same offer after something went WELL. It is a dock, not a sheet,
 * so it never blocks the screen and never interrupts the thing they just
 * finished. Tapping it opens the full offer; ignoring it costs nothing.
 *
 * ── THE FOUR REASONS IT STAYS QUIET ────────────────────────────────────────
 *   already a member      nothing to sell
 *   cannot buy anything   payments off, or the store is unreachable
 *   asked this week       one ask a week, from anywhere (membershipAsk.ts)
 *   still deciding        renders nothing until all three are answered, so it
 *                         never appears and then vanishes
 *
 * ── WHY IT RECORDS ON APPEARANCE ───────────────────────────────────────────
 * Being SEEN is the ask. If somebody saw the offer and carried on practising,
 * they answered it, and the answer was no for now. Recording on tap instead
 * would mean the people least interested get asked every single session.
 * ===========================================================================
 */

export interface MembershipDockProps {
  /**
   * One short line about what they just did, e.g. "Four days this week".
   * Optional: with nothing true to say, the dock says nothing rather than
   * inventing praise.
   */
  note?: string;
}

export const MembershipDock: React.FC<MembershipDockProps> = ({ note }) => {
  const { colors } = useTheme();
  const { emit } = useEventStore();
  const user = useUserStore((s) => s.user);

  // `null` means "not decided yet", which is deliberately different from
  // `false`. Rendering on a default of `true` would flash the dock and then
  // pull it away from anyone who is already a member.
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const sellable = purchasesAvailable() && !isMember(user);

  useEffect(() => {
    if (!sellable) {
      setAllowed(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const ok = await canAskForMembership();
      if (cancelled) return;
      setAllowed(ok);
      // Recorded here, on the render that shows it, not on the tap.
      if (ok) void recordMembershipAsk();
    })();

    return () => {
      cancelled = true;
    };
  }, [sellable]);

  if (!sellable || allowed !== true) return null;

  return (
    <Animated.View
      // Enters from below, after the celebration has had its moment. The delay
      // is the point: arriving at the same instant as the tick would make the
      // congratulation look like the setup for a sales line.
      entering={FadeInDown.delay(900).duration(320)}
      style={[
        styles.dock,
        elevation.e2,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default },
      ]}
    >
      <View style={styles.text}>
        <Text variant="label" color="primary" numberOfLines={1}>
          Ready for a longer call?
        </Text>
        <Text variant="caption" color="tertiary" numberOfLines={1}>
          {note ?? "Ten minutes instead of three"}
        </Text>
      </View>

      <PressableScale
        onPress={() => emit(EVENT_NAMES.SHOW_PREMIUM_UPSELL)}
        accessibilityRole="button"
        accessibilityLabel="See what membership includes"
        // accentEdge is required by the design system on any bright fill: a
        // solid accent against the surface needs a defined edge or it reads as
        // a glowing blob at small sizes. paperEdges.test.ts enforces it.
        style={[styles.cta, { backgroundColor: colors.accent.warning }, accentEdge(colors, "warning")]}
      >
        <Text variant="label" color={colors.accentOn.warning}>
          See
        </Text>
        <Icon name={icons.chevronRight} size={size.iconXs} color={colors.accentOn.warning} />
      </PressableScale>
    </Animated.View>
  );
};

export default MembershipDock;

const styles = StyleSheet.create({
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
