// jest.mock below is hoisted above this import.
import { navigateToPackActivity } from "../packActivityNavigation";

jest.mock("../../api", () => ({
  CognitivePracticeType: {
    GUIDED_BREATHING: "GUIDED_BREATHING",
    GUIDED_MEDITATION: "GUIDED_MEDITATION",
    REFRAMING_THOUGHTS: "REFRAMING_THOUGHTS",
    MIRROR_WORK: "MIRROR_WORK",
    REAL_LIFE_CHALLENGE: "REAL_LIFE_CHALLENGE",
  },
  ExposurePracticeType: {},
  FunPracticeType: {},
  ReadingPracticeType: {},
}));

describe("a program day's Reframe step", () => {
  it("opens the program thought screen, never the Explore Reframe screen", () => {
    const nav = { push: jest.fn(), navigate: jest.fn() };
    const activity = {
      id: "a1",
      contentType: "COGNITIVE_PRACTICE",
      cognitivePractice: { id: "s1", type: "REFRAMING_THOUGHTS" },
    } as any;
    const ctx = {
      packId: "p1",
      moduleId: "m1",
      instructions: "Day instructions.",
      writePrompt: "What would you say to a friend?",
    };
    navigateToPackActivity(nav, activity, ctx);
    expect(nav.push).toHaveBeenCalledWith("ProgramThought", {
      practiceActivity: activity,
      packContext: ctx,
    });
    expect(nav.push).not.toHaveBeenCalledWith("Reframe", expect.anything());
  });
});
