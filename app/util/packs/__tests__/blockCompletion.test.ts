import {
  doneBlocksKey,
  mergeBlockCompletion,
  parseDoneBlocks,
  serializeDoneBlocks,
} from "../blockCompletion";

/**
 * The whole point of this module is one property: completion never goes
 * backwards. Everything below is that property from a different angle, because
 * the bug it prevents is silent — a step quietly un-finishing itself is not an
 * error anybody sees until their day list is wrong.
 */
describe("block completion is monotonic", () => {
  it("adds newly derived completions", () => {
    const next = mergeBlockCompletion(new Set(["a"]), new Set(["b"]));
    expect(Array.from(next).sort()).toEqual(["a", "b"]);
  });

  it("KEEPS a completion the fresh snapshot no longer sees", () => {
    // The retry case: block "a" was finished, the user starts it again, the
    // block now points at an unfinished activity, so `derived` drops it. It
    // must survive anyway.
    const next = mergeBlockCompletion(new Set(["a"]), new Set());
    expect(next.has("a")).toBe(true);
  });

  it("keeps everything when the snapshot fails entirely", () => {
    // A failed store read or an unhydrated activity looks exactly like "none
    // of it was ever done". That must not wipe the record.
    const latched = new Set(["a", "b", "c"]);
    expect(mergeBlockCompletion(latched, new Set())).toBe(latched);
  });

  it("returns the SAME set when nothing is new, so no render is forced", () => {
    const latched = new Set(["a"]);
    expect(mergeBlockCompletion(latched, new Set(["a"]))).toBe(latched);
  });

  it("survives a round trip through storage", () => {
    const ids = new Set(["a", "b"]);
    expect(parseDoneBlocks(serializeDoneBlocks(ids))).toEqual(ids);
  });

  it("treats unreadable storage as empty rather than throwing", () => {
    // An empty latch is recoverable — the derived snapshot refills it. A throw
    // inside the focus effect would take the screen down.
    expect(parseDoneBlocks(null).size).toBe(0);
    expect(parseDoneBlocks("not json").size).toBe(0);
    expect(parseDoneBlocks('{"a":1}').size).toBe(0);
    expect(parseDoneBlocks('["a", 2, null]')).toEqual(new Set(["a"]));
  });

  it("keys the latch per module, not per pack", () => {
    // Two modules in one pack must not share a latch, or finishing a step in
    // day 2 would mark the same-numbered step in day 3 done.
    expect(doneBlocksKey("p1", "m1")).not.toBe(doneBlocksKey("p1", "m2"));
  });
});
