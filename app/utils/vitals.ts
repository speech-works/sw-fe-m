import { PracticeActivity } from "../api/practiceActivities/types";

/**
 * Determines if we should collect vitals for this activity type.
 * Yes for EXPOSURE and COGNITIVE (high emotional load).
 * No for READING and FUN (low value, user fatigue).
 */
export const shouldCollectVitals = (contentType: string): boolean => {
  return (
    contentType === "EXPOSURE_PRACTICE" || contentType === "COGNITIVE_PRACTICE"
  );
};

/**
 * Determines if we should show the accuracy slider.
 * Only for TECHNIQUE_DRILL activities (technique execution practice).
 *
 * Checks nested exposurePractice or cognitivePractice for:
 * - type === "REAL_LIFE_CHALLENGE"
 * - realLifeChallengeData.category === "TECHNIQUE_DRILL"
 */
export const shouldCollectAccuracy = (activity: PracticeActivity): boolean => {
  // Check EXPOSURE practice
  if (
    activity.contentType === "EXPOSURE_PRACTICE" &&
    activity.exposurePractice
  ) {
    // Accuracy is asked for on technique DRILLS. That used to be encoded as
    // type REAL_LIFE_CHALLENGE + blob category TECHNIQUE_DRILL; the type now
    // says TECHNIQUE_DRILL directly. Accept both so the slider keeps showing
    // whether the row was reseeded to the new type yet or not.
    return (
      activity.exposurePractice.type === "TECHNIQUE_DRILL" ||
      (activity.exposurePractice.type === "REAL_LIFE_CHALLENGE" &&
        activity.exposurePractice.realLifeChallengeData?.category ===
          "TECHNIQUE_DRILL")
    );
  }

  return false;
};

/**
 * Validates all vital scores are in 20-100 range.
 * clinical 20-100 standard requires 20-100 (not 0-100).
 */
export const validateVitals = (vitals: {
  effortScore?: number;
  autonomyScore?: number;
  accuracyScore?: number;
}): { valid: true } | { valid: false; error: string } => {
  const validateScore = (
    score: number | undefined,
    name: string,
  ): { valid: true } | { valid: false; error: string } => {
    if (score !== undefined && (score < 20 || score > 100)) {
      return { valid: false, error: `${name} must be between 20-100` };
    }
    return { valid: true };
  };

  const checks = [
    validateScore(vitals.effortScore, "Effort score"),
    validateScore(vitals.autonomyScore, "Autonomy score"),
    validateScore(vitals.accuracyScore, "Accuracy score"),
  ];

  const failed = checks.find((c) => !c.valid);
  return (failed as { valid: false; error: string }) || { valid: true };
};
