import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../components/PressableScale";
import {
  size,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  borderWidth,
} from "../../../../design-system";
import {
  fetchDailyPlan,
  DailyPlan,
  GrowthAxis,
  LOOP_TODAY,
  isVisibleAxis,
} from "../../../../api/dailyPlan";
import { axisAccent } from "../../../../util/growth/accents";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";

/**
 * ============================================================================
 * TODAY — a suggestion above the hub, never a replacement for it
 * ----------------------------------------------------------------------------
 * The practice hub has always let people choose. This adds a strip above it and
 * changes nothing below, for a reason that is clinical rather than technical:
 * our users' presenting problem is anxiety-driven avoidance, and a plan you
 * cannot decline is a demand. Someone who ignores this entirely and taps a hub
 * tile still earns whatever they earned — the server closes loops on what was
 * DONE, not on whether the suggestion was followed.
 *
 * ONLY THE LOOPS THE SERVER LISTS ARE DRAWN. `plan.loops` contains an axis only
 * when something in today's plan can actually close it, so rendering anything
 * else would put a ring on screen that cannot be finished. An unclosable loop
 * is a guilt generator, and guilt is the one thing this product cannot afford.
 * Three rings today and four tomorrow is correct behaviour, not a glitch.
 *
 * NO INVENTED NAMES. This strip says what today's work IS, through
 * `LOOP_TODAY`, and never "Braver" or "Wider". Those needed a second line under
 * them on every appearance to say what they meant, which is the definition of a
 * word not carrying its own weight.
 *
 * IT RENDERS NOTHING WHEN THERE IS NOTHING HONEST TO SAY. No plan, no items, or
 * a failed request all collapse to null rather than an empty card or an error —
 * the hub beneath is fully usable on its own and always has been.
 * ============================================================================
 */

interface Props {
  /** Same destinations the hub tiles use — no deep-linking into content. */
  onOpen: (contentType: string) => void;
}

const TodayStrip: React.FC<Props> = ({ onOpen }) => {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    let alive = true;
    fetchDailyPlan().then((p) => {
      if (alive) setPlan(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Fires only when the strip genuinely renders, which is the point: the
   * null-return above is not a gap in the data, it IS data — the days we had
   * nothing closable to offer are exactly what we need to count. Reporting a
   * "shown" for a component that rendered nothing would erase that.
   *
   * `closed` is sent alongside `axes` rather than as a separate event per
   * loop, because a loop already closed when the strip loads was earned
   * elsewhere in the app — it is not an interaction with this component.
   *
   * It reports what was DRAWN, not what the server offered: `axes` is the
   * filtered list, so the data cannot claim we showed a Finisher ring on a day
   * we hid it. `closed` stays unfiltered, because it is a record of what the
   * person actually earned anywhere in the app and that is true regardless of
   * what this component chose to render.
   */
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!plan || plan.items.length === 0) return;
    const shown = plan.loops.filter(isVisibleAxis);
    if (shown.length === 0) return;
    const key = `${shown.join()}|${plan.closed.join()}`;
    if (reported.current === key) return;
    reported.current = key;
    track(ANALYTICS_EVENTS.TODAY_LOOPS_SHOWN, {
      axes: shown,
      closed: plan.closed,
    });
  }, [plan]);

  /**
   * ONE VOCABULARY ACROSS THE APP. Finisher is hidden here for the same reason
   * it is hidden on the growth card — see `VISIBLE_AXES`. Showing it as a ring
   * today while the lifetime card never mentions it would be worse than either
   * choice on its own.
   *
   * FILTERED, NOT UNREQUESTED. The plan still SUGGESTS Finisher-capable items
   * and the server still counts them: its selection takes the scarcest axis
   * first, so dropping the axis server-side would change which items get
   * offered, and a completed call would stop closing anything. Only the ring
   * goes. That does leave a suggested item with no ring of its own — which is
   * the safe direction of the strip's rule, since the harm it guards against
   * is a ring nothing can close, not an item without one.
   */
  const loops = (plan?.loops ?? []).filter(isVisibleAxis);

  // `loops.length` and not `plan.loops.length`: with Finisher filtered out, a
  // day whose only promisable loop was Finisher now has nothing honest to show,
  // and the whole strip should collapse rather than render a heading over an
  // empty row.
  if (!plan || plan.items.length === 0 || loops.length === 0) return null;

  const closed = new Set(plan.closed);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.elevated,
          // Hairline is load-bearing on the paper scheme, where surface.elevated
          // sits at roughly 1.02:1 against the canvas and the card would
          // otherwise have no edge at all.
          borderColor: colors.border.hairline,
        },
      ]}
    >
      <Text variant="h3" color={colors.text.primary}>
        Today
      </Text>

      <View style={styles.loops}>
        {loops.map((axis) => {
          const done = closed.has(axis);
          return (
            <View
              key={axis}
              // The state is carried by colour and a tick, which a screen
              // reader cannot see — so it goes in words. `IdentityBlock` and
              // `WorldExplorationGraph` both already do this; this component
              // was the one that did not.
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${LOOP_TODAY[axis as GrowthAxis].name}, ${
                LOOP_TODAY[axis as GrowthAxis].hint
              }. ${done ? "Done today." : "Not yet today."}`}
              style={[
                styles.loop,
                {
                  backgroundColor: done
                    ? colors.accentTint.success
                    : colors.surface.control,
                  // The per-scheme cut, not the fill hue. `accent.success` is a
                  // FILL — as a hairline on the paper card it measures 1.76:1,
                  // so a closed loop and an open one become the same object.
                  borderColor: done
                    ? colors.accentText.success
                    : colors.border.hairline,
                },
              ]}
            >
              {done ? (
                <Icon
                  name={icons.success}
                  size={size.iconInline}
                  color={colors.accentText.success}
                />
              ) : (
                // The axis's own hue, so the strip and the growth card speak
                // one colour language as well as one vocabulary. A dot rather
                // than a fill: an open loop is a thing to do, not a thing had,
                // and filling it would read as already earned.
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: axisAccent(axis, colors).fill },
                  ]}
                />
              )}
              <View>
                {/* ONE LINE. This was "Braver" over "Hard things you've
                    done": a name that has to be taught, above a LIFETIME count
                    sitting on a strip about today. `LOOP_TODAY` says what would
                    close it today, in words nobody has to learn, so the second
                    line has nothing left to explain. */}
                <Text
                  variant="bodySm"
                  color={done ? colors.accentText.success : colors.text.primary}
                >
                  {LOOP_TODAY[axis as GrowthAxis].name}
                </Text>
                {/* Never shown without the name — see the note at the top. */}
                <Text variant="caption" color={colors.text.tertiary}>
                  {LOOP_TODAY[axis as GrowthAxis].hint}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {plan.items.map((item) => (
        <PressableScale
          key={item.contentId}
          scaleTo={0.97}
          onPress={() => onOpen(item.contentType)}
          style={[styles.row, { borderTopColor: colors.border.hairline }]}
        >
          <Text
            variant="body"
            color={colors.text.primary}
            style={styles.rowTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Icon
            name={icons.chevronRight}
            size={size.iconSm}
            color={colors.text.tertiary}
          />
        </PressableScale>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  loops: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  loop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.hairline,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: borderWidth.hairline,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  rowTitle: { flex: 1 },
});

export default TodayStrip;
