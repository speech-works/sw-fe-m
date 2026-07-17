import { BreathPhase } from "../api/dailyPractice/types";

/**
 * Breathing techniques are backend content (`CognitivePracticeType.GUIDED_BREATHING`);
 * this file only holds what the client must know without a round-trip.
 *
 * These ids mirror `SystemActivityId` in the backend seed. Matching on the id is
 * deliberate: Meditation picks its scenarios by matching the display NAME, which
 * silently breaks the moment copy is edited. Ids don't move.
 */
export const BREATHING_TECHNIQUE_ID = {
  /** "Wind Down" — 4-7-8. Was seeded as "5-4-7 Diaphragmatic Breathing". */
  WIND_DOWN: "30000000-0000-4000-8000-000000000007",
  /** "Steady" — box 4-4-4-4. Was seeded as "Box Breathing". */
  STEADY: "30000000-0000-4000-8000-000000000008",
  /** "Reset" — cyclic sigh. */
  RESET: "30000000-0000-4000-8000-000000000011",
  /** "Settle" — coherent 4-6, no holds. */
  SETTLE: "30000000-0000-4000-8000-000000000012",
} as const;

/**
 * What the screen opens on. Steady is chosen on purpose: it leaves you calm but
 * alert, so it's the only one that's safe to do right before speaking — the most
 * likely reason someone opens this screen cold.
 *
 * Previously the screen ran `cp[0]`, and the endpoint had no ORDER BY, so the
 * "default" was whatever row Postgres happened to return.
 */
export const DEFAULT_BREATHING_TECHNIQUE_ID = BREATHING_TECHNIQUE_ID.STEADY;

/**
 * Box breathing — what the screen hardcoded before techniques carried timings.
 * Used only when a record arrives with no `phases` (seeded before the field), so
 * the pacer always has something valid to run rather than showing a dead orb.
 */
export const FALLBACK_BREATH_PHASES: BreathPhase[] = [
  { kind: "inhale", seconds: 4 },
  { kind: "hold", seconds: 4 },
  { kind: "exhale", seconds: 4 },
  { kind: "hold", seconds: 4 },
];

/** "4-7-8" / "4-4-4-4" — derived, so it can never drift from what actually runs. */
export const patternLabel = (phases: BreathPhase[]): string =>
  phases.map((p) => p.seconds).join("-");
