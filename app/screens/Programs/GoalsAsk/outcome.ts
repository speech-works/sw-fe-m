/**
 * How the last visit to the goals ask ended, per program.
 *
 * PackModule opens the ask and reads this when it gets focus back:
 *   - "saved": the list exists now. The day opens.
 *   - "left": anything else (backed out, or the question did not load). The
 *     person leaves the program. The list is required, and the day behind
 *     the ask is built on it.
 */
export type GoalsAskOutcome = "saved" | "left";

const outcomes = new Map<string, GoalsAskOutcome>();

export const setGoalsAskOutcome = (packId: string, outcome: GoalsAskOutcome) => {
  outcomes.set(packId, outcome);
};

/** Reads and forgets, so a stale answer never decides a later visit. */
export const takeGoalsAskOutcome = (packId: string): GoalsAskOutcome | undefined => {
  const outcome = outcomes.get(packId);
  outcomes.delete(packId);
  return outcome;
};
