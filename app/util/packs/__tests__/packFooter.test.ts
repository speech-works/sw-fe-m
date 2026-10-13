import { packFooterKind } from "../packFooter";
import { quizFooterAction } from "../../../components/Quiz/quizFooter";

const quiz = (over: Partial<Parameters<typeof quizFooterAction>[0]> = {}) =>
  quizFooterAction({
    hasSelection: false,
    revealed: false,
    isLast: false,
    revealExplanation: true,
    ...over,
  });

describe("quizFooterAction", () => {
  it("offers nothing until an answer is picked", () => {
    expect(quiz()).toBe("none");
  });

  it("asks to check a picked answer", () => {
    expect(quiz({ hasSelection: true })).toBe("check");
    expect(quiz({ hasSelection: true, isLast: true })).toBe("check");
  });

  it("moves to the next question once an answer is explained", () => {
    expect(quiz({ hasSelection: true, revealed: true })).toBe("next");
  });

  it("has nothing left once the last answer is explained", () => {
    expect(quiz({ hasSelection: true, revealed: true, isLast: true })).toBe("none");
  });

  it("goes straight on when answers are not explained", () => {
    expect(quiz({ hasSelection: true, revealExplanation: false })).toBe("next");
  });
});

describe("packFooterKind", () => {
  const base = {
    quizAction: "none" as const,
    isInteractive: true,
    isCompleted: false,
    isLastBlock: false,
  };

  it("says Skip on an untouched step", () => {
    expect(packFooterKind(base)).toBe("skip");
  });

  it("becomes the quiz's Check once an answer is picked", () => {
    expect(packFooterKind({ ...base, quizAction: "check" })).toBe("quizCheck");
  });

  it("moves through a quiz of several questions", () => {
    expect(packFooterKind({ ...base, quizAction: "next" })).toBe("quizNext");
  });

  it("goes back to Next or Complete when the quiz is done", () => {
    expect(packFooterKind({ ...base, isCompleted: true })).toBe("next");
    expect(packFooterKind({ ...base, isCompleted: true, isLastBlock: true })).toBe(
      "complete",
    );
  });

  it("never flashes Skip while the last answer is being sent", () => {
    expect(packFooterKind({ ...base, quizBusy: true })).toBe("quizCheck");
    expect(packFooterKind({ ...base, quizBusy: true, quizAction: "next" })).toBe(
      "quizNext",
    );
  });

  it("checks even on a quiz answered before", () => {
    expect(
      packFooterKind({ ...base, isCompleted: true, quizAction: "check" }),
    ).toBe("quizCheck");
  });

  it("is unchanged for reading steps", () => {
    expect(packFooterKind({ ...base, isInteractive: false })).toBe("next");
    expect(packFooterKind({ ...base, isInteractive: false, isLastBlock: true })).toBe(
      "complete",
    );
  });
});
