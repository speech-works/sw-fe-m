/**
 * The things a person may choose to show on their discovery card.
 *
 * The SERVER owns the vocabulary and validates every write against it
 * (buddyMatch.service.ts) — the ids here must stay in step with
 * PUBLISHABLE_TAGS. A tag the server accepts but that is missing here renders
 * as its raw id, which is ugly but harmless; the reverse — a label here for
 * something the server rejects — silently drops on save, so add server-side
 * first.
 *
 * ONE VOICE, BOTH SIDES. These used to be phrased in the FIRST person here
 * ("Telling people I stutter") while the server phrased the same ids in the
 * THIRD for someone else's card ("telling people you stutter"). Two audiences,
 * two phrasings, one id — which sounded reasonable and produced a preview that
 * showed words nobody else would ever read, in a different case and up to four
 * times shorter than the real thing. A preview that is not the thing is not a
 * preview.
 *
 * So the labels are NEUTRAL now: no "I", no "you". They read correctly as an
 * answer to "what are you practising?" in the picker AND as a chip on a
 * stranger's card, which is the only way one set can serve both. `TAG_CHIP` in
 * sw-be-2 carries the identical strings for the card; the long sentence
 * fragments survive only in `matchReason`, where they sit inside a sentence and
 * need the grammar.
 */

/** Situations you practise. Ordered roughly from most to least common. */
export const SITUATION_TAGS = [
  "present",
  "speak_up",
  "introduce_yourself",
  "order_or_ask",
  "answer_questions",
  "explain",
  "push_back",
  "open_chat",
  "disclose",
] as const;

/** What you are hoping for. */
export const GOAL_TAGS = [
  "FEEL_CALMER",
  "STOP_AVOIDING",
  "SPEAK_EASIER",
  "HANDLE_SITUATIONS",
] as const;

export const TAG_LABELS: Record<string, string> = {
  // Situations (SpeechSituation)
  present: "Presenting",
  speak_up: "Speaking up in groups",
  introduce_yourself: "Introductions",
  order_or_ask: "Ordering or asking",
  answer_questions: "Answering questions",
  explain: "Explaining things",
  push_back: "Pushing back",
  open_chat: "Open-ended chat",
  disclose: "Talking about stuttering",

  // Goals (SpeechGoal)
  FEEL_CALMER: "Feeling calmer",
  STOP_AVOIDING: "Avoiding less",
  SPEAK_EASIER: "Less effort to speak",
  HANDLE_SITUATIONS: "Handling big moments",
};

/** Mirrors MAX_DISCOVERY_TAGS in sw-be-2 — the server rejects more than this. */
export const MAX_DISCOVERY_TAGS = 3;

/**
 * Everything a person may put on their card, with their own suggestions first.
 *
 * SUGGESTIONS ARE A HEAD START, NOT THE MENU. Both pickers used to show only
 * `profile.suggestions`, which the server derives purely from two onboarding
 * signals (`SPEECH_SITUATIONS` and `GOAL_PRIMARY`). Anyone whose account has
 * neither — an older sign-up, an interrupted flow, anyone who skipped those
 * questions — got an empty picker and therefore no way to describe themselves
 * at all. The server never had that restriction: it validates writes against
 * the whole vocabulary, so the limit was ours alone.
 *
 * Kept for the SETTINGS picker, which is one flat list. The Discover sheet asks
 * two questions instead and uses the two arrays above directly.
 */
export const orderedTagOptions = (suggestions: string[] = []): string[] => {
  const all = Object.keys(TAG_LABELS);
  const known = new Set(all);
  // De-duplicated and filtered: the server can only suggest ids it knows, but a
  // stale client should never render a raw id as somebody's self-description.
  const first = [...new Set(suggestions)].filter((t) => known.has(t));
  const firstSet = new Set(first);
  return [...first, ...all.filter((t) => !firstSet.has(t))];
};

/**
 * The card we would PROPOSE for someone who has not built one.
 *
 * Their own onboarding answers, capped, in the server's suggestion order. This
 * is the difference between a screen that interrogates you and one that shows
 * you something and asks whether it is right.
 *
 * IT IS A PROPOSAL, NOT A WRITE. Nothing derived from onboarding may be
 * published without the person seeing it and agreeing: the caller holds this in
 * local state, renders it as the card, and only sends it when they press the
 * button. That is what keeps a helpful default from becoming health-adjacent
 * answers republished behind someone's back.
 *
 * Empty in, empty out. Someone with no answers on file gets a bare card and the
 * picker, which is the honest result rather than a guess.
 */
export const proposedTags = (suggestions: string[] = []): string[] =>
  [...new Set(suggestions)]
    .filter((t) => TAG_LABELS[t])
    .slice(0, MAX_DISCOVERY_TAGS);
