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
  // Whether the user has asked to be left alone about finishing onboarding.
  // Holds NO entitlement — whether onboarding is COMPLETE is the server's
  // answer (`hasCompletedOnboarding`) and only the server's. This decides
  // volume, never access.
  SW_ZSTORE_ONBOARDING_NUDGE: "SW_ZSTORE_ONBOARDING_NUDGE",
  // Stores only our own bookkeeping — whether the one proactive permission ask
  // has happened, and any "Not now" snooze. The OS permission itself is never
  // cached here; it is read fresh, because the user can change it in system
  // settings without the app ever being told.
  SW_ZSTORE_NOTIFICATION_PERMISSION: "SW_ZSTORE_NOTIFICATION_PERMISSION",
  // Which top-matched program has already had its stamp slammed, and how often.
  // Holds NO entitlement and gates nothing but an animation — the TOP MATCH
  // watermark itself renders from the server's ranking either way.
  SW_ZSTORE_TOP_MATCH_STAMP: "SW_ZSTORE_TOP_MATCH_STAMP",
};
