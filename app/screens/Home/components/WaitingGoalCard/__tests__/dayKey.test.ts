import { localDayKey } from "../index";

/**
 * "Still not yet" promises the card goes away until tomorrow. Tomorrow has to
 * mean THEIR tomorrow.
 *
 * The first version keyed on `toISOString().slice(0, 10)`, which is UTC. For
 * somebody in India the day rolls at 5:30 in the morning, so a card dismissed
 * at 10pm was back before breakfast.
 */
describe("localDayKey", () => {
  it("reads the local calendar day, whatever UTC says", () => {
    // Constructed from local parts, which is how a device sees "now".
    expect(localDayKey(new Date(2026, 7, 20, 23, 30))).toBe("2026-08-20");
    expect(localDayKey(new Date(2026, 7, 21, 0, 30))).toBe("2026-08-21");
  });

  it("pads single digits, so two keys can never collide by prefix", () => {
    expect(localDayKey(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
    expect(localDayKey(new Date(2026, 10, 5, 12, 0))).toBe("2026-11-05");
  });

  it("changes across midnight and not before", () => {
    const evening = localDayKey(new Date(2026, 7, 20, 23, 59));
    const morning = localDayKey(new Date(2026, 7, 21, 0, 1));
    expect(evening).not.toBe(morning);
    expect(localDayKey(new Date(2026, 7, 20, 6, 0))).toBe(evening);
  });
});
