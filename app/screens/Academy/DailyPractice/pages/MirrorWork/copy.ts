/**
 * Shared Mirror Work copy that appears in more than one place.
 *
 * The not-a-diagnosis line is the single most important sentence in this
 * feature: it is the thing standing between "a tool that notices facial
 * tension" and "an app that thinks it can assess your speech". It was written
 * out longhand in four places, and a copy pass that touched three of them and
 * missed the fourth is exactly how the four drift apart.
 *
 * Anything here is user-visible on a screen that also carries the clinical /
 * NSA review dependency noted in util/mirrorReflection/phraseBanks.ts. Change
 * the wording with that review, not casually.
 */

/** The full line: disclaimer plus the reason the feature exists at all. */
export const NOT_A_DIAGNOSIS =
  "None of this is a diagnosis. It's a mirror with a memory, and noticing is the start of change.";

/**
 * The short form, used where the surrounding screen has already made the
 * "noticing" point and repeating it would be the app explaining itself twice.
 */
export const NOT_A_DIAGNOSIS_SHORT =
  "None of this is a diagnosis. It's just a mirror with a memory.";
