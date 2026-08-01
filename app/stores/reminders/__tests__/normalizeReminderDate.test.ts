import {
  isSpentOneTime,
  normalizeReminderDate,
  reminderFiresAt,
} from "../normalizeDate";

/**
 * ============================================================================
 * A REMINDER THAT SAYS IT IS ON MUST BE ON
 * ----------------------------------------------------------------------------
 * Two screens wrote two date formats. The store's contract is ISO YYYY-MM-DD
 * and every consumer parses it with split("-"), so the Settings screen's
 * MM/DD/YYYY became NaN: the trigger never fired, yet the row still saved and
 * displayed as ON. Worse, `NaN > now` is false, so the same value was also
 * classified as expired forever — it could never self-heal.
 *
 * This function is the repair, run once by the persist migration. The bar is
 * that it fixes the broken shape and touches nothing else.
 * ============================================================================
 */

describe("normalizeReminderDate", () => {
  it("repairs the MM/DD/YYYY dates the Settings screen used to write", () => {
    expect(normalizeReminderDate("07/31/2026")).toBe("2026-07-31");
    expect(normalizeReminderDate("01/05/2027")).toBe("2027-01-05");
    expect(normalizeReminderDate("12/25/2026")).toBe("2026-12-25");
  });

  it("leaves an already-correct ISO date untouched", () => {
    expect(normalizeReminderDate("2026-07-31")).toBe("2026-07-31");
  });

  it("passes through the empty date a ROUTINE reminder carries", () => {
    expect(normalizeReminderDate("")).toBe("");
    expect(normalizeReminderDate(undefined)).toBe("");
  });

  it("produces a date that actually parses — the whole point of the repair", () => {
    const repaired = normalizeReminderDate("07/31/2026");
    const [y, m, d] = repaired.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 9, 30);

    expect(Number.isNaN(dt.getTime())).toBe(false);
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(6); // July, 0-indexed
    expect(dt.getDate()).toBe(31);
  });

  it("does not silently keep a value that would parse to NaN", () => {
    // Anything unrecognized becomes "", so the reminder reads as malformed
    // once rather than sitting in the list firing nothing forever.
    for (const junk of ["31-07-2026", "2026/07/31", "not a date", "7/3/26"]) {
      const out = normalizeReminderDate(junk);
      const [y] = out.split("-").map(Number);
      expect(out === "" || !Number.isNaN(y)).toBe(true);
    }
  });
});

/**
 * ============================================================================
 * A SPENT REMINDER MUST NOT COST YOU A SLOT
 * ----------------------------------------------------------------------------
 * You may hold three reminders. A one-time reminder that has already fired can
 * never fire again — but it used to stay in the list, and `canAddMore()` counts
 * the list. Three one-off reminders, once their moments passed, permanently
 * consumed the whole budget: the user could not add a fourth, and nothing in
 * the app would ever free the space. Reinstalling was the only way out.
 *
 * `isSpentOneTime` is the single reader that decides this now, used both by the
 * launch reschedule (which retires them) and by the resume toggle (which
 * refuses and explains). One definition, so the two can never disagree.
 * ============================================================================
 */

const ONE_TIME = (date: string, time: string) => ({ type: "ONE_TIME", date, time });
const ROUTINE = { type: "ROUTINE", date: "", time: "09:00" };

describe("reminderFiresAt", () => {
  it("reads an ISO date + time as a real moment", () => {
    const t = reminderFiresAt("2027-03-14", "09:30");
    expect(t).not.toBeNull();
    const d = new Date(t!);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(2); // March, 0-indexed
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it("returns null — not NaN — for anything it cannot read", () => {
    // NaN was the old failure: every comparison against it is false, so a
    // broken row read as "not expired" AND "not schedulable" at once.
    expect(reminderFiresAt("", "09:00")).toBeNull();
    expect(reminderFiresAt("2027-03-14", "")).toBeNull();
    expect(reminderFiresAt(undefined, undefined)).toBeNull();
    expect(reminderFiresAt("07/31/2026", "09:00")).toBeNull();
  });
});

describe("isSpentOneTime", () => {
  const now = Date.now();

  it("is true once the moment has passed", () => {
    expect(isSpentOneTime(ONE_TIME("2020-01-01", "09:00"), now)).toBe(true);
  });

  it("is false while it is still ahead", () => {
    expect(isSpentOneTime(ONE_TIME("2099-01-01", "09:00"), now)).toBe(false);
  });

  it("never retires a ROUTINE — those repeat forever by design", () => {
    expect(isSpentOneTime(ROUTINE, now)).toBe(false);
  });

  it("treats an unreadable one-time row as spent, so it cannot squat a slot", () => {
    expect(isSpentOneTime(ONE_TIME("not-a-date", "09:00"), now)).toBe(true);
  });

  it("frees the budget: three fired one-offs no longer fill the cap of 3", () => {
    const MAX = 3;
    const list = [
      ONE_TIME("2020-01-01", "09:00"),
      ONE_TIME("2020-02-01", "09:00"),
      ONE_TIME("2020-03-01", "09:00"),
    ];
    const surviving = list.filter((r) => !isSpentOneTime(r, now));
    expect(surviving).toHaveLength(0);
    expect(surviving.length < MAX).toBe(true); // can add again
  });
});

describe("the bug this replaces", () => {
  it("confirms the old MM/DD/YYYY value really did parse to NaN", () => {
    const [y, m, d] = "07/31/2026".split("-").map(Number);
    const dt = new Date(y, m - 1, d, 9, 30);

    expect(Number.isNaN(dt.getTime())).toBe(true);
    // ...and therefore was treated as already expired, forever.
    expect(dt.getTime() > Date.now()).toBe(false);
  });
});
