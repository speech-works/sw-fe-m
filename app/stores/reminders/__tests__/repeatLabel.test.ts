import { reminderRepeatLabel } from "../repeatLabel";

describe("reminderRepeatLabel", () => {
  it("names the picked days of a routine", () => {
    expect(
      reminderRepeatLabel({ type: "ROUTINE", time: "02:07", weekDays: [5, 1] }),
    ).toBe("Mon, Fri at 02:07");
  });

  it("says every day when all 7 days are picked", () => {
    expect(
      reminderRepeatLabel({ type: "ROUTINE", time: "08:00", weekDays: [0, 1, 2, 3, 4, 5, 6] }),
    ).toBe("Every day at 08:00");
  });

  it("keeps every day for an old routine saved without days", () => {
    expect(reminderRepeatLabel({ type: "ROUTINE", time: "08:00" })).toBe("Every day at 08:00");
  });

  it("says once for a one-time reminder", () => {
    expect(reminderRepeatLabel({ type: "ONE_TIME", time: "09:30" })).toBe("Once at 09:30");
  });
});
