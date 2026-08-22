import { ProgramGoal } from "../../api/programGoals/types";

/**
 * Puts a goal back in the list where it was.
 *
 * ── BACK WHERE IT WAS, NOT ON THE END ──────────────────────────────────────
 * The chips are in the order the USER put them in on day 1. A goal that comes
 * back from an undo, or from a failed save, must land in its own place. Pushing
 * it on the end silently reorders their answers, and the order is the one piece
 * of judgement in this whole feature that only they could make.
 */
export function restore(
  list: ProgramGoal[],
  goal: ProgramGoal,
): ProgramGoal[] {
  if (list.some((g) => g.id === goal.id)) return list;
  return [...list, goal].sort((a, b) => a.rank - b.rank);
}
