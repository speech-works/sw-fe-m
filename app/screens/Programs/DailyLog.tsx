import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getProgramGoals,
  updateProgramGoal,
} from "../../api/programGoals";
import { ProgramGoal } from "../../api/programGoals/types";
import { FurthestMoment } from "./FurthestMoment";
import { restore } from "./dailyLogList";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import {
  Chip,
  Snackbar,
  Text,
  haptics,
  space,
  spacing,
} from "../../design-system";

/**
 * ===========================================================================
 * THE DAILY LOG: one tap, on the day it happens
 * ---------------------------------------------------------------------------
 * The user's own goals, as chips, at the end of a day's work. Tapping one marks
 * it done. That is the whole feature.
 *
 * ── NOTHING HANGS OFF IT ───────────────────────────────────────────────────
 * No XP, no streak, no unlock, no celebration. The moment a tap here is worth
 * points, the honest answer and the profitable answer stop being the same one,
 * and the only thing this feature produces is honest answers. It is also why
 * there is no "did you not do it?" prompt: we are not chasing anybody.
 *
 * ── NO SAVE BUTTON ─────────────────────────────────────────────────────────
 * One tap writes. A Save button on three chips is a second decision for no
 * reason, and the whole point is that logging costs nothing.
 *
 * ── WHY IT WRITES IMMEDIATELY AND UNDOES AFTERWARDS ────────────────────────
 * The obvious alternative is to hold the change for a few seconds and let Undo
 * cancel it before it is sent, which is what the buddy decline batch does. It
 * is wrong here: the button next to this one starts the next module, so the
 * screen is often gone within a second and the write would be lost. So the tap
 * writes, and Undo clears it. The server only allows clearing while the program
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

  const [open, setOpen] = useState<ProgramGoal[]>(() =>
    goals ? stillOpen(goals) : [],
  );
  const [undoable, setUndoable] = useState<ProgramGoal | null>(null);
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
        setOpen(stillOpen(state.goals));
      })
      .catch(() => {
        /* No log rather than an error. This is the smallest thing on screen. */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, goals]);

  const mark = useCallback(async (goal: ProgramGoal) => {
    haptics.light();
    // Optimistic: the chip leaves on tap. A round trip before the chip moves
    // makes a one-tap control feel broken on a slow connection.
    setOpen((prev) => prev.filter((g) => g.id !== goal.id));
    setUndoable(goal);
    try {
      const result = await updateProgramGoal(goal.id, "FULL");
      track(ANALYTICS_EVENTS.PROGRAM_GOAL_CLOSED, {
        surface: "daily_log",
        isFurthest: result.isFurthest,
        xpAwarded: result.xpAwarded,
      });
      if (result.isFurthest) setMoment({ goal, xp: result.xpAwarded });
    } catch {
      // Put it back. Nothing is more annoying than a thing you marked done
      // that quietly did not save.
      setOpen((prev) => restore(prev, goal));
      setUndoable(null);
    }
  }, []);

  const undo = useCallback(async () => {
    const goal = undoable;
    if (!goal) return;
    haptics.light();
    setUndoable(null);
    setOpen((prev) => restore(prev, goal));
    try {
      await updateProgramGoal(goal.id, null);
    } catch {
      // The server refused, which means the program closed in between. Take
      // the chip away again rather than showing something that is not true.
      setOpen((prev) => prev.filter((g) => g.id !== goal.id));
    }
  }, [undoable]);

  const takeover = (
    <FurthestMoment
      visible={!!moment}
      goalText={moment?.goal.text ?? ""}
      xpAwarded={moment?.xp ?? 0}
      onClose={() => setMoment(null)}
    />
  );

  if (dismissed || open.length === 0) {
    // The bar outlives the list: undoing the last chip must still be possible,
    // and so must the moment for the chip that emptied it.
    return undoable || moment ? (
      <View style={styles.root}>
        {undoable && (
          <Snackbar message="Marked done" actionLabel="Undo" onAction={undo} />
        )}
        {takeover}
      </View>
    ) : null;
  }

  return (
    <View style={styles.root}>
      <Text variant="label" color="secondary">
        Did any of these happen?
      </Text>

      <View style={styles.chips}>
        {open.map((goal) => (
          <Chip key={goal.id} label={goal.text} onPress={() => mark(goal)} />
        ))}
        {/* Not an answer, just a way out. Nothing is written and nothing is
            counted: a day where none of it happened is an ordinary day. */}
        <Chip label="Not yet" onPress={() => setDismissed(true)} />
      </View>

      {undoable && (
        <Snackbar message="Marked done" actionLabel="Undo" onAction={undo} />
      )}

      {takeover}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md, marginTop: space.sectionGap, width: "100%" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
