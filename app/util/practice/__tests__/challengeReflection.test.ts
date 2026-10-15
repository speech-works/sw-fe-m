import { skipsReflection } from "../challengeReflection";

describe("skipsReflection", () => {
  it("skips the reflection page in a program step whose question is set to empty", () => {
    expect(skipsReflection("pack-1", "")).toBe(true);
    expect(skipsReflection("pack-1", "   ")).toBe(true);
  });

  it("keeps the page when the step asks a question", () => {
    expect(skipsReflection("pack-1", "What did you say, and what did they do?")).toBe(false);
  });

  it("keeps the page when the question is missing, so the default one is asked", () => {
    expect(skipsReflection("pack-1", undefined)).toBe(false);
    expect(skipsReflection("pack-1", null)).toBe(false);
  });

  it("keeps the page outside programs, even with an empty question", () => {
    expect(skipsReflection(undefined, "")).toBe(false);
    expect(skipsReflection(null, "")).toBe(false);
    expect(skipsReflection("", "")).toBe(false);
  });
});
