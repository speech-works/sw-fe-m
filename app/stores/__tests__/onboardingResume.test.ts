import { useOnboardingStore } from "../onboarding";
import { OnboardingFlow } from "../../api/onboarding/types";

/**
 * After the five pre-signup answers are replayed, the post-signup flow must
 * CONTINUE rather than start over. Reasking questions the person answered
 * thirty seconds earlier is the app visibly forgetting them — and it is the
 * single thing that would make "5 before signup, 7 after" feel broken.
 */
const flow = (): OnboardingFlow =>
  ({
    id: "f",
    version: "2.0",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    questions: [
      { id: "q1", screenNumber: 1, orderIndex: 1, adaptiveKey: "speech.situations", isRequired: true, questionType: "MULTI", questionText: "", options: [] },
      { id: "q2", screenNumber: 2, orderIndex: 1, adaptiveKey: "goal.primary", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
      { id: "q3", screenNumber: 3, orderIndex: 1, adaptiveKey: "avoidance.frequency", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
      { id: "q4", screenNumber: 4, orderIndex: 1, adaptiveKey: "distress.overall", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
      { id: "q5", screenNumber: 5, orderIndex: 1, adaptiveKey: "experience.therapy", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
      { id: "q6", screenNumber: 6, orderIndex: 1, adaptiveKey: "participation.impact", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
      { id: "q7", screenNumber: 7, orderIndex: 1, adaptiveKey: "communication.function", isRequired: true, questionType: "SINGLE", questionText: "", options: [] },
    ],
  }) as unknown as OnboardingFlow;

const ACT_ONE_ANSWERS = {
  "speech.situations": ["phone_calls"],
  "goal.primary": "FEEL_CALMER",
  "avoidance.frequency": "very_often",
  "distress.overall": "2",
  "experience.therapy": "past",
};

describe("resumeFrom", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it("lands on question 6 after the five Act-1 answers", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    expect(useOnboardingStore.getState().currentScreen).toBe(6);
  });

  it("keeps the replayed answers so nothing has to be retyped", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    expect(useOnboardingStore.getState().answers).toMatchObject(ACT_ONE_ANSWERS);
  });

  it("starts at the beginning when nothing was answered", () => {
    useOnboardingStore.getState().resumeFrom(flow(), {});
    expect(useOnboardingStore.getState().currentScreen).toBe(1);
  });

  it("skips over a gap rather than stopping at the first answered screen", () => {
    // Someone answered 1 and 3 but not 2 — resume must go to 2, not 4.
    useOnboardingStore.getState().resumeFrom(flow(), {
      "speech.situations": ["phone_calls"],
      "avoidance.frequency": "often",
    });
    expect(useOnboardingStore.getState().currentScreen).toBe(2);
  });

  it("treats an empty answer as unanswered", () => {
    // A blank string or empty multi-select must not count as progress.
    useOnboardingStore.getState().resumeFrom(flow(), {
      "speech.situations": [],
      "goal.primary": "   ",
    });
    expect(useOnboardingStore.getState().currentScreen).toBe(1);
  });

  it("does not run off the end when everything is answered", () => {
    const all = {
      ...ACT_ONE_ANSWERS,
      "participation.impact": "high",
      "communication.function": "3",
    };
    useOnboardingStore.getState().resumeFrom(flow(), all);
    expect(useOnboardingStore.getState().currentScreen).toBe(7);
  });
});
