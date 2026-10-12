import { ProgramGoal } from "../../../../api/programGoals/types";
import {
  REPORT_LABELS,
  REPORT_ORDER,
  reportLabel,
  reportOptions,
} from "../labels";
import { prefillAnswers } from "../prefill";

const goal = (over: Partial<ProgramGoal>): ProgramGoal => ({
  id: "g1",
  noun: "the landlord",
  text: "Call the landlord",
  rank: 0,
  report: null,
  reportedAt: null,
  closedAt: null,
  answerType: "deed",
  reportStyle: "did_it",
  ...over,
});

describe("report labels", () => {
  const styles = Object.keys(REPORT_LABELS) as (keyof typeof REPORT_LABELS)[];

  it("covers all three answers for every style, with nothing blank", () => {
    for (const style of styles) {
      for (const answer of REPORT_ORDER) {
        expect(REPORT_LABELS[style][answer].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the three answers distinct inside a style", () => {
    for (const style of styles) {
      const labels = REPORT_ORDER.map((a) => REPORT_LABELS[style][a]);
      expect(new Set(labels).size).toBe(3);
    }
  });

  it("never reuses the deed wording for a prediction", () => {
    // The real bug this guards: "Did it" against "they will finish my word"
    // asks whether the user performed their own fear.
    for (const answer of REPORT_ORDER) {
      expect(REPORT_LABELS.came_true[answer]).not.toBe(
        REPORT_LABELS.did_it[answer],
      );
    }
  });

  it("gives the dating program a third answer with no 'yet' in it", () => {
    // That program argues in its own last day against setting a deadline.
    // "Not yet" would be the deadline it refuses to set.
    expect(REPORT_LABELS.still_true.NONE.toLowerCase()).not.toContain("yet");
  });

  it("puts the answers in a fixed order, easiest claim last", () => {
    expect(REPORT_ORDER).toEqual(["FULL", "PARTIAL", "NONE"]);
  });
});

describe('the "No need" answer (A6)', () => {
  it("is offered only by did_it_no_need, last, after the usual three", () => {
    expect(reportOptions("did_it_no_need")).toEqual([
      "FULL",
      "PARTIAL",
      "NONE",
      "NO_NEED",
    ]);
    for (const style of ["did_it", "still_true", "came_true"] as const) {
      expect(reportOptions(style)).toEqual(REPORT_ORDER);
    }
  });

  it("reads No need, and keeps the did_it words for the other three", () => {
    expect(reportLabel("did_it_no_need", "NO_NEED")).toBe("No need");
    for (const answer of REPORT_ORDER) {
      expect(REPORT_LABELS.did_it_no_need[answer]).toBe(REPORT_LABELS.did_it[answer]);
    }
  });

  it("never prints a label a style does not have", () => {
    expect(reportLabel("did_it", "NO_NEED")).toBe("");
  });

  it("keeps a No need answer given earlier", () => {
    expect(
      prefillAnswers([
        goal({ id: "g1", reportStyle: "did_it_no_need", report: "NO_NEED" }),
      ]),
    ).toEqual({ g1: "NO_NEED" });
  });
});

describe("prefillAnswers", () => {
  it("starts empty when nothing has been answered", () => {
    expect(prefillAnswers([goal({}), goal({ id: "g2" })])).toEqual({});
  });

  it("keeps an answer given earlier, from the card on Home", () => {
    // Without this, a goal closed in week one is asked about again on the last
    // day and silently overwritten by whatever gets tapped in a hurry.
    expect(
      prefillAnswers([goal({ id: "g1", report: "FULL" }), goal({ id: "g2" })]),
    ).toEqual({ g1: "FULL" });
  });

  it("leaves the unanswered ones out, so Finish still waits for them", () => {
    const answers = prefillAnswers([
      goal({ id: "g1", report: "NONE" }),
      goal({ id: "g2" }),
      goal({ id: "g3", report: "PARTIAL" }),
    ]);
    expect(Object.keys(answers).sort()).toEqual(["g1", "g3"]);
  });
});
