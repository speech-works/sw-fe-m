import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../components/PressableScale";
import {
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
  AXIS_LABEL,
  AXIS_SUBTITLE,
} from "../../../../api/dailyPlan";
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
 * THE LABEL NEVER SHIPS WITHOUT ITS SUBTITLE. "Wider" alone reads as "did lots
 * of different exercises" — the wrong meaning, and the one the whole axis was
 * nearly renamed to avoid. The subtitle is what makes it mean a life instead of
 * a menu, so the two are rendered together or not at all.
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
   */
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!plan || plan.items.length === 0 || plan.loops.length === 0) return;
    const key = `${plan.loops.join()}|${plan.closed.join()}`;
    if (reported.current === key) return;
    reported.current = key;
    track(ANALYTICS_EVENTS.TODAY_LOOPS_SHOWN, {
      axes: plan.loops,
      closed: plan.closed,
    });
  }, [plan]);

  if (!plan || plan.items.length === 0 || plan.loops.length === 0) return null;

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
        {plan.loops.map((axis) => {
          const done = closed.has(axis);
          return (
            <View
              key={axis}
              style={[
                styles.loop,
                {
                  backgroundColor: done
                    ? colors.accentTint.success
                    : colors.surface.control,
                  borderColor: done
                    ? colors.accent.success
                    : colors.border.hairline,
                },
              ]}
            >
              {done ? (
                <Icon
                  name={icons.success}
                  size={14}
                  color={colors.accent.success}
                />
              ) : null}
              <View>
                <Text
                  variant="bodySm"
                  color={done ? colors.accent.success : colors.text.primary}
                >
                  {AXIS_LABEL[axis as GrowthAxis]}
                </Text>
                {/* Never shown without this — see the note at the top. */}
                <Text variant="caption" color={colors.text.tertiary}>
                  {AXIS_SUBTITLE[axis as GrowthAxis]}
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
            size={16}
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
  rowTitle: { flex: 1 },
});

export default TodayStrip;
