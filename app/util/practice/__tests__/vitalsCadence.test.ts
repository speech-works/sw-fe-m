import {
  VITALS_COOLDOWN_DAYS,
  shouldAskVitals,
} from "../vitalsCadence";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h);

describe("shouldAskVitals", () => {
  it("asks the very first time, whatever the roll", () => {
    // Somebody who does one practice and never comes back has still told us
    // something, and the first sample is not three days away.
    expect(shouldAskVitals(null, at(2026, 7, 20), 0.99)).toBe(true);
  });

  it("never asks twice inside the cooldown", () => {
    const asked = at(2026, 7, 20);
    for (let day = 0; day < VITALS_COOLDOWN_DAYS; day++) {
      expect(shouldAskVitals(asked, at(2026, 7, 20 + day), 0)).toBe(false);
    }
  });

  it("does not ask again later the same evening", () => {
    expect(shouldAskVitals(at(2026, 7, 20, 19), at(2026, 7, 20, 21), 0)).toBe(
      false,
    );
  });

  it("tosses a coin once the cooldown is up, so the ask is not always the first practice", () => {
    const asked = at(2026, 7, 20);
    const later = at(2026, 7, 23);
    expect(shouldAskVitals(asked, later, 0.2)).toBe(true);
    expect(shouldAskVitals(asked, later, 0.8)).toBe(false);
  });

  it("counts calendar days, not 24-hour blocks", () => {
    // Asked late on the 20th, practising early on the 23rd. That is three
    // calendar days and under 72 hours, and a person counting on their fingers
    // would say three.
    expect(shouldAskVitals(at(2026, 7, 20, 23), at(2026, 7, 23, 7), 0)).toBe(
      true,
    );
  });

  it("does not treat a clock that moved backwards as a long gap", () => {
    // A timezone change or a hand-set clock puts `now` before the last ask.
    expect(shouldAskVitals(at(2026, 7, 20), at(2026, 7, 18), 0)).toBe(false);
  });
});
