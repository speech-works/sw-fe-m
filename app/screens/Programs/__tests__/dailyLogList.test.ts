import { ProgramGoal } from "../../../api/programGoals/types";
import { restore } from "../dailyLogList";

const goal = (id: string, rank: number): ProgramGoal => ({
  id,
  noun: id,
  text: `Call ${id}`,
  rank,
  report: null,
  reportedAt: null,
  closedAt: null,
  answerType: "deed",
  reportStyle: "did_it",
});

describe("restore", () => {
  const first = goal("a", 0);
  const second = goal("b", 1);
  const third = goal("c", 2);

  it("puts an undone goal back in the user's order, not on the end", () => {
    // The order is theirs, from day 1. Pushing a restored chip onto the end
    // would quietly reorder the one judgement only they could make.
    expect(restore([second, third], first).map((g) => g.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts a middle one back in the middle", () => {
    expect(restore([first, third], second).map((g) => g.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("does not duplicate a goal that is already there", () => {
    // A failed save and an undo can both fire for the same chip.
    expect(restore([first, second], first).map((g) => g.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("handles the last chip coming back to an empty list", () => {
    expect(restore([], third).map((g) => g.id)).toEqual(["c"]);
  });
});
