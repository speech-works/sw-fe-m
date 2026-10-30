import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { updateProgramGoal } from "../../../../api/programGoals";
import { ProgramGoal } from "../../../../api/programGoals/types";
import { FurthestMoment } from "../../../Programs/FurthestMoment";
import { REPORT_LABELS, formatPlannedDay } from "../../../Programs/GoalsReport/labels";
import {
  PlannedDayPicker,
  defaultPlannedDay,
} from "../../../Programs/GoalsReport/PlannedDayPicker";
import PressableScale from "../../../../components/PressableScale";
import {
  Text,
  haptics,
  primaryEdge,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../../design-system";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";

/**
 * Dismissals are per goal, per day, in the user's OWN day.
 *
 * `toISOString().slice(0,10)` was the first version and is wrong: it is UTC, so
 * for somebody in India the day would roll at 5:30 in the morning and a card
 * dismissed at 10pm would be back before breakfast. The whole promise of "still
 * not yet" is that it goes away until tomorrow, and tomorrow means their
 * tomorrow. Local date parts, formatted by hand rather than through a locale,
 * so the key is stable whatever the device's formatting settings are.
 */
export const localDayKey = (now: Date = new Date()): string => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const dismissKey = (goalId: string) =>
  `waitingGoal:dismissed:${goalId}:${localDayKey()}`;

export const isDismissedToday = async (goalId: string): Promise<boolean> =>
  (await AsyncStorage.getItem(dismissKey(goalId))) === "1";

/**
 * ===========================================================================
 * ONE GOAL THEY SAID "NOT YET" TO
 * ---------------------------------------------------------------------------
 * The oldest goal still waiting, in the rotation Home already has for prompts.
 *
 * WHY NOT THE FOR-YOU SHELF. The plan put it there, and the code says
 * otherwise: ForYouCarousel's own header declares it "the only thing on Home
 * that sells", and that single ownership is deliberate. Slipping a personal
 * goal in among priced pack cards mixes "here is a thing you said about your
 * life" with "buy this", which is the one adjacency this feature cannot
 * afford. Home's prompt carousel already holds cards with actions that come
 * and go, which is exactly this shape.
 *
 * ONE GOAL, NOT A LIST. The oldest, and only that one. A list of everything
 * outstanding on the home screen is a list of things you have not done,
 * presented daily, to somebody whose presenting problem is avoidance.
 *
 * "STILL NOT YET" WRITES NOTHING. The goal is already recorded as not yet.
 * Tapping it means "not today", so it hides until tomorrow and no state
 * changes. There is no follow-up question, no reason picker and no count of
 * dismissals: being asked why you have not done something is the pressure this
 * whole feature is built to avoid.
 *
 * "NO NEED" CLOSES IT. Art of Disclosure and Hard Conversations offer a fourth
 * answer (A6, 2026-10-12): somebody does not need to know, or the call is not
 * needed. That is a finished answer, so it is saved and the card never asks
 * about this goal again.
 * ===========================================================================
 */
export function WaitingGoalCard({
  goal,
  onDone,
  standalone,
}: {
  goal: ProgramGoal;
  /** Lets Home drop the card from the rotation once it is answered. */
  onDone: () => void;
  /**
   * Outside the carousel there is no card beside it to match, so it takes only
   * the height its words need and the buttons stay above the dock.
   */
  standalone?: boolean;
}) {
  const { colors, elevation } = useTheme();
  const [gone, setGone] = useState(false);
  const [moment, setMoment] = useState<{ xp: number } | null>(null);
  const [saving, setSaving] = useState(false);
  /** "Pick another day" open, and the day being picked. */
  const [replanDay, setReplanDay] = useState<string | null>(null);
  const isPlan = goal.report === "PLANNED" && !!goal.plannedFor;
  const canPlan = !!REPORT_LABELS[goal.reportStyle]?.PLANNED;

  const didIt = useCallback(async () => {
    haptics.light();
    setSaving(true);
    try {
      const result = await updateProgramGoal(goal.id, "FULL");
      track(ANALYTICS_EVENTS.WAITING_GOAL_ANSWERED, {
        answer: "did_it",
        isFurthest: result.isFurthest,
      });
      // The same act, on the shared event, so "acts reported" is one number
      // across every surface rather than a sum somebody has to remember to do.
      track(ANALYTICS_EVENTS.PROGRAM_GOAL_CLOSED, {
        surface: "home_card",
        isFurthest: result.isFurthest,
        xpAwarded: result.xpAwarded,
      });
      // The moment holds the card on screen behind it. Dropping the card first
      // would tear the modal's own ground out from under it mid-animation.
      if (result.isFurthest) {
        setMoment({ xp: result.xpAwarded });
      } else {
        setGone(true);
        onDone();
      }
    } catch {
      /* Left on screen. A tap that silently did nothing is worse than a retry. */
    } finally {
      setSaving(false);
    }
  }, [goal.id, onDone]);

  const noNeed = useCallback(async () => {
    haptics.light();
    setSaving(true);
    try {
      await updateProgramGoal(goal.id, "NO_NEED");
      track(ANALYTICS_EVENTS.WAITING_GOAL_ANSWERED, {
        answer: "no_need",
        isFurthest: false,
      });
      setGone(true);
      onDone();
    } catch {
      /* Left on screen, as with "Did it". */
    } finally {
      setSaving(false);
    }
  }, [goal.id, onDone]);

  // A new day for a plan. The server clears the sent reminder, so one goes out
  // on the new day, and Home stays quiet until then.
  const saveNewDay = useCallback(async () => {
    if (!replanDay) return;
    haptics.light();
    setSaving(true);
    try {
      await updateProgramGoal(goal.id, "PLANNED", replanDay);
      track(ANALYTICS_EVENTS.WAITING_GOAL_ANSWERED, {
        answer: "planned",
        isFurthest: false,
      });
      setGone(true);
      onDone();
    } catch {
      /* Left on screen, as with "Did it". */
    } finally {
      setSaving(false);
    }
  }, [goal.id, onDone, replanDay]);

  const notYet = useCallback(async () => {
    haptics.light();
    track(ANALYTICS_EVENTS.WAITING_GOAL_ANSWERED, {
      answer: "not_yet",
      isFurthest: false,
    });
    setGone(true);
    await AsyncStorage.setItem(dismissKey(goal.id), "1");
    onDone();
  }, [goal.id, onDone]);

  if (gone && !moment) return null;

  // One pill, in the shape the call card next to it uses.
  const pill = (
    label: string,
    onPress: () => void,
    kind: "primary" | "quiet",
  ) => (
    <PressableScale
      key={label}
      onPress={onPress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.pill,
        kind === "primary"
          ? [{ backgroundColor: colors.action.primary }, primaryEdge(colors)]
          : {
              backgroundColor: colors.surface.control,
              borderColor: colors.border.strong,
              borderWidth: StyleSheet.hairlineWidth,
            },
      ]}
    >
      <Text
        variant="title"
        color={kind === "primary" ? colors.action.onPrimary : colors.text.primary}
      >
        {label}
      </Text>
    </PressableScale>
  );

  const noNeedLabel = REPORT_LABELS[goal.reportStyle]?.NO_NEED;

  return (
    <>
      {/* The same card as the quiet call card beside it in the carousel: one
          height, one padding, words top-left, pills bottom-left. It was a
          stack of full-width buttons, which no other Home card is (founder,
          2026-10-30). */}
      <View
        style={[
          styles.card,
          standalone ? styles.standalone : null,
          elevation.e1,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View>
          <Text variant="eyebrow" color="tertiary" style={styles.eyebrow}>
            {isPlan
              ? goal.plannedFor === localDayKey()
                ? "YOUR PLAN FOR TODAY"
                : `PLANNED FOR ${formatPlannedDay(goal.plannedFor).toUpperCase()}`
              : "STILL ON YOUR LIST"}
          </Text>
          {/* Their words, with nothing above them explaining what they meant.
              They wrote it; they know. */}
          <Text variant="h2" color="primary" style={styles.title} numberOfLines={2}>
            {goal.text}
          </Text>
          <Text variant="body" color="secondary">
            {replanDay
              ? "Pick the day. You get a reminder that morning."
              : isPlan
                ? "How did it go?"
                : "No rush. It is here whenever you want it."}
          </Text>
        </View>

        {replanDay ? (
          <View style={styles.pills}>
            <PlannedDayPicker value={replanDay} onChange={setReplanDay} bare />
            {pill("Save", saveNewDay, "primary")}
          </View>
        ) : (
          <View style={styles.pills}>
            {pill("Did it", didIt, "primary")}
            {/* A plan already says when. "Another day" moves it, so a second
                way to put it off would only add a button. */}
            {canPlan
              ? pill("Another day", () => setReplanDay(defaultPlannedDay()), "quiet")
              : null}
            {isPlan ? null : pill("Not yet", notYet, "quiet")}
            {noNeedLabel ? pill(noNeedLabel, noNeed, "quiet") : null}
          </View>
        )}
      </View>

      <FurthestMoment
        visible={!!moment}
        goalText={goal.text}
        xpAwarded={moment?.xp ?? 0}
        onClose={() => {
          setMoment(null);
          setGone(true);
          onDone();
        }}
      />
    </>
  );
}

// Geometry from FirstCallCard's quiet card, so the carousel reads as one set.
const styles = StyleSheet.create({
  card: {
    minHeight: 260,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  standalone: { minHeight: 0, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  eyebrow: { marginBottom: space.inlineGap },
  title: { marginBottom: space.titleSub },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
