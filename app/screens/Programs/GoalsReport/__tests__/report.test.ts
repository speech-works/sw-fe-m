import { ProgramGoal } from "../../../../api/programGoals/types";
import { REPORT_LABELS, REPORT_ORDER } from "../labels";
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
