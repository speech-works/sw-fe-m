import {
  deriveActivityContent,
  FALLBACK_TITLE,
} from "../activityContent";
import { PracticeActivityContentType } from "../../../api/practiceActivities/types";

const exposureActivity = (id: string, name: string) => ({
  id: undefined,
  exposurePractice: { id, name },
});

const cognitiveActivity = (id: string, name: string) => ({
  id: undefined,
  cognitivePractice: { id, name },
});

describe("deriveActivityContent", () => {
  it("reads an exposure activity's id, type and name", () => {
    expect(deriveActivityContent(exposureActivity("exp-1", "Ask for the time"))).toEqual({
      contentId: "exp-1",
      contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
      title: "Ask for the time",
    });
  });

  it("reads a cognitive activity's id, type and name", () => {
    expect(deriveActivityContent(cognitiveActivity("cog-1", "Name the thought"))).toEqual({
      contentId: "cog-1",
      contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
      title: "Name the thought",
    });
  });

  /**
   * THE RECOMMENDATION-PATH REGRESSION.
   *
   * Home's recommendation card opens the challenge screen with only an `id`,
   * so the `practiceActivity` route param is undefined until the screen
   * fetches it. Deriving from the param yielded contentId === undefined,
   * markActivityStart hit its `if (!contentId)` guard, no activity was ever
   * created, and the user finished the challenge with nothing recorded.
   */
  it("returns undefined contentId (not a crash) before the activity has loaded", () => {
    const { contentId, title } = deriveActivityContent(undefined);
    expect(contentId).toBeUndefined();
    expect(title).toBe(FALLBACK_TITLE);
  });

  it("still yields no contentId when the activity exists but carries no content yet", () => {
    expect(deriveActivityContent({}).contentId).toBeUndefined();
  });

  /**
   * THE "TRY SOMETHING EASIER" REGRESSION.
   *
   * The swap writes a new activity into state while the route param keeps the
   * original. Deriving from the param filed the eased attempt against the
   * HARDER challenge — corrupting the exact signal graded exposure exists to
   * collect — and left the heading naming the challenge the user just stepped
   * away from. Being a pure function of what it is handed is the fix: pass the
   * live activity and every consumer moves together.
   */
  it("follows the swap: deriving from the NEW activity never reports the old one", () => {
    const original = exposureActivity("hard-1", "Call a stranger");
    const easier = exposureActivity("easy-1", "Say hi to a barista");

    const before = deriveActivityContent(original);
    const after = deriveActivityContent(easier);

    expect(before.contentId).toBe("hard-1");
    expect(after.contentId).toBe("easy-1");
    expect(after.title).toBe("Say hi to a barista");
    // The heading and the recorded id must agree — they came apart before.
    expect(after.contentId).not.toBe(before.contentId);
    expect(after.title).not.toBe(before.title);
  });

  it("prefers cognitive content when an activity somehow carries both", () => {
    const both = {
      cognitivePractice: { id: "cog-9", name: "Cognitive" },
      exposurePractice: { id: "exp-9", name: "Exposure" },
    };
    const { contentId, contentType, title } = deriveActivityContent(both);
    expect(contentId).toBe("cog-9");
    expect(contentType).toBe(PracticeActivityContentType.COGNITIVE_PRACTICE);
    expect(title).toBe("Cognitive");
  });

  it("accepts a caller-supplied fallback title", () => {
    expect(deriveActivityContent(null, "Today's practice").title).toBe(
      "Today's practice",
    );
  });
});
