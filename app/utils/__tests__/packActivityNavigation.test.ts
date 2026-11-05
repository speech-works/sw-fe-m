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

describe("a program day's Mirror Work step", () => {
  it("opens the mirror screen by its full path, so it works from a program day", () => {
    const nav = { push: jest.fn(), navigate: jest.fn() };
    const cognitivePractice = { id: "m1", type: "MIRROR_WORK" };
    const activity = { id: "a2", contentType: "COGNITIVE_PRACTICE", cognitivePractice } as any;
    const ctx = { packId: "p1", moduleId: "m1" };
    navigateToPackActivity(nav, activity, ctx);
    expect(nav.navigate).toHaveBeenCalledWith("DailyPracticeStack", {
      screen: "CognitivePracticeStack",
      params: {
        screen: "MirrorWorkPrep",
        params: { practiceData: { cognitivePractice }, practiceActivity: activity, packContext: ctx },
      },
    });
    expect(nav.navigate).not.toHaveBeenCalledWith("MirrorWorkPrep", expect.anything());
  });
});
