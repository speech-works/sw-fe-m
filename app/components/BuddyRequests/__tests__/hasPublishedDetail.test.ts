import { hasPublishedDetail } from "../RequestSheet";
import type { BuddyRequest } from "../../../api/buddies";

const req = (extra: Partial<BuddyRequest> = {}): BuddyRequest => ({
  id: "r1",
  direction: "incoming",
  profile: { id: "u1", name: "Aarav Mehta" },
  createdAt: new Date().toISOString(),
  ...extra,
});

/**
 * The one rule that keeps the row honest.
 *
 * A chevron is a promise that there is more behind it. Against today's server
 * a request carries a name and a timestamp and nothing else, so opening one
 * would show you the row again in a larger font. These cases are the difference
 * between "richer when the backend lands" and "a disappointment shipped now".
 */
describe("hasPublishedDetail", () => {
  it("is false for a bare request", () => {
    expect(hasPublishedDetail(req())).toBe(false);
  });

  it("is false against an older server that sends none of the fields", () => {
    // The whole point of the fields being optional. `undefined` must read as
    // "nothing to show", never throw and never count as detail.
    const bare = req();
    expect(bare.tags).toBeUndefined();
    expect(hasPublishedDetail(bare)).toBe(false);
  });

  it("is false when the person published an empty card", () => {
    expect(hasPublishedDetail(req({ tags: [], matchReason: null }))).toBe(false);
  });

  it("is true with tags", () => {
    expect(hasPublishedDetail(req({ tags: ["Mornings"] }))).toBe(true);
  });

  it("is true with a match reason alone", () => {
    expect(hasPublishedDetail(req({ matchReason: "Also working on phone calls" }))).toBe(true);
  });

  it("is false when the only extra is memberSince", () => {
    // True of everybody, and not a reason to say yes to anyone. A sheet
    // containing only this is still an empty sheet.
    expect(hasPublishedDetail(req({ memberSince: "2026-03-01" }))).toBe(false);
  });
});
