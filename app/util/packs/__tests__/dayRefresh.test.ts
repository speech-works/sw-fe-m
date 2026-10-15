import {
  buildsFromAnswers,
  finishedSince,
  needsDayRefetch,
  noteStepSaved,
  sameBlockIndex,
  takeSavedSteps,
} from "../dayRefresh";
import { ContentBlockType, type ModuleContentBlock } from "../../../api/packs/types";

/**
 * The day screen builds a day once. A block the server builds from answers
 * (the week review, a form box that opens with an earlier answer) goes stale
 * when a step above it is saved, so the day is fetched again then, and only
 * then.
 */
const block = (id: string, type: ContentBlockType, content: object = {}): ModuleContentBlock =>
  ({ id, type, orderIndex: 0, content }) as unknown as ModuleContentBlock;

/** Panic Button day 7, in step order. */
const panicDay7 = [
  block("text", ContentBlockType.TEXT),
  block("quiz", ContentBlockType.QUIZ),
  block("goals", ContentBlockType.GOALS),
  block("willing", ContentBlockType.FORM, { refId: "activity.program_willingness" }),
  block("review", ContentBlockType.WEEK_REVIEW),
  block("card", ContentBlockType.FORM, { refId: "activity.panic_card" }),
  block("run", ContentBlockType.ACTIVITY),
];

describe("needsDayRefetch", () => {
  it("fetches again when the willingness answer is saved above the week review", () => {
    expect(needsDayRefetch(panicDay7, ["willing"])).toBe(true);
  });

  it("does not fetch for a save below the review, or with nothing saved", () => {
    expect(needsDayRefetch(panicDay7, ["card"])).toBe(false);
    expect(needsDayRefetch(panicDay7, ["run"])).toBe(false);
    expect(needsDayRefetch(panicDay7, [])).toBe(false);
  });

  it("does not fetch on a day with no block built from answers", () => {
    const ordinary = [
      block("log", ContentBlockType.FORM, { refId: "activity.program_rep_log" }),
      block("drill", ContentBlockType.ACTIVITY),
      block("bridge", ContentBlockType.TEXT),
    ];
    expect(needsDayRefetch(ordinary, ["log", "drill"])).toBe(false);
  });

  it("fetches again when a later form opens a box with an earlier answer", () => {
    const day = [
      block("log", ContentBlockType.FORM, { refId: "activity.program_rep_log" }),
      block("card", ContentBlockType.FORM, {
        refId: "activity.panic_card",
        fieldOverrides: {
          "panic_card.anchor": { placeholder: "e.g., x" },
          "panic_card.body": { prefillFrom: { source: "form", formKey: "activity.program_rep_log", fieldId: "program_rep_log.note" } },
        },
      }),
    ];
    expect(needsDayRefetch(day, ["log"])).toBe(true);
    // Example text alone is not built from answers.
    expect(buildsFromAnswers(block("f", ContentBlockType.FORM, { fieldOverrides: { a: { placeholder: "x" } } }))).toBe(false);
  });
});

describe("the saved-step signal", () => {
  it("is read once, per day", () => {
    noteStepSaved("p1", "m7", "willing");
    noteStepSaved("p1", "m7", "willing");
    noteStepSaved("p1", "m6", "log");
    expect(takeSavedSteps("p1", "m7")).toEqual(["willing"]);
    expect(takeSavedSteps("p1", "m7")).toEqual([]);
    expect(takeSavedSteps("p1", "m6")).toEqual(["log"]);
  });
});

describe("finishedSince", () => {
  const blocks = [
    block("thought", ContentBlockType.ACTIVITY),
    block("drill", ContentBlockType.ACTIVITY),
    block("willing", ContentBlockType.FORM),
  ];
  const finished = new Set(["a-old", "a-new"]);
  const isFinished = (id: string) => finished.has(id);

  it("counts a step finished after the day loaded, and not one finished before", () => {
    const map = new Map([
      ["thought", "a-new"],
      ["drill", "a-old"],
    ]);
    expect(finishedSince(blocks, map, new Set(["a-old"]), isFinished)).toEqual(["thought"]);
  });

  it("ignores a step that is not finished or was never started", () => {
    const map = new Map([["thought", "a-running"]]);
    expect(finishedSince(blocks, map, new Set(), isFinished)).toEqual([]);
  });
});

describe("sameBlockIndex", () => {
  const before = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("keeps the person on the same block", () => {
    expect(sameBlockIndex(before, before, 1)).toBe(1);
    expect(sameBlockIndex(before, [{ id: "x" }, { id: "a" }, { id: "b" }, { id: "c" }], 1)).toBe(2);
  });

  it("stays at the same place, inside the list, when that block is gone", () => {
    expect(sameBlockIndex(before, [{ id: "a" }, { id: "c" }], 1)).toBe(1);
    expect(sameBlockIndex(before, [{ id: "a" }], 2)).toBe(0);
  });
});
