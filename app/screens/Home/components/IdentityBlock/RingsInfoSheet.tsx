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
  SegmentRing,
  ProgressRing,
} from "../../../../design-system";
import PressableScale from "../../../../components/PressableScale";
import { UserAvatar } from "../../../../components/UserAvatar";
import type { AvatarManifest } from "../../../../types/avatar";
import { AXIS_LABEL, AXIS_SUBTITLE, GrowthAxis } from "../../../../api/dailyPlan";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The axes today's ring is divided into, in ring order. */
  loops: GrowthAxis[];
  /** Which of those are already closed. */
  closed: GrowthAxis[];
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
  /**
   * Which ring is drawn outside — DERIVED FROM THE GEOMETRY, never typed here.
   *
   * This sheet once shipped saying "the inner ring — today" and stayed that way
   * through a swap that moved today to the outside. It read as authoritative and
   * was simply wrong, in the one place whose entire job is to explain which ring
   * is which. Prose cannot be kept in sync with a constant by remembering, so
   * the caller compares the two ring sizes and BOTH the wording and the drawing
   * below follow from it.
   */
  todayIsOuter: boolean;
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
  loops,
  closed,
  staminaPercentage,
  energyHue,
  energyLabel,
  avatarManifest,
  todayIsOuter,
  onEditAvatar,
  onUpgrade,
  onDismissed,
}) => {
  const { colors } = useTheme();
  const done = new Set(closed);

  const todayRing = (
    <SegmentRing
      total={loops.length}
      done={closed.length}
      size={todayIsOuter ? DIAGRAM.outer.size : DIAGRAM.inner.size}
      strokeWidth={todayIsOuter ? DIAGRAM.outer.stroke : DIAGRAM.inner.stroke}
      color={colors.accentText.success}
      trackColor={colors.surface.track}
    />
  );

  const energyRing = (
    <ProgressRing
      progress={staminaPercentage / 100}
      size={todayIsOuter ? DIAGRAM.inner.size : DIAGRAM.outer.size}
      strokeWidth={todayIsOuter ? DIAGRAM.inner.stroke : DIAGRAM.outer.stroke}
      color={energyHue}
      trackColor={colors.surface.track}
    />
  );

  /**
   * Nest them in whichever order the geometry says, with the avatar innermost.
   * Cloning to inject the child keeps this to one expression instead of two
   * near-identical JSX trees that could drift.
   */
  const avatar = <UserAvatar manifest={avatarManifest} size={DIAGRAM.avatar} />;
  const outerRing = todayIsOuter ? todayRing : energyRing;
  const innerRing = todayIsOuter ? energyRing : todayRing;
  const rings = React.cloneElement(
    outerRing,
    undefined,
    React.cloneElement(innerRing, undefined, avatar),
  );

  /**
   * ONE VALUE LINE EACH, AND THE REASON IS ARITHMETIC.
   *
   * The label column is pinned to the ring's height so the leader lines meet the
   * arcs they point at. A title plus TWO caption lines is 22 + 2 + 16 + 2 + 16 =
   * 58, and two of those is 116 against a 112 container — four points OVER, so
   * `space-between` had nothing to distribute and the two blocks rendered
   * touching. Exactly the failure the card had, for exactly the same reason.
   *
   * Title plus one line is 40, two blocks is 80, and the gap comes out at 32.
   * The sentences that used to be the second lines are not lost — they are the
   * single caption under the diagram, where they read better as prose anyway.
   */
  const todayLabel = {
    accent: colors.accent.success,
    title: "Today",
    // Beside the title, not below the diagram. As its own sentence this was a
    // full line of grey prose explaining both rings at once, sitting between the
    // picture and the list and belonging to neither. Two words next to the word
    // they qualify say the same thing and cost no height.
    detail: "resets daily",
    value:
      closed.length === 0
        ? `None of ${loops.length} yet`
        : `${closed.length} of ${loops.length} done`,
    ringSize: todayIsOuter ? DIAGRAM.outer.size : DIAGRAM.inner.size,
  };
  const energyLabelBlock = {
    accent: energyHue,
    title: "Energy",
    detail: "refills itself",
    value: `${staminaPercentage}%, ${energyLabel.toLowerCase()}`,
    ringSize: todayIsOuter ? DIAGRAM.inner.size : DIAGRAM.outer.size,
  };
  // Top label belongs to the outer ring, bottom to the inner — the same order
  // the eye travels, and the same order the rings are drawn.
  const labels = todayIsOuter
    ? [todayLabel, energyLabelBlock]
    : [energyLabelBlock, todayLabel];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Your two rings"
    >
      <View style={styles.body}>
        {/* ── The diagram ── */}
        <View
          style={styles.diagram}
          // The picture is the explanation, and a screen reader gets none of it.
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Two rings. ${labels[0].title}, ${labels[0].value}, on the outside. ${labels[1].title}, ${labels[1].value}, inside it.`}
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


        {/* ── The axes, named, because here there is room ──
            Each label ships with its subtitle: the rule this vocabulary has
            carried since it was written, because "Wider" alone reads as "did
            lots of different exercises", which is the wrong meaning.

            ROWS IN ONE GROUPED CARD, not three separate filled pills. Filled,
            all-done rendered as a wall of saturated green and nothing-done as a
            wall of grey — the same shape either way, with no hierarchy and the
            word "Done" repeating what the tick and the colour already said. */}
        <View style={[styles.listCard, { backgroundColor: colors.surface.default }]}>
          {loops.map((axis, i) => {
            const isDone = done.has(axis);
            return (
              <View
                key={axis}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.hairline },
                ]}
                accessible
                accessibilityLabel={`${AXIS_LABEL[axis]}. ${AXIS_SUBTITLE[axis]}. ${isDone ? "Done today." : "Still open."
                  }`}
              >
                {/* A PLAIN CHECK, NOT `icons.success`.
                    That key is "circle-check" — a tick already inside its own
                    ring — so drawing it on a green disc produced a circle within
                    a circle, thin and small, with the glyph fighting its own
                    container. `check` is the bare mark, sized to fill the disc.

                    The ink stays `accentOn.success` (7.62:1 on the green). White
                    would match the mockup and measures 1.79:1, which is not a
                    tick anybody with low vision can see. */}
                {isDone ? (
                  <View style={[styles.mark, { backgroundColor: colors.accent.success }]}>
                    <Icon name="check" size={size.iconInline} color={colors.accentOn.success} />
                  </View>
                ) : (
                  <View style={[styles.mark, styles.markOpen, { borderColor: colors.surface.track }]} />
                )}
                <View style={styles.rowText}>
                  <Text variant="body" color={isDone ? colors.accentText.success : "primary"}>
                    {AXIS_LABEL[axis]}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {AXIS_SUBTITLE[axis]}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* The permission this whole feature rests on: without it a partly empty
            ring is a chore list; with it, it is an offer.

            NO CONTAINER. Boxed, it read as a fourth entry in the list — a peer
            of Braver, Wider and Regular, which it is not. As bare text tucked
            under the group it reads as a note ON the list, which is what it is.
            The negative margin closes the body's 20pt gap to 8, so it belongs to
            the block above rather than floating between two. */}
        <Text variant="bodySm" color="tertiary" style={styles.hint}>
          Any one of them is a good day.
        </Text>

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
