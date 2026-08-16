import { declineBarMessage, undoableDeclines } from "../declineBatch";
import type { BuddyRequest } from "../../../api/buddies";

/**
 * The held-decline batch.
 *
 * These pin the behaviour that replaced a real defect: the bar used to hold ONE
 * request, and a second decline committed the first immediately. Clearing a
 * queue means declining people a second apart, so every decline but the last
 * lost its grace window without saying so, and Undo never applied in the one
 * workflow where a mis-tap is most likely.
 */
const req = (id: string, name?: string | null): BuddyRequest =>
  ({ id, profile: { name } } as unknown as BuddyRequest);

describe("declineBarMessage", () => {
  it("renders nothing when the batch is empty", () => {
    expect(declineBarMessage([])).toBeNull();
  });

  it("names the person while there is only one", () => {
    // "1 declined" would be strictly worse than the name we already have.
    expect(declineBarMessage([req("a", "Elena Fischer")])).toBe("Elena declined");
  });

  it("counts once there are more, because three names do not fit a snackbar", () => {
    expect(
      declineBarMessage([req("a", "Elena"), req("b", "Yusuf"), req("c", "Noah")]),
    ).toBe("3 declined");
  });

  it("falls back rather than printing 'undefined declined'", () => {
    // A request whose sender publishes no name is a real state.
    expect(declineBarMessage([req("a", null)])).toBe("Request declined");
    expect(declineBarMessage([req("a", "")])).toBe("Request declined");
  });
});

describe("undoableDeclines", () => {
  it("returns the whole batch while nothing has been sent", () => {
    const batch = [req("a", "Elena"), req("b", "Yusuf")];
    expect(undoableDeclines(batch, new Set())).toHaveLength(2);
  });

  it("never restores a request the server has already declined", () => {
    // The bar lives for one tick after the timer fires. A tap landing in that
    // gap must not put a row back that is already gone on the server.
    const batch = [req("a", "Elena"), req("b", "Yusuf")];
    const left = undoableDeclines(batch, new Set(["a"]));
    expect(left.map((r) => r.id)).toEqual(["b"]);
  });

  it("returns nothing once the whole batch is committed", () => {
    const batch = [req("a"), req("b")];
    expect(undoableDeclines(batch, new Set(["a", "b"]))).toHaveLength(0);
  });
});
