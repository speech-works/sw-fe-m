import { setGoalsAskOutcome, takeGoalsAskOutcome } from "../outcome";

describe("goals ask outcome", () => {
  it("is read once, so an old visit never decides a later one", () => {
    setGoalsAskOutcome("p1", "left");
    expect(takeGoalsAskOutcome("p1")).toBe("left");
    expect(takeGoalsAskOutcome("p1")).toBeUndefined();
  });

  it("keeps programs apart", () => {
    setGoalsAskOutcome("p1", "saved");
    setGoalsAskOutcome("p2", "left");
    expect(takeGoalsAskOutcome("p1")).toBe("saved");
    expect(takeGoalsAskOutcome("p2")).toBe("left");
  });

  it("the last word wins: backing out, then saving, is saved", () => {
    setGoalsAskOutcome("p1", "left");
    setGoalsAskOutcome("p1", "saved");
    expect(takeGoalsAskOutcome("p1")).toBe("saved");
  });
});
