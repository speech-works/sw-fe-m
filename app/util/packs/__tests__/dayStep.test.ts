import { dayStepKey, resumeStepIndex } from "../dayStep";

const blocks = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("resumeStepIndex", () => {
  it("finds the saved step", () => {
    expect(resumeStepIndex(blocks, "c")).toBe(2);
  });

  it("opens at step 1 with nothing saved", () => {
    expect(resumeStepIndex(blocks, null)).toBe(0);
  });

  it("opens at step 1 when the saved step is no longer in the day", () => {
    expect(resumeStepIndex(blocks, "gone")).toBe(0);
  });

  it("opens at step 1 before the day has steps", () => {
    expect(resumeStepIndex(undefined, "a")).toBe(0);
  });
});

describe("dayStepKey", () => {
  it("keeps each day apart", () => {
    expect(dayStepKey("p", "m1")).not.toBe(dayStepKey("p", "m2"));
  });
});
