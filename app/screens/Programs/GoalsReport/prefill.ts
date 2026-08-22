import { GoalReport, ProgramGoal } from "../../../api/programGoals/types";

/**
 * The answers this screen opens with.
 *
 * ── WHY IT IS NOT ALWAYS EMPTY ─────────────────────────────────────────────
 * A goal can be answered before the program ends. The card on Home lets
 * somebody close one the day they do it, and the daily log inside the program
 * does the same. Opening the report blank would ask them to say it again, and
 * an answer they gave in week one would be silently overwritten by whatever
 * they tapped in a hurry on the last day.
 *
 * Only goals that carry a report are prefilled. The rest start empty, which is
 * what makes the Finish button wait for them.
 */
export function prefillAnswers(
  goals: ProgramGoal[],
): Record<string, GoalReport> {
  const answers: Record<string, GoalReport> = {};
  for (const goal of goals) {
    if (goal.report) answers[goal.id] = goal.report;
  }
  return answers;
}
