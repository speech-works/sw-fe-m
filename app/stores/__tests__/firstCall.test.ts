import {
  FIRST_CALL_DEFER_MS,
  isFirstCallQuieted,
} from "../firstCall";

/**
 * ============================================================================
 * WHAT "NOT NOW" IS ALLOWED TO MEAN
 * ----------------------------------------------------------------------------
 * The first call is offered ONCE PER USER, EVER. This store decides how loudly
 * Home offers it — and the single rule it must never break is that quieting is
 * about VOLUME, never about entitlement. The moment a device-local flag can
 * decide somebody has "used up" their call, a reinstall gives one person two
 * and a cleared cache takes another's away, silently and permanently.
 *
 * So every case below is really the same assertion from a different angle:
 * quieted or not, there is still a call, and the server is the only thing that
 * can say otherwise.
 * ============================================================================
 */

describe("First call — how loudly Home offers it", () => {
  it("is loud for somebody who has never put it off", () => {
    expect(
      isFirstCallQuieted({ deferredAt: null, noHeadphones: false }),
    ).toBe(false);
  });

  it("goes quiet right after a 'remind me later'", () => {
    expect(
      isFirstCallQuieted({ deferredAt: Date.now(), noHeadphones: false }),
    ).toBe(true);
  });

  it("comes back on its own once the reminder is due", () => {
    // THE POINT OF THE TIMESTAMP. A boolean would mean somebody who deferred
    // once — on a bus, in an office, at a bad moment — has to go hunting for
    // the offer forever after. A "remind me later" that never reminds is just
    // a dismissal with better manners.
    const stale = Date.now() - FIRST_CALL_DEFER_MS - 1000;
    expect(
      isFirstCallQuieted({ deferredAt: stale, noHeadphones: false }),
    ).toBe(false);
  });

  it("stops asking somebody who told us they have no headphones", () => {
    // The other direction, and the reason this is not just a timer. Calls need
    // headphones today; re-offering every three days to somebody who does not
    // own a pair is nagging about hardware, not reminding about a call. It
    // stays quiet even long after the deferral window has passed.
    const ancient = Date.now() - FIRST_CALL_DEFER_MS * 10;
    expect(
      isFirstCallQuieted({ deferredAt: ancient, noHeadphones: true }),
    ).toBe(true);
    expect(
      isFirstCallQuieted({ deferredAt: null, noHeadphones: true }),
    ).toBe(true);
  });

  it("never has a state that means the call is gone", () => {
    // THE INVARIANT. `isFirstCallQuieted` returns a presentation choice — hero
    // card or quiet row — and the caller must be able to treat BOTH as "there
    // is still a call here". If a state ever needed a third answer, somebody
    // would eventually read it as "no call", which is not this store's fact to
    // hold. Asserted structurally: the function is total and boolean over every
    // combination it can be given.
    const combos = [
      { deferredAt: null, noHeadphones: false },
      { deferredAt: null, noHeadphones: true },
      { deferredAt: Date.now(), noHeadphones: false },
      { deferredAt: Date.now(), noHeadphones: true },
      { deferredAt: 0, noHeadphones: false },
    ];
    for (const c of combos) {
      expect(typeof isFirstCallQuieted(c)).toBe("boolean");
    }
  });

  it("treats a zero timestamp as 'never deferred', not as 1970", () => {
    // `deferredAt: 0` is what a corrupted or half-written persisted store looks
    // like. Reading it as a real time would put the deferral 56 years in the
    // past, which is harmless here (it would un-quiet), but reading it as
    // "deferred" would quiet the offer forever on a falsy value. Falsy means
    // never.
    expect(isFirstCallQuieted({ deferredAt: 0, noHeadphones: false })).toBe(
      false,
    );
  });
});
