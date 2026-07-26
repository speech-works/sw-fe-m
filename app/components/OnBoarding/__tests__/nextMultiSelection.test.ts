import { nextMultiSelection } from "../OnboardingQuestion";

/**
 * Regression test for the bug: "None of these" / "I'm not sure" rendered as
 * ordinary chips, so a reader could select "Public speaking" AND "None of
 * these" at once — a contradiction the recommender would have to interpret
 * rather than a clean answer.
 */
const OPTIONS = [
  { id: "phone_calls" },
  { id: "public_speaking" },
  { id: "none", exclusive: true },
  { id: "not_sure", exclusive: true },
];

describe("nextMultiSelection", () => {
  it("picks a real option normally when nothing exclusive is selected", () => {
    expect(nextMultiSelection(["phone_calls"], "public_speaking", OPTIONS)).toEqual([
      "phone_calls",
      "public_speaking",
    ]);
  });

  it("deselects a real option without disturbing the rest", () => {
    expect(
      nextMultiSelection(["phone_calls", "public_speaking"], "phone_calls", OPTIONS),
    ).toEqual(["public_speaking"]);
  });

  it("picking an exclusive option clears every real pick", () => {
    expect(
      nextMultiSelection(["phone_calls", "public_speaking"], "none", OPTIONS),
    ).toEqual(["none"]);
  });

  it("picking a real option retracts a standing exclusive pick", () => {
    expect(nextMultiSelection(["not_sure"], "phone_calls", OPTIONS)).toEqual([
      "phone_calls",
    ]);
  });

  it("two exclusive options never coexist — the later tap wins", () => {
    expect(nextMultiSelection(["none"], "not_sure", OPTIONS)).toEqual(["not_sure"]);
  });

  it("deselecting the exclusive option itself just empties the answer", () => {
    expect(nextMultiSelection(["none"], "none", OPTIONS)).toEqual([]);
  });
});
