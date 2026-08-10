/**
 * Labels for the things a user may choose to show on their discovery card.
 *
 * The SERVER owns the vocabulary and validates every write against it
 * (buddyMatch.service.ts) — this map is presentation only. It exists because
 * the picker shows the user their OWN tags, in the first person, while the
 * server phrases the same ids in the third person for someone else's card
 * ("telling people you stutter"). Two audiences, two phrasings, one id.
 *
 * Keep in step with PUBLISHABLE_TAGS in sw-be-2. A tag the server accepts but
 * that is missing here renders as its raw id, which is ugly but harmless; the
 * reverse — a label here for something the server rejects — silently drops on
 * save, so add server-side first.
 */
export const TAG_LABELS: Record<string, string> = {
  // Situations (SpeechSituation)
  introduce_yourself: "Introducing myself",
  order_or_ask: "Ordering or asking",
  explain: "Explaining things",
  push_back: "Pushing back",
  answer_questions: "Answering questions",
  speak_up: "Speaking up in groups",
  present: "Presenting",
  open_chat: "Open-ended chat",
  disclose: "Telling people I stutter",

  // Goals (SpeechGoal)
  FEEL_CALMER: "Feeling calmer",
  STOP_AVOIDING: "Avoiding less",
  SPEAK_EASIER: "Less effort to speak",
  HANDLE_SITUATIONS: "Handling big moments",
};

/** Mirrors MAX_DISCOVERY_TAGS in sw-be-2 — the server rejects more than this. */
export const MAX_DISCOVERY_TAGS = 3;
