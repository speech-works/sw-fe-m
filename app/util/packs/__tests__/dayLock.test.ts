import {
  dayLockMessage,
  dayCloseLine,
  nextOpenModuleId,
  isModuleOfferable,
  DayLockState,
} from "../dayLock";

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

  /**
   * The instant is when ONE day opens: the day after `currentDay`. Every arc
   * shipped today runs 1..arcDays with no gaps, so that is always the day the
   * user is looking at. The server does not promise it — `resolveDayState`
   * finds a gap "rather than skipped past" — so the day count has to take over
   * when the two disagree, or the app states a wait far shorter than the truth.
   */
  it("does not read the next day's instant against a day further out", () => {
    const msg = dayLockMessage(
      state({
        lockedDay: 5,
        currentDay: 2,
        nextIncompleteDay: 5,
        // When day 3 opens, not day 5.
        nextDayOpensAt: inFuture(20 * HOUR),
      }),
    );
    expect(msg.body).toBe("Day 5 opens in 3 days.");
    expect(msg.body).not.toMatch(/hours/);
  });

  it("gives no wait at all for a day the clock has already reached", () => {
    // Should not arrive here: an open day would not have been refused. Saying
    // it opens in 20 hours would be the plainest lie of the set.
    const msg = dayLockMessage(
      state({ lockedDay: 2, currentDay: 2, nextDayOpensAt: inFuture(20 * HOUR) }),
    );
    expect(msg.body).toBe("Day 2 opens later.");
  });

  it("still trusts the instant when it cannot name the day, since a close guess beats none", () => {
    expect(
      dayLockMessage(state({ lockedDay: null, nextDayOpensAt: inFuture(20 * HOUR) })).body,
    ).toBe("This day opens in 20 hours.");
  });

  it("holds on the success screen too, which reads the same instant", () => {
    expect(
      dayCloseLine({
        finishedDay: 2,
        nextDay: 5,
        currentDay: 2,
        nextDayOpensAt: inFuture(20 * HOUR),
      }),
    ).toBe("Day 5 opens in 3 days.");
  });

  it("reaches the Home card's line too — the loudest surface the wrong word was on", () => {
    expect(
      dayCloseLine({
        finishedDay: 1,
        nextDay: 2,
        currentDay: 1,
        nextDayOpensAt: inFuture(20 * HOUR),
      }),
    ).toBe("Day 2 opens in 20 hours.");
  });
});

describe("dayCloseLine", () => {
  // No "Day N done" prefix: "opens in a day" already says today is done.
  // `finishedDay` is threaded through the type for callers that still need to
  // know which day, but the SENTENCE never repeats it.
  it("says only when the next day opens, not that this one closed", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: 2 }),
    ).toBe("Day 3 opens in a day.");
  });

  it("counts further-out days", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 4, currentDay: 2 }),
    ).toBe("Day 4 opens in 2 days.");
  });

  it("reads the same whether or not it can name the day it finished", () => {
    expect(
      dayCloseLine({ finishedDay: null, nextDay: 3, currentDay: 2 }),
    ).toBe("Day 3 opens in a day.");
  });

  it("degrades to the vague-but-true phrase with no clock", () => {
    expect(
      dayCloseLine({ finishedDay: 2, nextDay: 3, currentDay: null }),
    ).toBe("This day opens later.");
  });
});

describe("nextOpenModuleId — the second pass must chain like the first", () => {
  /** A finished 3-day arc, and the same arc mid-run. */
  const DONE = { packStatus: "COMPLETED", arcDays: 3 };
  const RUNNING = { packStatus: "IN_PROGRESS", arcDays: 3 };

  /**
   * A 3-day arc the user has already finished once. Every module is COMPLETED
   * and every day is behind the clock, so the server reports them all unlocked,
   * and every one carries the date it was first finished.
   * This is the exact state the old rule failed on.
   */
  const finishedPack = [
    { moduleId: "m1", orderIndex: 0, unlocked: true, firstCompletedAt: "2026-08-01" },
    { moduleId: "m2", orderIndex: 1, unlocked: true, firstCompletedAt: "2026-08-02" },
    { moduleId: "m3", orderIndex: 2, unlocked: true, firstCompletedAt: "2026-08-03" },
  ];

  /**
   * THE SAME ARC, FINISHED WITH DAY 3 SKIPPED. Day 3 is optional, so the pack
   * reached COMPLETED without it, and it was never done: `firstCompletedAt` is
   * null. Every day is still `unlocked: true`, because the clock is past the end
   * of the arc — which is why `unlocked` cannot tell this apart from a day they
   * finished. Interview Ready's day 10 is this shape.
   */
  const skippedDayPack = [
    { moduleId: "m1", orderIndex: 0, unlocked: true, firstCompletedAt: "2026-08-01" },
    { moduleId: "m2", orderIndex: 1, unlocked: true, firstCompletedAt: "2026-08-02" },
    {
      moduleId: "m3",
      orderIndex: 2,
      unlocked: true,
      firstCompletedAt: null,
      isMandatory: false,
    },
  ];

  /**
   * THE DEFECT. The screen used to stop on two tests before it got here: it
   * returned early when the pack was COMPLETED, and it required the next module
   * to be NOT_STARTED. On a repeat pass both are false for every module, so the
   * button never appeared once. The user had to go Home, then Programs, then the
   * pack, then the day list, for every single module of a program they had paid
   * for and were doing again.
   */
  it("offers the next module on a pack that is already finished", () => {
    expect(nextOpenModuleId(finishedPack, 0, DONE)).toBe("m2");
    expect(nextOpenModuleId(finishedPack, 1, DONE)).toBe("m3");
  });

  it("lets a replay chain from any point, not just from the start", () => {
    // Day order is a first-pass idea. Somebody redoing day 2 gets day 3 next.
    expect(nextOpenModuleId(finishedPack, 1, DONE)).toBe("m3");
  });

  it("offers nothing after the last module", () => {
    expect(nextOpenModuleId(finishedPack, 2, DONE)).toBeNull();
  });

  it("still refuses a module the server says is shut", () => {
    // The first pass, mid-arc: tomorrow's module must never be offered, or the
    // user lands on the day-locked screen one tap after finishing.
    const firstPass = [
      { moduleId: "m1", orderIndex: 0, unlocked: true },
      { moduleId: "m2", orderIndex: 1, unlocked: false },
    ];
    expect(nextOpenModuleId(firstPass, 0, RUNNING)).toBeNull();
  });

  it("treats a missing unlocked field as no opinion, not as shut", () => {
    // An older backend does not send the field. Reading absent as false would
    // remove the button for everybody on that build.
    expect(nextOpenModuleId([{ moduleId: "m2", orderIndex: 1 }], 0, RUNNING)).toBe(
      "m2",
    );
  });

  it("returns null rather than throwing when the list has a gap", () => {
    // orderIndex is the server's, so the app must not assume it is dense.
    expect(nextOpenModuleId(finishedPack, 7, DONE)).toBeNull();
    expect(nextOpenModuleId([], 0, DONE)).toBeNull();
  });

  /**
   * THE SECOND DEFECT, and the one this fixture exists for. Replaying day 2 of a
   * finished program offered day 3, which the user had skipped. `startModule`
   * refuses that one (PackCompletedError, 409), so the button we drew ourselves
   * led to an error sheet and, on the older detection, to "check your
   * connection and tap Complete again" with a perfect connection.
   */
  it("does not offer a day that was skipped on a program the user finished", () => {
    expect(nextOpenModuleId(skippedDayPack, 1, DONE)).toBeNull();
  });

  it("still offers a day they DID finish on that same program", () => {
    // The narrow rule must not become the old broad one: a replay of a finished
    // day is exactly what the button is for.
    expect(nextOpenModuleId(skippedDayPack, 0, DONE)).toBe("m2");
  });

  it("offers a never-finished day while the program is still running", () => {
    // Mid-run this is the normal case: day 3 is unlocked and not yet done, and
    // the server starts it happily. Only a FINISHED pack closes it.
    expect(nextOpenModuleId(skippedDayPack, 1, RUNNING)).toBe("m3");
  });
});

describe("isModuleOfferable — the rule both screens share", () => {
  const DONE_ARC = { packStatus: "COMPLETED", arcDays: 14 };
  const DONE_NO_ARC = { packStatus: "COMPLETED", arcDays: null };
  const skipped = { moduleId: "m", orderIndex: 0, unlocked: true, firstCompletedAt: null };

  it("treats a missing firstCompletedAt as no opinion, not as never finished", () => {
    // A backend that does not send the field must not make every day of every
    // finished program untappable. Same rule as `unlocked`: absent is silence.
    expect(
      isModuleOfferable({ moduleId: "m", orderIndex: 0, unlocked: true }, DONE_ARC),
    ).toBe(true);
  });

  it("refuses an unfinished day on a finished arc whether or not it was optional", () => {
    // `isMandatory` does not enter into it on an arc: the server throws
    // PackCompletedError before it looks at the flag.
    expect(isModuleOfferable({ ...skipped, isMandatory: false }, DONE_ARC)).toBe(false);
    expect(isModuleOfferable({ ...skipped, isMandatory: true }, DONE_ARC)).toBe(false);
  });

  it("allows an unfinished MANDATORY module on a finished pack with no arc", () => {
    // The one case the server permits: it quietly reopens the pack, which is
    // the Refresher flow. Refusing here would remove a route that works.
    expect(isModuleOfferable({ ...skipped, isMandatory: true }, DONE_NO_ARC)).toBe(
      true,
    );
  });

  it("refuses an unfinished OPTIONAL module even with no arc", () => {
    expect(isModuleOfferable({ ...skipped, isMandatory: false }, DONE_NO_ARC)).toBe(
      false,
    );
  });

  it("puts the day lock first: a shut day is shut whatever the pack status says", () => {
    expect(
      isModuleOfferable(
        { moduleId: "m", orderIndex: 0, unlocked: false, firstCompletedAt: "2026-08-01" },
        { packStatus: "IN_PROGRESS", arcDays: 14 },
      ),
    ).toBe(false);
  });

  it("says nothing about a pack whose status never arrived", () => {
    // progress can fail. Absent status must read as the ordinary running case,
    // not as COMPLETED, or a failed call would lock the whole day list.
    expect(isModuleOfferable(skipped, {})).toBe(true);
  });
});

