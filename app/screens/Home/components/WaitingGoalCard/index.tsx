import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { updateProgramGoal } from "../../../../api/programGoals";
import { ProgramGoal } from "../../../../api/programGoals/types";
import { FurthestMoment } from "../../../Programs/FurthestMoment";
import {
  Button,
  Card,
  Text,
  haptics,
  space,
  spacing,
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
 * ===========================================================================
 */
export function WaitingGoalCard({
  goal,
  onDone,
}: {
  goal: ProgramGoal;
  /** Lets Home drop the card from the rotation once it is answered. */
  onDone: () => void;
}) {
  const [gone, setGone] = useState(false);
  const [moment, setMoment] = useState<{ xp: number } | null>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <>
      <Card style={styles.card}>
        <Text variant="eyebrow" color="tertiary">
          STILL ON YOUR LIST
        </Text>
        {/* Their words, at the top, with nothing above them explaining what
            they meant. They wrote it; they know. */}
        <Text variant="h3" color="primary">
          {goal.text}
        </Text>
        <Text variant="bodySm" color="secondary">
          No rush. It is here whenever you want it.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Did it"
            variant="primary"
            disabled={saving}
            onPress={didIt}
          />
          <Button label="Still not yet" variant="ghost" onPress={notYet} />
        </View>
      </Card>

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

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  actions: { gap: space.inlineGap, marginTop: spacing.sm },
});
