import { reportOptions, reportSummary } from "../labels";
import { defaultPlannedDay, toDayString } from "../PlannedDayPicker";

/**
 * "Planned" (2026-10-29) belongs to The Art of Disclosure only. Every other
 * style keeps exactly the answers it had, so no other program changes.
 */
describe('the "Planned" answer', () => {
  it("is offered only by did_it_planned, after Something smaller", () => {
    expect(reportOptions("did_it_planned")).toEqual(["FULL", "PARTIAL", "PLANNED", "NONE", "NO_NEED"]);
    expect(reportOptions("did_it")).toEqual(["FULL", "PARTIAL", "NONE"]);
    expect(reportOptions("did_it_no_need")).toEqual(["FULL", "PARTIAL", "NONE", "NO_NEED"]);
    expect(reportOptions("still_true")).toEqual(["FULL", "PARTIAL", "NONE"]);
    expect(reportOptions("came_true")).toEqual(["FULL", "PARTIAL", "NONE"]);
  });

  it("reads back with its day, and other answers read as their label", () => {
    expect(
      reportSummary({ reportStyle: "did_it_planned", report: "PLANNED", plannedFor: "2026-11-04" }),
    ).toMatch(/^Planned for .*4/);
    expect(reportSummary({ reportStyle: "did_it_planned", report: "FULL", plannedFor: null })).toBe("Did it");
    expect(reportSummary({ reportStyle: "did_it", report: null })).toBe("");
  });

  it("starts a new plan on tomorrow, written the way the server stores it", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(defaultPlannedDay()).toBe(toDayString(tomorrow));
    expect(toDayString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("a plan's day through the API", () => {
  it("stays the string the server sent, so it can be printed and compared", () => {
    const { reviveDatesInObject } = require("../../../../util/functions/date");
    const out = reviveDatesInObject({ plannedFor: "2026-10-31", reportedAt: "2026-10-29T22:17:09.372Z" });
    expect(out.plannedFor).toBe("2026-10-31");
    expect(out.reportedAt).toBeInstanceOf(Date);
  });
});
