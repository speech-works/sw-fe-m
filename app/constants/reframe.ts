/**
 * Reframe SERIES are backend content (`CognitivePracticeType.REFRAMING_THOUGHTS`);
 * this file only holds what the client must know without a round-trip.
 *
 * These ids mirror `SystemActivityId` in the backend seed. Matching on the id is
 * deliberate — the same reasoning as `constants/breathing.ts`: Meditation picks
 * its scenarios by matching the display NAME, which silently breaks the moment
 * copy is edited. Ids don't move.
 *
 * Reframing used to be ONE row holding 61 scenarios, so this screen had nothing
 * to choose between. It was split into themed series so a pack can carry its own
 * (Interview Special is exclusive to Interview Ready) without paywalling the
 * whole technique.
 */
export const REFRAME_SERIES_ID = {
  /**
   * "The Deals You Make" — kept the original pre-split id, which is a
   * TECH_COGNITIVE_* id and so stays on group-4 `8000`. It never collided.
   */
  DEALS_YOU_MAKE: "30000000-0000-4000-8000-000000000010",
  /**
   * ---- The series below sit on group-4 `9000`, not `8000` ----
   * Their sequence numbers (0101+) are also used by the backend's
   * TECH_MOTOR_* exposure drills. Until 2026-07-21 both families shared
   * `8000`, so these ids were literally duplicated — and this app was living
   * proof: THIS file read them as reframe series while
   * MoodCheck/FollowUp read the very same strings as motor drills.
   * TECH_REFRAME_* moved to `9000` in the backend registry; keep these in step
   * with `SystemActivityId`, which remains the source of truth.
   */
  SELF_DOUBT: "30000000-0000-4000-9000-000000000101",
  SOCIAL_CIRCLE: "30000000-0000-4000-9000-000000000102",
  WHAT_THEY_THINK: "30000000-0000-4000-9000-000000000104",
  WORDS_STICK: "30000000-0000-4000-9000-000000000105",
  WORK_AMBITION: "30000000-0000-4000-9000-000000000106",
  LONG_HAUL: "30000000-0000-4000-9000-000000000107",
  MAKE_THE_CALL: "30000000-0000-4000-9000-000000000108",
  /** Exclusive to the paid Interview Ready pack — absent for non-owners. */
  INTERVIEW_SPECIAL: "30000000-0000-4000-9000-000000000109",
  /**
   * "What You Were Told" — beliefs about what stuttering IS. Every scenario
   * opens a philosophy contrast, which is why it is a series a user picks
   * deliberately rather than material that appears mid-exercise.
   *
   * Lowercase `010a` on purpose: Postgres compares uuids case-insensitively,
   * so an uppercase copy would be the same row while looking like a different
   * constant. (The old note about dodging ...0103 no longer applies — on
   * `9000` this family cannot collide with the motor drills at all.)
   */
  WHAT_YOU_WERE_TOLD: "30000000-0000-4000-9000-00000000010a",
} as const;

/**
 * What the screen opens on when nothing else selects a series.
 *
 * "The Deals You Make" on purpose: avoidance is the behaviour that maintains
 * the problem, so it's the highest-leverage place to start, and "I stayed quiet
 * again" is the most common reason someone opens a reframing exercise cold.
 *
 * This is a judgement call, not a measured one — worth revisiting once there is
 * data on which series people actually pick.
 *
 * Previously the screen ran `rs[0]`. That was survivable when there was exactly
 * one row; with nine it would silently open whichever the endpoint happened to
 * sort first — which is "Interview Special" for an owner and "Make the Call",
 * the shortest series, for everyone else.
 */
export const DEFAULT_REFRAME_SERIES_ID = REFRAME_SERIES_ID.DEALS_YOU_MAKE;
