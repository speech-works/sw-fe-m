import { TAG_LABELS, MAX_DISCOVERY_TAGS } from "../discoveryTags";

/**
 * The discovery tag vocabulary is owned by the SERVER, which validates every
 * write against it — this file is presentation only. These tests pin the two
 * ways the two halves can silently disagree.
 *
 * The values themselves are the `SpeechSituation` / `SpeechGoal` ids from
 * sw-be-2's personalization.types.ts, and they reach a stranger's screen, so a
 * typo here is a raw enum id rendered as a person's self-description.
 */
const SITUATION_IDS = [
  "introduce_yourself",
  "order_or_ask",
  "explain",
  "push_back",
  "answer_questions",
  "speak_up",
  "present",
  "open_chat",
  "disclose",
];

const GOAL_IDS = [
  "FEEL_CALMER",
  "STOP_AVOIDING",
  "SPEAK_EASIER",
  "HANDLE_SITUATIONS",
];

describe("discovery tag labels", () => {
  it("labels every situation the server can suggest", () => {
    for (const id of SITUATION_IDS) {
      expect(TAG_LABELS[id]).toBeTruthy();
    }
  });

  it("labels every goal the server can suggest", () => {
    for (const id of GOAL_IDS) {
      expect(TAG_LABELS[id]).toBeTruthy();
    }
  });

  it("carries no label the server would reject on save", () => {
    // The dangerous direction: a chip the user can tap that silently vanishes
    // when saved, because the server drops anything outside its vocabulary.
    const known = new Set([...SITUATION_IDS, ...GOAL_IDS]);
    for (const id of Object.keys(TAG_LABELS)) {
      expect(known.has(id)).toBe(true);
    }
  });

  it("omits the scoring-only NONE / NOT_SURE values", () => {
    // Those exist so the ranker has a midpoint; they are not things anyone
    // would choose to say about themselves on a card.
    expect(TAG_LABELS.none).toBeUndefined();
    expect(TAG_LABELS.not_sure).toBeUndefined();
    expect(TAG_LABELS.NOT_SURE).toBeUndefined();
  });

  it("phrases labels in the FIRST person — this picker shows you your own card", () => {
    // The server phrases the same ids in the third person for someone else's
    // card ("telling people you stutter"). Two audiences, two phrasings.
    expect(TAG_LABELS.disclose).toMatch(/\bI\b/);
  });

  it("agrees with the server on how many tags a card may carry", () => {
    expect(MAX_DISCOVERY_TAGS).toBe(3);
  });
});
