import { useOnboardingStore } from "../onboarding";
import { useOnboardingDraftStore } from "../onboardingDraft";
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

/**
 * The same flow, but with each question's real option values attached.
 *
 * `flow()` above leaves `options: []`, which makes every answer trivially
 * readable — fine for the resume-point arithmetic it was written for, useless
 * for judging whether a stored answer still means anything.
 */
const OFFERED: Record<string, string[]> = {
  "speech.situations": ["push_back", "order_or_ask"],
  "goal.primary": ["FEEL_CALMER", "SPEAK_FREELY"],
  "avoidance.frequency": ["very_often", "never"],
  "distress.overall": ["1", "2", "3"],
  "experience.therapy": ["past", "never"],
  "participation.impact": ["a_little", "a_lot"],
  "communication.function": ["a_little", "a_lot"],
};

const flowWithOptions = (): OnboardingFlow => {
  const f = flow();
  f.questions.forEach((q) => {
    q.options = (OFFERED[q.adaptiveKey as string] ?? []).map((value, i) => ({
      value,
      text: value,
      orderIndex: i + 1,
    })) as never;
  });
  return f;
};

const ACT_ONE_ANSWERS = {
  "speech.situations": ["push_back"],
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
      "speech.situations": ["push_back"],
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

/**
 * The bug these guard against shipped while every test above was green.
 *
 * `resumeFrom` was correct in isolation — it seeded the answers and computed
 * screen 6 exactly as asserted. What broke the feature was what happened NEXT:
 * the welcome screen called `startFresh()` unconditionally on Continue, which
 * sets `answers: {}` and rewinds `currentScreen`, and then hard-navigated to
 * screen 1. Both of Act 1's contributions were destroyed at the moment the
 * reader proceeded, and all twelve questions were asked again.
 *
 * Unit-testing one function is not enough when the defect lives in the ORDER
 * two of them run in, so these pin the handover itself.
 */
describe("the resume survives to the screen that consumes it", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it("stages a resume that a later screen can detect", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    expect(useOnboardingStore.getState().pendingResume).toBe(true);
  });

  it("has nothing staged when onboarding was never pre-answered", () => {
    expect(useOnboardingStore.getState().pendingResume).toBe(false);
  });

  it("clears the flag without disturbing the position or the answers", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    useOnboardingStore.getState().consumeResume();
    expect(useOnboardingStore.getState().pendingResume).toBe(false);
    expect(useOnboardingStore.getState().currentScreen).toBe(6);
    expect(useOnboardingStore.getState().answers).toMatchObject(ACT_ONE_ANSWERS);
  });

  it("startFresh still wipes everything — including a staged resume", () => {
    // Not a bug: an explicit fresh start must outrank a stale staged resume,
    // which is how someone whose old answers were reset gets a clean re-ask.
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    useOnboardingStore.getState().startFresh(flow());
    expect(useOnboardingStore.getState().pendingResume).toBe(false);
    expect(useOnboardingStore.getState().answers).toEqual({});
    expect(useOnboardingStore.getState().currentScreen).toBe(1);
  });

  it("re-running resumeFrom against a refetched flow keeps screen 6", () => {
    // enterFlow recomputes against the flow it just fetched rather than
    // trusting the number computed at replay time, so a flow that changed in
    // between cannot strand the reader on a screen that no longer exists.
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    const seeded = useOnboardingStore.getState().answers;
    useOnboardingStore.getState().resumeFrom(flow(), seeded);
    expect(useOnboardingStore.getState().currentScreen).toBe(6);
    expect(useOnboardingStore.getState().answers).toMatchObject(ACT_ONE_ANSWERS);
  });
});

/**
 * enterFlow is the whole bug surface in one function.
 *
 * The welcome screen now only fetches the flow, calls this, and navigates to
 * the number it returns — so these four tests cover the behaviour that was
 * previously spread across an untestable screen handler.
 */
describe("enterFlow", () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
    useOnboardingDraftStore.getState().clear();
  });

  it("returns the resume point, not 1, after Act 1 was replayed", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    // Fetched fresh from the server on the welcome screen, hence a new object.
    expect(useOnboardingStore.getState().enterFlow(flow())).toBe(6);
  });

  it("keeps the five Act 1 answers instead of wiping them", () => {
    useOnboardingStore.getState().resumeFrom(flow(), ACT_ONE_ANSWERS);
    useOnboardingStore.getState().enterFlow(flow());
    expect(useOnboardingStore.getState().answers).toMatchObject(ACT_ONE_ANSWERS);
  });

  it("starts at 1 with no answers when there was no Act 1", () => {
    expect(useOnboardingStore.getState().enterFlow(flow())).toBe(1);
    expect(useOnboardingStore.getState().answers).toEqual({});
  });

  it("resumes from the on-device draft when the replay has not landed yet", () => {
    // The race: MainNavigator's replay is still mid-flight (two network calls)
    // while the welcome screen is already tappable. `pendingResume` is false,
    // but the answers are sitting on the device — so the resume point is still
    // knowable without waiting for the network.
    Object.entries(ACT_ONE_ANSWERS).forEach(([k, v]) =>
      useOnboardingDraftStore.getState().setAnswer(k, v),
    );

    expect(useOnboardingStore.getState().pendingResume).toBe(false);
    expect(useOnboardingStore.getState().enterFlow(flow())).toBe(6);
    expect(useOnboardingStore.getState().answers).toMatchObject(ACT_ONE_ANSWERS);
  });

  it("continues where they backed out, on a second and third entry", () => {
    // THE ONE-SHOT READING OF THIS WAS WRONG. Someone who reaches question 7,
    // backs out to Home and taps the card again arrives here with the staged
    // resume already consumed and the device draft already cleared. Starting
    // fresh there would throw away the post-signup answers too — a repeat that
    // gets worse the further in they were.
    useOnboardingStore.getState().resumeFrom(flowWithOptions(), {
      ...ACT_ONE_ANSWERS,
      "participation.impact": "a_lot",
    });
    useOnboardingStore.getState().consumeResume();
    useOnboardingDraftStore.getState().clear();

    expect(useOnboardingStore.getState().enterFlow(flowWithOptions())).toBe(7);
    expect(useOnboardingStore.getState().enterFlow(flowWithOptions())).toBe(7);
    expect(useOnboardingStore.getState().answers["participation.impact"]).toBe(
      "a_lot",
    );
  });

  it("starts fresh when the stored answers are the old unreadable tokens", () => {
    // The random `opt-…` ids the app used to submit. `resumeFrom` only checks
    // that a key is PRESENT, so without the readability test these would each
    // count as answered and skip the reader past five questions they never
    // actually answered — the opposite failure, and the quieter one.
    useOnboardingStore.getState().resumeFrom(flowWithOptions(), {
      "speech.situations": ["opt-lxxk5rw21"],
      "goal.primary": "opt-lxxk5rw22",
    });
    useOnboardingStore.getState().consumeResume();
    useOnboardingDraftStore.getState().clear();

    expect(useOnboardingStore.getState().enterFlow(flowWithOptions())).toBe(1);
    expect(useOnboardingStore.getState().answers).toEqual({});
  });
});
