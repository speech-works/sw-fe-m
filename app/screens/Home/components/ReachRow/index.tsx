import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../components/PressableScale";
import { getReachSummary } from "../../../../api/programGoals";
import { ReachSummary } from "../../../../api/programGoals/types";
import {
  Icon,
  Text,
  icons,
  radius,
  size,
  spacing,
  useTheme,
} from "../../../../design-system";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";

/**
 * ============================================================================
 * THE ONE THING ON HOME THAT IS ABOUT THEIR LIFE
 * ----------------------------------------------------------------------------
 * Replaces GrowthSummary, and takes over its job and its geometry: the single
 * high-contrast card on this screen, in the same place, at the same weight.
 *
 * ── WHY IT REPLACES IT ─────────────────────────────────────────────────────
 * GrowthSummary showed three counts under words the app invented: Braver,
 * Wider, Regular. A count of practices dressed up as a quality. This shows a
 * sentence the USER wrote, and whether it happened. Nobody has to be taught a
 * vocabulary to read it.
 *
 * ── ONE SENTENCE, NOT A DASHBOARD ──────────────────────────────────────────
 * Their newest finished thing, in their own words, and the count under it. The
 * full record is a place you choose to go, for the same reason the old card
 * gave: growth is PULLED. A daily unprompted comparison against yourself is a
 * demand, and for people whose presenting problem is avoidance, a demand is the
 * thing they came here to get away from.
 *
 * ── NOTHING BEFORE THERE IS SOMETHING TRUE TO SAY ──────────────────────────
 * No skeleton, no zeros, no "no goals yet". Somebody who has never started a
 * program sees nothing here at all, and meets Reach on the screen where they
 * went looking. The honest empty state on Home is absence. TodayStrip
 * established that rule and this follows it.
 * ============================================================================
 */
const ReachRow: React.FC<{
  /**
   * Home fetches this once and hands it to both surfaces that need it, so the
   * row and the waiting-goal card can never disagree about what is
   * outstanding. Omit it and the row fetches for itself, which is the fallback
   * for any other screen that wants to mount it.
   */
  summary?: ReachSummary | null;
}> = ({ summary: provided }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [fetched, setFetched] = useState<ReachSummary | null>(null);
  const summary = provided ?? fetched;

  useFocusEffect(
    useCallback(() => {
      if (provided !== undefined) return;
      let alive = true;
      getReachSummary()
        .then((s) => alive && setFetched(s))
        .catch(() => {
          /* The row is absent rather than broken. */
        });
      return () => {
        alive = false;
      };
    }, [provided]),
  );

  // Nothing at all until the request lands. No skeleton: this slot was empty a
  // moment ago and a grey box is not more honest than nothing.
  if (!summary) return null;

  // Their newest finished thing, or the oldest one still waiting. Never both,
  // and never a placeholder: one line is the whole card.
  const headline = summary.latestDone ?? summary.oldestWaiting;
  const isDone = !!summary.latestDone;

  /**
   * ── THE LOCKED ROW ────────────────────────────────────────────────────────
   * Somebody with no goals still sees this slot, because Home losing its only
   * life-facing card is the worse outcome and this row was already here.
   *
   * It is a DESCRIPTION, not a pitch. No price, no button, no claim about what
   * a program will do for them. One line about what the thing is, and a way
   * through to the screen that explains it properly. The selling on this screen
   * is the For-you carousel's job and stays there.
   */
  const locked = summary.total === 0 || !headline;

  const open = () => {
    track(ANALYTICS_EVENTS.REACH_ROW_TAPPED, {
      total: summary.total,
      done: summary.done,
      waiting: summary.waiting,
      state: locked ? "locked" : isDone ? "done" : "waiting",
    });
    navigation.navigate("ExploreStack", { screen: "Reach" });
  };

  const eyebrow = locked
    ? "REACH"
    : isDone
      ? "YOU DID THIS"
      : "STILL ON YOUR LIST";

  const title = locked
    ? "Things you want to do outside the app"
    : headline!.text;

  const caption = locked
    ? "Every program starts by asking. Your answers live here."
    : `${summary.done} of ${summary.total} done${
        summary.waiting > 0 ? ` · ${summary.waiting} waiting` : ""
      }`;

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Reach. ${title}. ${caption}. Opens your record.`}
      style={[styles.card, { backgroundColor: colors.surface.contrast }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="eyebrow" color={colors.text.onContrastMuted}>
            {eyebrow}
          </Text>
          {/* THEIR WORDS, AT TITLE SIZE. The whole point of the card is that
              this line was written by the person reading it. Two lines, then
              it truncates: the record has the full text. */}
          <Text
            variant="h3"
            color={colors.text.onContrast}
            numberOfLines={2}
            style={styles.headline}
          >
            {title}
          </Text>
        </View>
        <View
          style={[styles.action, { backgroundColor: colors.text.onContrast }]}
        >
          <Icon
            name={icons.forward}
            size={size.iconSm}
            color={colors.surface.contrast}
          />
        </View>
      </View>

      {/* A COUNT, NOT A RATE. "2 of 5" and not "40%": a percentage invites
          comparison against a target nobody set, and the denominator here is
          how ambitious they were, which is not a thing to be marked down for. */}
      <Text variant="caption" color={colors.text.onContrastMuted}>
        {caption}
      </Text>
    </PressableScale>
  );
};

export default ReachRow;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  flex1: { flex: 1 },
  headline: { marginTop: spacing.xxs },
  action: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
