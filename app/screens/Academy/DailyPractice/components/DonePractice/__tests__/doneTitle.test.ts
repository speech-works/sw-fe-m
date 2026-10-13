import { donePracticeHeadline } from "../doneTitle";

describe("donePracticeHeadline", () => {
  it("states the step is done inside a program, with no confetti", () => {
    expect(donePracticeHeadline({ isAborted: false, inProgram: true })).toEqual({
      title: "Step done",
      confetti: false,
    });
  });

  it("is unchanged outside programs", () => {
    expect(donePracticeHeadline({ isAborted: false, inProgram: false })).toEqual({
      title: "Great Job!",
      confetti: true,
    });
  });

  it("keeps the ended-early line in and out of programs", () => {
    for (const inProgram of [true, false]) {
      expect(donePracticeHeadline({ isAborted: true, inProgram })).toEqual({
        title: "That's okay.",
        confetti: false,
      });
    }
  });
});
