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

    it("says tomorrow when the day is one away", () => {
      expect(dayLockMessage(state()).body).toBe("Day 3 opens tomorrow.");
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
      expect(msg.body).toBe("Day 5 opens tomorrow. Day 2 is still open.");
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

describe("dayCloseLine", () => {
  it("closes the finished day and says when the next one opens", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: 2 }),
    ).toBe("Day 2 done. Day 3 opens tomorrow.");
  });

  it("counts further-out days", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 4, currentDay: 2 }),
    ).toBe("Day 2 done. Day 4 opens in 2 days.");
  });

  it("stays true when it cannot name the day it finished", () => {
    expect(
      dayCloseLine({ finishedDay: null, nextDay: 3, currentDay: 2 }),
    ).toBe("That's you for today. Day 3 opens tomorrow.");
  });

  it("degrades to the vague-but-true phrase with no clock", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: null }),
    ).toBe("Day 2 done. This day opens later.");
  });
});
