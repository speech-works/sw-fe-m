import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getProgramGoals,
  updateProgramGoal,
} from "../../api/programGoals";
import { ProgramGoal } from "../../api/programGoals/types";
import { FurthestMoment } from "./FurthestMoment";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import {
  ChoiceList,
  Text,
  TextLink,
  space,
  spacing,
} from "../../design-system";

/**
 * ===========================================================================
 * THE DAILY LOG: one tap, on the day it happens
 * ---------------------------------------------------------------------------
 * The user's own goals, as tick boxes, at the end of a day's work. Ticking one
 * marks it done. That is the whole feature.
 *
 * ── NOTHING HANGS OFF IT ───────────────────────────────────────────────────
 * No XP, no streak, no unlock, no celebration. The moment a tap here is worth
 * points, the honest answer and the profitable answer stop being the same one,
 * and the only thing this feature produces is honest answers. It is also why
 * there is no "did you not do it?" prompt: we are not chasing anybody.
 *
 * ── NO SAVE BUTTON ─────────────────────────────────────────────────────────
 * One tap writes. A Save button on three tick boxes is a second decision for no
 * reason, and the whole point is that logging costs nothing.
 *
 * ── WHY IT WRITES IMMEDIATELY AND UNDOES AFTERWARDS ────────────────────────
 * The obvious alternative is to hold the change for a few seconds and let Undo
 * cancel it before it is sent, which is what the buddy decline batch does. It
 * is wrong here: the button next to this one starts the next module, so the
 * screen is often gone within a second and the write would be lost. So the tick
 * writes, and unticking clears it. The server only allows clearing while the program
 * is still open.
 * ===========================================================================
 */
export function DailyLog({
  packId,
  /**
   * The goals the caller already has, if it has them. PackModule fetches this
   * same state a moment earlier to decide whether the report is owed, and two
   * identical requests a tick apart is just waste.
   *
   * Omit it and the log fetches for itself, which is the fallback when that
   * earlier request failed.
   */
  goals,
}: {
  packId: string;
  goals?: ProgramGoal[];
}) {
  // Only goals with nothing said about them yet. A goal already marked done is
  // not a question any more.
  const stillOpen = (all: ProgramGoal[]) => all.filter((g) => !g.report);

  // The list stays as it opened: ticking a goal leaves it on screen, ticked,
  // so unticking is the undo (founder, 2026-11-05: tick boxes, since several
  // can have happened).
  const [shown, setShown] = useState<ProgramGoal[]>(() =>
    goals ? stillOpen(goals) : [],
  );
  const [ticked, setTicked] = useState<string[]>([]);
  /**
   * A fear list (Breaking Thought Traps). Ticking says the fear came true,
   * which is not a goal reached, and "Not yet" read as if the fear were still
   * due (founder, B9, 2026-11-05).
   */
  const fearList = shown.some((g) => g.answerType === "prediction");
  const [dismissed, setDismissed] = useState(false);
  /**
   * The other place a single goal gets closed, so the other place the moment
   * has to fire. NOT on the report screen: that is already an ending, and two
   * endings back to back makes both smaller.
   */
  const [moment, setMoment] = useState<{ goal: ProgramGoal; xp: number } | null>(
    null,
  );

  useEffect(() => {
    if (goals) return;
    let alive = true;
    getProgramGoals(packId)
      .then((state) => {
        if (!alive) return;
        setShown(stillOpen(state.goals));
      })
      .catch(() => {
        /* No log rather than an error. This is the smallest thing on screen. */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, goals]);

  const toggle = useCallback(
    async (goal: ProgramGoal) => {
      const on = ticked.includes(goal.id);
      // Optimistic: the tick moves on tap. A round trip first makes a one-tap
      // control feel broken on a slow connection.
      setTicked((prev) => (on ? prev.filter((id) => id !== goal.id) : [...prev, goal.id]));
      try {
        if (on) {
          await updateProgramGoal(goal.id, null);
          return;
        }
        const result = await updateProgramGoal(goal.id, "FULL");
        track(ANALYTICS_EVENTS.PROGRAM_GOAL_CLOSED, {
          surface: "daily_log",
          isFurthest: result.isFurthest,
          xpAwarded: result.xpAwarded,
        });
        if (result.isFurthest) setMoment({ goal, xp: result.xpAwarded });
      } catch {
        // Put the tick back as it was. A tick that quietly did not save is
        // worse than none.
        setTicked((prev) => (on ? [...prev, goal.id] : prev.filter((id) => id !== goal.id)));
      }
    },
    [ticked],
  );

  const takeover = (
    <FurthestMoment
      visible={!!moment}
      goalText={moment?.goal.text ?? ""}
      xpAwarded={moment?.xp ?? 0}
      onClose={() => setMoment(null)}
    />
  );

  if (dismissed || shown.length === 0) {
    return moment ? <View style={styles.root}>{takeover}</View> : null;
  }

  return (
    <View style={styles.root}>
      {/*
        `title`, not `label`. This is a QUESTION put to the user and the only
        interactive thing on the screen below it.
      */}
      <Text variant="title" color="primary" center>
        Did any of these happen?
      </Text>

      {/* Tick boxes: several can have happened. Full rows, so long goals wrap
          instead of being cut. */}
      <View style={styles.list}>
        <ChoiceList
          multiple
          options={shown.map((g) => ({ key: g.id, label: g.text }))}
          selected={ticked}
          onToggle={(id) => {
            const goal = shown.find((g) => g.id === id);
            if (goal) void toggle(goal);
          }}
        />
      </View>

      {/*
        A way out, not one more thing that might have happened, so a quiet text
        link rather than a row. Only while nothing is ticked: "None of them"
        under a ticked box would contradict it.
      */}
      {ticked.length === 0 ? (
        <TextLink
          label={fearList ? "None of them" : "Not yet"}
          onPress={() => setDismissed(true)}
        />
      ) : null}

      {takeover}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.rowGap,
    // The gap under the copy above is owned HERE, once. The success screen used
    // to add a 40pt bottom margin of its own on top of this, which put a 64pt
    // hole between the subtitle and this question.
    marginTop: spacing["3xl"],
    width: "100%",
    alignItems: "center",
  },
  list: {
    alignSelf: "stretch",
  },
});
