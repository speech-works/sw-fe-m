import { dayLockMessage, dayCloseLine, DayLockState } from "../dayLock";

const state = (over: Partial<DayLockState> = {}): DayLockState => ({
  lockedDay: 3,
  currentDay: 2,
  nextIncompleteDay: 3,
  openModuleId: null,
  ...over,
});

describe("dayLockMessage", () => {
  describe("caught up (the case the old copy got wrong)", () => {
    it("does not claim today's work is waiting when today is done", () => {
      // nextIncompleteDay 3 > currentDay 2 => days 1 and 2 are finished. This
      // is the ordinary path: finish today, reach for tomorrow.
      const msg = dayLockMessage(state());
      expect(msg.body).not.toMatch(/waiting/i);
      expect(msg.body).not.toMatch(/pack page/i);
      expect(msg.title).toBe("That's today done");
    });

    it("counts one day out without the word tomorrow", () => {
      expect(dayLockMessage(state()).body).toBe("Day 3 opens in a day.");
    });

    it("counts the days when it is further out", () => {
      const msg = dayLockMessage(
        state({ lockedDay: 5, currentDay: 2, nextIncompleteDay: 3 }),
      );
      expect(msg.body).toBe("Day 5 opens in 3 days.");
    });

    it("treats a null nextIncompleteDay as fully caught up", () => {
      const msg = dayLockMessage(state({ nextIncompleteDay: null }));
      expect(msg.title).toBe("That's today done");
    });

    it("leaves rather than offering a catch-up that does not exist", () => {
      expect(dayLockMessage(state()).action).toBe("leave");
    });
  });

  describe("behind (missed days stay open, by design)", () => {
    it("names the day that is actually still open", () => {
      const msg = dayLockMessage(
        state({ lockedDay: 5, currentDay: 4, nextIncompleteDay: 2 }),
      );
      expect(msg.body).toBe("Day 5 opens in a day. Day 2 is still open.");
    });

    it("offers to go there when a module is available", () => {
      const msg = dayLockMessage(
        state({
          lockedDay: 5,
          currentDay: 4,
          nextIncompleteDay: 2,
          openModuleId: "mod-2",
        }),
      );
      expect(msg.action).toBe("catchUp");
      expect(msg.actionLabel).toBe("Go to day 2");
    });

    it("does not offer a catch-up with no module to open", () => {
      const msg = dayLockMessage(
        state({ lockedDay: 5, currentDay: 4, nextIncompleteDay: 2 }),
      );
      expect(msg.action).toBe("leave");
      expect(msg.actionLabel).toBe("Go back");
    });

    it("still says 'Not yet' — this day genuinely has not opened", () => {
      const msg = dayLockMessage(
        state({ lockedDay: 5, currentDay: 4, nextIncompleteDay: 2 }),
      );
      expect(msg.title).toBe("Not yet");
    });
  });

  describe("unknown", () => {
    // The old copy's failure was asserting through ignorance. When the progress
    // call fails we know exactly one thing, and may say exactly that.
    it("asserts nothing beyond the 403 when there is no state", () => {
      const msg = dayLockMessage(null);
      expect(msg.body).toBe("This day of the programme opens later.");
      expect(msg.action).toBe("leave");
    });

    it("falls back when the clock itself is unknown", () => {
      const msg = dayLockMessage(state({ currentDay: null }));
      expect(msg.body).toBe("This day of the programme opens later.");
    });

    it("does not name a day it cannot place", () => {
      const msg = dayLockMessage(state({ lockedDay: null }));
      expect(msg.body).toBe("This day opens later.");
      expect(msg.body).not.toMatch(/Day null/);
    });
  });

  it("never claims a day opens tomorrow when it is already behind the clock", () => {
    // Defensive: a locked day at or behind currentDay shouldn't reach here at
    // all, but "opens tomorrow" would be a flat lie if it did.
    const msg = dayLockMessage(
      state({ lockedDay: 2, currentDay: 4, nextIncompleteDay: 5 }),
    );
    expect(msg.body).toBe("Day 2 opens later.");
  });

  it("never uses an em dash", () => {
    const all = [
      dayLockMessage(null),
      dayLockMessage(state()),
      dayLockMessage(state({ nextIncompleteDay: 1, openModuleId: "m" })),
    ];
    for (const m of all) {
      expect(`${m.title} ${m.body} ${m.actionLabel}`).not.toContain("—");
    }
  });
});

describe("the wait, when the server tells us the instant it lifts", () => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();

  it("says how LONG, never 'tomorrow' — the word is wrong after midnight and wrong anyway, because the gate is 24h from the start and not a calendar date", () => {
    const msg = dayLockMessage(state({ nextDayOpensAt: inFuture(20 * HOUR) }));
    expect(msg.body).toBe("Day 3 opens in 20 hours.");
    expect(msg.body).not.toMatch(/tomorrow/i);
  });

  it("rounds the wait UP, so it never says a day is ready before it is", () => {
    // 19h01m must not read as 19 hours: someone who came back on that number
    // would land right back on the locked screen they just left.
    const msg = dayLockMessage(state({ nextDayOpensAt: inFuture(19 * HOUR + MIN) }));
    expect(msg.body).toBe("Day 3 opens in 20 hours.");

    const soon = dayLockMessage(state({ nextDayOpensAt: inFuture(90 * 1000) }));
    expect(soon.body).toBe("Day 3 opens in 2 minutes.");
  });

  it("switches units by size of the wait, and never pluralises one", () => {
    const cases: [number, string][] = [
      [30 * MIN, "Day 3 opens in 30 minutes."],
      [HOUR + MIN, "Day 3 opens in 2 hours."],
      [23 * HOUR, "Day 3 opens in 23 hours."],
      [25 * HOUR, "Day 3 opens in 2 days."],
    ];
    for (const [ms, expected] of cases) {
      expect(dayLockMessage(state({ nextDayOpensAt: inFuture(ms) })).body).toBe(expected);
    }
    // Rounding up inside the minute branch can land on 60, and "in 60
    // minutes" is a thing nobody says.
    expect(
      dayLockMessage(state({ nextDayOpensAt: inFuture(59 * MIN + 30 * 1000) })).body,
    ).toBe("Day 3 opens in 1 hour.");
    // And exactly one of a unit reads as one, not "1 minutes".
    expect(
      dayLockMessage(state({ nextDayOpensAt: inFuture(MIN + 100) })).body,
    ).toBe("Day 3 opens in 2 minutes.");
  });

  it("stops giving a number in the last minute, and when the instant has already passed", () => {
    expect(dayLockMessage(state({ nextDayOpensAt: inFuture(30 * 1000) })).body).toBe(
      "Day 3 opens in a moment.",
    );
    expect(dayLockMessage(state({ nextDayOpensAt: inFuture(-5 * HOUR) })).body).toBe(
      "Day 3 opens in a moment.",
    );
  });

  it("ignores a value it cannot read rather than printing NaN", () => {
    expect(dayLockMessage(state({ nextDayOpensAt: "not a date" })).body).toBe(
      "Day 3 opens in a day.",
    );
  });

  it("reaches the Home card's line too — the loudest surface the wrong word was on", () => {
    expect(
      dayCloseLine({
        finishedDay: 1,
        nextDay: 2,
        currentDay: 1,
        nextDayOpensAt: inFuture(20 * HOUR),
      }),
    ).toBe("Day 1 done. Day 2 opens in 20 hours.");
  });
});

describe("dayCloseLine", () => {
  it("closes the finished day and says when the next one opens", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: 2 }),
    ).toBe("Day 2 done. Day 3 opens in a day.");
  });

  it("counts further-out days", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 4, currentDay: 2 }),
    ).toBe("Day 2 done. Day 4 opens in 2 days.");
  });

  it("stays true when it cannot name the day it finished", () => {
    expect(
      dayCloseLine({ finishedDay: null, nextDay: 3, currentDay: 2 }),
    ).toBe("That's you for today. Day 3 opens in a day.");
  });

  it("degrades to the vague-but-true phrase with no clock", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: null }),
    ).toBe("Day 2 done. This day opens later.");
  });
});
