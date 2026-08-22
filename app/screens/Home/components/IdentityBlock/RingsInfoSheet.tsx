import React from "react";
import { StyleSheet, View } from "react-native";
import {
  size,
  Sheet,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  ProgressRing,
} from "../../../../design-system";
import PressableScale from "../../../../components/PressableScale";
import { UserAvatar } from "../../../../components/UserAvatar";
import type { AvatarManifest } from "../../../../types/avatar";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Still the ring's fill — a proportion is exactly what an arc is for. */
  staminaPercentage: number;
  /**
   * How many practices they can still start. Resolved by the caller, which
   * already holds the user and the live stamina estimate; this component stays
   * presentational and never does the division itself.
   */
  practicesLeft: number;
  /** Members-only countdown to full, or "" when there is nothing to count. */
  rechargeTimeLeft: string;
  energyHue: string;
  energyLabel: string;
  /** So the diagram shows the user's own character, exactly as the card does. */
  avatarManifest?: AvatarManifest | null;
  /**
   * THE SHEET CARRIES THE CARD'S OTHER DESTINATIONS.
   *
   * The card is now two regions — the avatar goes to the studio, everything else
   * comes here — which means the paths that used to be tiny nested targets on a
   * 159pt card live in here instead, at full size and with room to say what they
   * are. Both close the sheet BEFORE navigating; see `onDismissed`.
   */
  onEditAvatar: () => void;
  /** Omitted for members, who have nothing to buy. */
  onUpgrade?: () => void;
  /** Fires after the sheet has fully animated out — where navigation belongs. */
  onDismissed?: () => void;
}

/**
 * ============================================================================
 * A PICTURE OF THE CARD, NOT A DESCRIPTION OF IT
 * ----------------------------------------------------------------------------
 * The card is 159pt wide and carries a ring, an avatar and a percentage with no
 * room to say what any of them are. This says it, and it POINTS RATHER THAN
 * ASSERTS: the real ring is drawn with the same component and the same value the
 * card is showing this second, with the user's own character inside it. No
 * wording here can contradict the picture, because it is the picture.
 *
 * ── IT USED TO DRAW TWO RINGS, AND CARRIED THE MACHINERY FOR IT ─────────────
 * Today (segmented) outside, Energy inside, with a leader line running from each
 * arc to its own label, and trigonometry to work out how far each line had to
 * reach back to actually touch its own curve.
 *
 * The Today ring is gone from the card, so all of that went with it. What was
 * left behind for one ring was worse than either: a label column still pinned to
 * the ring's height and spread with `space-between`, which with a single child
 * pushes it to the top — so the text sat high against a 112pt ring with dead
 * space under it. And a leader line that pointed at the only ring there is,
 * which explains nothing.
 *
 * ── SO: ONE ROW ────────────────────────────────────────────────────────────
 * Ring, gap, text, vertically centred on each other. The ring is sized to the
 * text beside it rather than to a second ring that no longer exists.
 * ============================================================================
 */

const DIAGRAM = {
  /**
   * 84, down from the 112 it needed as the OUTER of two.
   *
   * A ring is now beside a two-line label rather than around another ring, so
   * its job is to balance that text, not to contain something. At 112 it was
   * two and a half times the height of the words next to it and the row read as
   * a picture with a caption stuck on the side.
   */
  ring: { size: 84, stroke: 6 },
  avatar: 58,
};

export const RingsInfoSheet: React.FC<Props> = ({
  visible,
  onClose,
  staminaPercentage,
  practicesLeft,
  rechargeTimeLeft,
  energyHue,
  energyLabel,
  avatarManifest,
  onEditAvatar,
  onUpgrade,
  onDismissed,
}) => {
  const { colors } = useTheme();

  /**
   * ONE RING NOW. The today ring was removed from the card: its segments were
   * nested rather than independent, so one interview filled all three and a
   * reading filled one, which made it a ladder drawn as a checklist. See the
   * note in IdentityBlock.
   *
   * The diagram machinery below still handles a stack of rings with leader
   * lines to their labels, because the avatar sits inside the ring either way.
   * It just has one of each to draw.
   */
  const rings = (
    <ProgressRing
      progress={staminaPercentage / 100}
      size={DIAGRAM.ring.size}
      strokeWidth={DIAGRAM.ring.stroke}
      color={energyHue}
      trackColor={colors.surface.track}
    >
      <UserAvatar manifest={avatarManifest} size={DIAGRAM.avatar} />
    </ProgressRing>
  );

  /**
   * ── A COUNT, NOT A PERCENTAGE ──────────────────────────────────────────────
   * This said "100%, charged". A percentage answers a question nobody has: what
   * somebody wants to know is how much they can still do.
   *
   * It was also ambiguous in a way the figure hid. The cap is 35 on a free
   * account and 80 on a member's, so the same "100%" is five practices for one
   * person and eleven for another. The count says which.
   *
   * `practicesLeftFor` floors and takes the cost from the server, so this can
   * never offer a practice the stamina gate would then refuse.
   */
  const countLine = practicesLeft === 0
    ? "No practices left"
    : `${practicesLeft} ${practicesLeft === 1 ? "practice" : "practices"} left`;

  /**
   * The second line is the ANSWER TO "so when can I?", and it only exists when
   * there is one. `rechargeTimeLeft` is a members-only countdown, so a free
   * account gets the plain fact instead of an empty line.
   */
  const refillLine = rechargeTimeLeft
    ? `Full in ${rechargeTimeLeft}`
    : energyLabel.toLowerCase() === "charged"
      ? "Refills on its own"
      : `${energyLabel}. Refills on its own.`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Your energy"
    >
      <View style={styles.body}>
        {/* ── The diagram ── */}
        <View
          style={styles.diagram}
          // The picture is the explanation, and a screen reader gets none of it.
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Energy. ${countLine}. ${refillLine}.`}
        >
          {rings}

          {/* ONE ROW, CENTRED ON THE RING. No leader line: it existed to say
              WHICH of two concentric arcs a label described, and there is one
              arc now. A pointer to the only thing on screen is decoration that
              claims to be explaining something. */}
          <View style={styles.labels}>
            {/* THE COUNT IS THE HEADLINE, at display size, because it is the
                one thing on this sheet somebody came to find out. "Energy" is
                demoted to an eyebrow: it names the ring, and the ring is
                already right there. */}
            <Text variant="eyebrow" color="tertiary">
              ENERGY
            </Text>
            <Text
              variant="h1"
              style={[styles.count, { color: energyHue }]}
              numberOfLines={1}
              // Tabular so the figure does not shift width as it counts down.
              accessibilityElementsHidden
            >
              {practicesLeft}
            </Text>
            <Text variant="body" color="secondary" numberOfLines={1}>
              {practicesLeft === 1 ? "practice left" : "practices left"}
            </Text>
            <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.refill}>
              {refillLine}
            </Text>
          </View>
        </View>


        {/* ── The card's other doors ──
            These were nested tap targets on the card: a 28pt button and a 36pt
            percentage, adjacent to a full-card press that went somewhere else
            entirely. Here they are 48pt rows with labels, which is both the
            accessible size and the first chance either has had to say what it
            does. */}
        <View style={styles.actions}>
          <PressableScale
            onPress={onEditAvatar}
            accessibilityRole="button"
            accessibilityLabel="Edit your avatar"
            style={[styles.action, { backgroundColor: colors.surface.default }]}
          >
            <Text variant="body" color="primary" style={styles.actionText}>
              Edit your avatar
            </Text>
            <Icon name={icons.chevronRight} size={size.iconSm} color={colors.text.tertiary} />
          </PressableScale>

          {onUpgrade ? (
            <PressableScale
              onPress={onUpgrade}
              accessibilityRole="button"
              accessibilityLabel="Upgrade for more energy"
              style={[styles.action, { backgroundColor: colors.surface.default }]}
            >
              <Text variant="body" style={[styles.actionText, { color: colors.text.link }]}>
                More energy, more practice
              </Text>
              <Icon name={icons.chevronRight} size={size.iconSm} color={colors.text.link} />
            </PressableScale>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: {
    gap: spacing.xl,
    paddingBottom: spacing.lg,
  },
  diagram: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  labels: {
    flex: 1,
    gap: spacing.md,
  },
  count: {
    // Tabular so the figure keeps its width as it counts down, and tight
    // leading so the number and its unit read as one block rather than two.
    fontVariant: ["tabular-nums"],
    lineHeight: 34,
    marginTop: spacing.xxs,
  },
  refill: {
    marginTop: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  // The qualifier yields first: "Today"/"Energy" must never truncate.
  detail: {
    flexShrink: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  // 48 tall: the rows the card's 28pt "i" and 36pt percentage should always have
  // been, now that there is room for them.
  action: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionText: {
    flex: 1,
  },
  hint: {
    // Pulls the body's `xl` gap in to `sm`, so the line sits on the list rather
    // than between the list and whatever follows.
    marginTop: -(spacing.xl - spacing.sm),
    // ALIGNED TO THE TICKS ABOVE, not to an eyeballed inset. `row` uses
    // `paddingHorizontal: lg`, so the marks' left edge is exactly `lg` from the
    // card — the hint starts on that same line and the left margin reads as one
    // edge instead of two near-misses.
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
});
