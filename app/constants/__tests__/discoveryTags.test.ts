import {
  TAG_LABELS,
  MAX_DISCOVERY_TAGS,
  SITUATION_TAGS,
  GOAL_TAGS,
  orderedTagOptions,
  proposedTags,
} from "../discoveryTags";

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

  it("phrases every label NEUTRALLY, because one string serves both sides", () => {
    // This replaces a rule requiring the FIRST person here and the THIRD on the
    // server. Two voices meant the "preview" showed words the other person
    // would never read, so the labels are now pronoun-free and identical to
    // `TAG_CHIP` in sw-be-2. A stray "I" or "you" is that split coming back.
    for (const [id, label] of Object.entries(TAG_LABELS)) {
      expect(`${id}: ${label}`).not.toMatch(/\b(I|my|me|you|your)\b/i);
    }
  });

  it("groups every tag into exactly one question", () => {
    // The picker asks two questions over these two arrays. A tag in neither is
    // unreachable; a tag in both renders twice.
    const grouped = [...SITUATION_TAGS, ...GOAL_TAGS];
    expect([...grouped].sort()).toEqual(Object.keys(TAG_LABELS).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("agrees with the server on how many tags a card may carry", () => {
    expect(MAX_DISCOVERY_TAGS).toBe(3);
  });
});

/**
 * What a person is allowed to choose from.
 *
 * Both pickers used to offer `profile.suggestions` alone, and the server
 * derives those from two onboarding signals only. Anyone missing them got an
 * empty picker and no way to describe themselves — while the server would have
 * accepted any tag in the vocabulary. Suggestions order the list now; they do
 * not limit it.
 */
describe("orderedTagOptions", () => {
  const ALL = [...SITUATION_IDS, ...GOAL_IDS];

  it("offers the whole vocabulary even with no suggestions", () => {
    const opts = orderedTagOptions([]);
    expect(opts.sort()).toEqual([...ALL].sort());
  });

  it("treats a missing suggestions list the same as an empty one", () => {
    expect(orderedTagOptions()).toHaveLength(ALL.length);
  });

  it("puts the person's own suggestions first", () => {
    const opts = orderedTagOptions(["present", "FEEL_CALMER"]);
    expect(opts.slice(0, 2)).toEqual(["present", "FEEL_CALMER"]);
    expect(opts).toHaveLength(ALL.length);
  });

  it("never repeats a suggested tag further down the list", () => {
    const opts = orderedTagOptions(["present"]);
    expect(opts.filter((t) => t === "present")).toHaveLength(1);
  });

  it("drops an id it has no label for", () => {
    // A stale client must never render a raw enum id as somebody's own words.
    const opts = orderedTagOptions(["present", "invented_by_a_newer_server"]);
    expect(opts).not.toContain("invented_by_a_newer_server");
    expect(opts[0]).toBe("present");
  });

  it("de-duplicates a repeated suggestion", () => {
    expect(orderedTagOptions(["present", "present"])).toHaveLength(ALL.length);
  });
});

/**
 * The card we propose to someone who has not made one.
 *
 * The proposal is the whole reason the flow reads now: you are shown a card and
 * asked whether it is right, instead of being handed a taxonomy. It is also the
 * one place onboarding answers come near a public surface, so the cap and the
 * empty case are load-bearing rather than tidy.
 */
describe("proposedTags", () => {
  it("proposes nothing when there is nothing on file", () => {
    // No guessing. These people get the picker, which is the honest result.
    expect(proposedTags([])).toEqual([]);
    expect(proposedTags()).toEqual([]);
  });

  it("never proposes more than a card can hold", () => {
    const many = [...SITUATION_TAGS];
    expect(many.length).toBeGreaterThan(MAX_DISCOVERY_TAGS);
    expect(proposedTags(many)).toHaveLength(MAX_DISCOVERY_TAGS);
  });

  it("keeps the server's order", () => {
    expect(proposedTags(["disclose", "present"])).toEqual(["disclose", "present"]);
  });

  it("drops anything it cannot label", () => {
    // A raw enum id must never reach a card, least of all one we suggested.
    expect(proposedTags(["present", "invented_by_a_newer_server"])).toEqual(["present"]);
  });

  it("de-duplicates", () => {
    expect(proposedTags(["present", "present", "FEEL_CALMER"])).toEqual([
      "present",
      "FEEL_CALMER",
    ]);
  });
});
