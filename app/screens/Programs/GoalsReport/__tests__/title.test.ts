import { reportTitle } from "../labels";

describe("reportTitle", () => {
  it("keeps the list wording for two or more goals", () => {
    expect(reportTitle("You named these before day 1. What happened?", 3)).toBe(
      "You named these before day 1. What happened?",
    );
  });

  it("speaks of one goal when only one is shown", () => {
    expect(reportTitle("You named these before day 1. What happened?", 1)).toBe(
      "You named this before day 1. What happened?",
    );
    expect(reportTitle("You named these before day 1. Did they happen?", 1)).toBe(
      "You named this before day 1. Did it happen?",
    );
    expect(
      reportTitle(
        "Before day 1, you named these as things you do not say yet. Where are they now?",
        1,
      ),
    ).toBe("Before day 1, you named this as a thing you do not say yet. Where is it now?");
  });
});
