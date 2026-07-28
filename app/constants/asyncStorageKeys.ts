// source of truth for all keys in Async Storage
export const ASYNC_KEYS_NAME = {
  SW_ZSTORE_PRACTICE_ACTIVITY: "SW_ZSTORE_PRACTICE_ACTIVITY",
  SW_ZSTORE_PRACTICE_SESSION: "SW_ZSTORE_PRACTICE_SESSION",
  SW_ZSTORE_USER: "SW_ZSTORE_USER",
  SW_APP_IS_FIRST_BREATHING_PENDING: "SW_APP_IS_FIRST_BREATHING_PENDING",
  SW_APP_IS_BREATHING_PENDING: "SW_APP_IS_BREATHING_PENDING",
  SW_APP_IS_FIRST_SMOOTHSA_PENDING: "SW_APP_IS_FIRST_SMOOTHSA_PENDING",
  SW_ZSTORE_MOOD_CHECK: "SW_ZSTORE_MOOD_CHECK_V2",
  SW_ZSTORE_PRACTICE_CATEGORY_SUMMARY: "SW_ZSTORE_PRACTICE_CATEGORY_SUMMARY",
  SW_ZSTORE_REMINDERS: "SW_ZSTORE_REMINDERS",
  SW_ZSTORE_ONBOARDING: "SW_ZSTORE_ONBOARDING",
  SW_ZSTORE_TRENDS: "SW_ZSTORE_TRENDS",
  SW_ZSTORE_PACKS: "SW_ZSTORE_PACKS",
  SW_ZSTORE_IMPACT_ASSESSMENT: "SW_ZSTORE_IMPACT_ASSESSMENT",
  SW_ZSTORE_PROGRESS_REPORT: "SW_ZSTORE_PROGRESS_REPORT",
  SW_ZSTORE_STAMINA_NOTIFICATION: "SW_ZSTORE_STAMINA_NOTIFICATION",
  SW_ZSTORE_TOOL_CONSENT: "SW_ZSTORE_TOOL_CONSENT",
  SW_ZSTORE_AI_CALL_CONSENT: "SW_ZSTORE_AI_CALL_CONSENT",
  // User's chosen reading-guide voice/accent for the Voice Hover tool.
  SW_ZSTORE_VOICE_PREFERENCE: "SW_ZSTORE_VOICE_PREFERENCE",
  // Mirror Work reflection wording-rotation cursor (per-category last-used index).
  SW_MIRROR_REFLECTION_ROTATION: "@mirrorReflection:lastUsedIndices",
  // Mirror Work prompts already used to OPEN a session (for fresh-opener rotation).
  SW_MIRROR_PROMPT_SEEN: "@mirrorPrompts:seenOpeners",
  // Avatar Studio work-in-progress (survives an app kill mid-edit; cleared on save).
  SW_ZSTORE_AVATAR_DRAFT: "SW_ZSTORE_AVATAR_DRAFT",
  // Act-1 answers held on-device before an account exists. Health-adjacent, so
  // it must be wiped on logout like any other user-scoped store.
  SW_ZSTORE_ONBOARDING_DRAFT: "SW_ZSTORE_ONBOARDING_DRAFT",
  // Whether the once-ever first call has been put off. Holds NO entitlement —
  // only the server knows whether the call itself is still going.
  SW_ZSTORE_FIRST_CALL: "SW_ZSTORE_FIRST_CALL",
  // Which call-screen controls the user has discovered. Teaching state only —
  // holds no entitlement and gates nothing but a hint.
  SW_ZSTORE_CALL_HINTS: "SW_ZSTORE_CALL_HINTS",
};
