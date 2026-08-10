import { removeBlocked, blockedOnLabel } from "../BlockedPeople.helpers";

const rows = [
  { userId: "a", name: "Ana", createdAt: "2026-01-02T00:00:00.000Z" },
  { userId: "b", name: "Ben", createdAt: "2026-02-02T00:00:00.000Z" },
  { userId: "c", name: "Cal", createdAt: "2026-03-02T00:00:00.000Z" },
];

/**
 * The Blocked people list removes a row optimistically and rolls back if the
 * unblock request fails — the opposite of the report path in Timeline, which
 * deliberately keeps content hidden on failure. Here the opposite is right:
 * showing someone as unblocked while they are still blocked is a lie the user
 * will act on ("why can't they send me a code?").
 */
describe("removeBlocked", () => {
  it("removes exactly the named person", () => {
    expect(removeBlocked(rows, "b").map((r) => r.userId)).toEqual(["a", "c"]);
  });

  it("preserves the order of everyone else", () => {
    expect(removeBlocked(rows, "a").map((r) => r.userId)).toEqual(["b", "c"]);
  });

  it("is a no-op for an id that isn't in the list", () => {
    expect(removeBlocked(rows, "nobody")).toHaveLength(3);
  });

  it("does not mutate the array it was given, so rollback can restore it", () => {
    const before = [...rows];
    removeBlocked(rows, "b");
    expect(rows).toEqual(before);
  });

  it("handles removing the only row", () => {
    expect(removeBlocked([rows[0]], "a")).toEqual([]);
  });
});

describe("blockedOnLabel", () => {
  it("renders a coarse month and year, never a precise timestamp", () => {
    // Deliberately coarse: the exact minute someone blocked another person is
    // not something this screen should re-surface.
    const label = blockedOnLabel("2026-03-02T11:45:00.000Z");
    expect(label).toMatch(/^Blocked /);
    expect(label).toMatch(/2026/);
    expect(label).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("degrades to a bare label rather than 'Invalid Date'", () => {
    expect(blockedOnLabel("not-a-date")).toBe("Blocked");
  });
});
