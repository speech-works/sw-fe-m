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
  staminaPercentage: number;
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
 * A DIAGRAM OF THE CARD, NOT A DESCRIPTION OF IT
 * ----------------------------------------------------------------------------
 * The card cannot say "three of what". It is 159pt wide, it already carries a
 * count and a status figure, and the three words it would need — Braver, Wider,
 * Regular — mean nothing until somebody has been told what they count.
 *
 * THIS ANSWERS THAT, AND IT POINTS RATHER THAN ASSERTS. The old version showed
 * two separate swatch rings of equal size and told you in prose which was inner
 * and which was outer. That is exactly the sentence that went stale, and it was
 * asking the reader to hold a mapping in their head. Here the real nested rings
 * are drawn once — same components, same values, same avatar as the card is
 * showing this second — and a leader line runs from each to its label. Nothing
 * has to be remembered and no wording can contradict the picture.
 *
 * THE LEADER LINES ARE FLEX, NOT ABSOLUTE. Each line is a sibling of its label
 * in a row, and the two rows are spread over the ring's height. Positioning them
 * absolutely would look identical at the default text size and drift apart at
 * every other one — and this sheet exists precisely for the people who need it
 * spelled out, who are disproportionately the ones running large type.
 *
 * IT COUNTS AS THE INTRODUCTION. `markGrowthIntroduced` is fired by the opener,
 * on the "set on acknowledgement, not on render" rule the store states.
 * ============================================================================
 */

/** Diagram geometry. Bigger than the card's so the segments read at a glance. */
const DIAGRAM = {
  outer: { size: 112, stroke: 7 },
  inner: { size: 90, stroke: 5 },
  avatar: 62,
  /** Visible pointer length measured from the ring's bounding box outward. */
  leader: 22,
};

/** Title 22 + gap 2 + caption 16 — see the note on the label data below. */
const LABEL_BLOCK = 40;

/**
 * HOW FAR A LEADER MUST REACH BACK TO ACTUALLY TOUCH ITS ARC.
 *
 * Both labels sit at the same distance from the ring's vertical centre, and both
 * lines began at the ring's BOUNDING BOX edge — but a circle only reaches that
 * edge at its midline. At the labels' height the outer arc has already curved
 * 13pt inward and the inner arc 29pt, so a single shared line length cannot
 * touch both: the green one grazed its ring and the orange one pointed at empty
 * card, which is exactly what it looked like.
 *
 * For a ring of `size` with any stroke, the outer edge of that stroke sits at
 * radius `size / 2` — (size − stroke)/2 + stroke/2 — so the horizontal reach at
 * a vertical offset `dy` is √((size/2)² − dy²), and the shortfall to make up is
 * the difference from the box's half-width. Computed rather than eyeballed, so
 * changing a ring size cannot silently detach its pointer again.
 */
const leaderOverlap = (ringSize: number): number => {
  const half = DIAGRAM.outer.size / 2;
  const edge = ringSize / 2;
  const dy = half - LABEL_BLOCK / 2;
  const reach = Math.sqrt(Math.max(0, edge * edge - dy * dy));
  // A hair short of touching: a line that lands exactly on the stroke reads as
  // joined to it, which is heavier than pointing at it.
  return Math.max(0, half - reach - 1);
};

export const RingsInfoSheet: React.FC<Props> = ({
  visible,
  onClose,
  staminaPercentage,
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
      size={DIAGRAM.outer.size}
      strokeWidth={DIAGRAM.outer.stroke}
      color={energyHue}
      trackColor={colors.surface.track}
    >
      <UserAvatar manifest={avatarManifest} size={DIAGRAM.avatar} />
    </ProgressRing>
  );

  const energyLabelBlock = {
    accent: energyHue,
    title: "Energy",
    detail: "refills itself",
    value: `${staminaPercentage}%, ${energyLabel.toLowerCase()}`,
    ringSize: DIAGRAM.outer.size,
  };

  const labels = [energyLabelBlock];

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
          // Built from `labels` rather than written out, so it cannot go stale
          // the way it just did: it read `labels[1]` and crashed the moment the
          // today ring was removed and the array became one entry long.
          accessibilityLabel={labels
            .map((l) => `${l.title}, ${l.value}.`)
            .join(" ")}
        >
          {rings}
          <View style={[styles.labels, { height: DIAGRAM.outer.size }]}>
            {labels.map((l) => {
              // Reach back over the ring far enough to meet ITS arc, not the
              // shared bounding box. Negative margin rather than absolute
              // positioning so the line stays welded to its own label row.
              const overlap = leaderOverlap(l.ringSize);
              return (
              <View key={l.title} style={styles.labelRow}>
                <View
                  style={[
                    styles.leader,
                    {
                      backgroundColor: l.accent,
                      width: DIAGRAM.leader + overlap,
                      marginLeft: -overlap,
                    },
                  ]}
                  // Decorative: the accessibility label above carries the mapping.
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <View style={styles.labelText}>
                  {/* Title and its qualifier share one line, so the block stays
                      two rows tall — the budget that keeps the leader lines
                      aligned to their arcs. */}
                  <View style={styles.titleRow}>
                    <Text variant="title" style={{ color: l.accent }} numberOfLines={1}>
                      {l.title}
                    </Text>
                    <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.detail}>
                      {l.detail}
                    </Text>
                  </View>
                  <Text variant="caption" color="tertiary" numberOfLines={1}>
                    {l.value}
                  </Text>
                </View>
              </View>
              );
            })}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  // Spread over the ring's height so the top line meets the outer ring near its
  // crown and the bottom one meets the inner ring low — which is where each arc
  // actually is. NO vertical padding: it would come straight out of the 32pt
  // this has to distribute, and that gap is the whole composition.
  labels: {
    flex: 1,
    justifyContent: "space-between",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leader: {
    width: DIAGRAM.leader,
    height: StyleSheet.hairlineWidth * 2,
    marginRight: spacing.sm,
    flex: 0,
  },
  labelText: {
    flex: 1,
    gap: spacing.xxs,
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
  listLabel: { marginBottom: spacing.sm },
  listCard: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  // 24, not 20. At 20 the disc was barely larger than the glyph inside it and
  // the row's leading column read as a bullet; at 24 it reads as a state.
  mark: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  markOpen: {
    borderWidth: 2,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
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
