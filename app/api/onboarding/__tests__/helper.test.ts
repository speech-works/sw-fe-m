import { normalizeOnboardingFlow } from "../helper";
import { OnboardingFlow } from "../types";

/**
 * REGRESSION GUARD FOR THE ANSWER-TOKEN BUG.
 *
 * The option `id` produced here is not cosmetic — the picker submits it as the
 * ANSWER (OnboardingQuestion.tsx passes `opt.id` to onChange). The helper used
 * to synthesise `opt-${Math.random()}` whenever the option had no `id`, which
 * the server never sends. So every stored answer was an unreadable random
 * string: the clinical snapshot fell back to the population mean for all five
 * domains, situation matching never matched, and the "you said X" badge
 * silently degraded to a clinical guess.
 *
 * The single assertion that would have caught it: no id may look like `opt-…`.
 */

/** Exactly the shape the backend sends: text + value + orderIndex, no id. */
const serverShapedFlow = (): OnboardingFlow =>
  ({
    id: "flow-1",
    version: "1.0",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    questions: [
      {
        id: "q-situations",
        screenNumber: 1,
        orderIndex: 2,
        questionType: "MULTI",
        adaptiveKey: "speech.situations",
        text: "In which situations does speaking feel hardest?",
        options: [
          { text: "Phone calls", value: "phone_calls", orderIndex: 1 },
          { text: "Public speaking", value: "public_speaking", orderIndex: 2 },
        ],
      },
      {
        id: "q-effort",
        screenNumber: 1,
        orderIndex: 1,
        questionType: "SINGLE",
        adaptiveKey: "speech.effort_intensity",
        // Numeric values — these must survive as "1".."5", not become NaN or a
        // random token. They feed the 1-5 -> 20-100 clinical conversion.
        options: [
          { text: "Effortless", value: 1, orderIndex: 1 },
          { text: "Exhausting", value: 5, orderIndex: 2 },
        ],
      },
    ],
  }) as unknown as OnboardingFlow;

describe("normalizeOnboardingFlow", () => {
  it("uses the option VALUE as the submitted id, never a random token", () => {
    const flow = normalizeOnboardingFlow(serverShapedFlow());
    const ids = flow.questions.flatMap((q) => q.options.map((o) => o.id));

    expect(ids).toEqual(["1", "5", "phone_calls", "public_speaking"]);
    // The bug, stated directly.
    ids.forEach((id) => expect(id).not.toMatch(/^opt-/));
  });

  it("keeps numeric values usable as answers rather than dropping them", () => {
    const flow = normalizeOnboardingFlow(serverShapedFlow());
    const effort = flow.questions.find((q) => q.adaptiveKey === "speech.effort_intensity");

    expect(effort?.options.map((o) => o.id)).toEqual(["1", "5"]);
    expect(effort?.options.every((o) => typeof o.id === "string")).toBe(true);
  });

  it("produces ids that are unique within a question, so React keys stay stable", () => {
    const flow = normalizeOnboardingFlow(serverShapedFlow());
    flow.questions.forEach((q) => {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it("is deterministic — the same flow normalises to the same answers twice", () => {
    // The random fallback made this false, which is why a user could answer the
    // same question twice and produce two different stored values.
    const a = normalizeOnboardingFlow(serverShapedFlow());
    const b = normalizeOnboardingFlow(serverShapedFlow());
    expect(a.questions.flatMap((q) => q.options.map((o) => o.id))).toEqual(
      b.questions.flatMap((q) => q.options.map((o) => o.id)),
    );
  });

  it("still sorts questions and options, and fills optionText from text", () => {
    const flow = normalizeOnboardingFlow(serverShapedFlow());
    expect(flow.questions.map((q) => q.id)).toEqual(["q-effort", "q-situations"]);
    expect(flow.questions[1].options[0].optionText).toBe("Phone calls");
  });
});
