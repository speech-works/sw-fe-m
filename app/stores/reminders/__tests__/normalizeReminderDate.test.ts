import { normalizeReminderDate } from "../normalizeDate";

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

describe("the bug this replaces", () => {
  it("confirms the old MM/DD/YYYY value really did parse to NaN", () => {
    const [y, m, d] = "07/31/2026".split("-").map(Number);
    const dt = new Date(y, m - 1, d, 9, 30);

    expect(Number.isNaN(dt.getTime())).toBe(true);
    // ...and therefore was treated as already expired, forever.
    expect(dt.getTime() > Date.now()).toBe(false);
  });
});
