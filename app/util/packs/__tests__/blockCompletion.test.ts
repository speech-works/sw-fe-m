import {
  doneBlocksKey,
  isDoneBlocksKey,
  tickRunOf,
  mergeBlockCompletion,
  parseDoneBlocks,
  serializeDoneBlocks,
  serverDoneBlocks,
  ticksToSend,
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

  it("keys the latch per run, so a restart starts clean (E1)", () => {
    // Run 0 keeps the old key: ticks saved before this change are still found.
    expect(doneBlocksKey("p1", "m1", 0)).toBe(doneBlocksKey("p1", "m1"));
    expect(doneBlocksKey("p1", "m1", 1)).not.toBe(doneBlocksKey("p1", "m1", 0));
    expect(tickRunOf({ completedBlockRun: 2 })).toBe(2);
    expect(tickRunOf({})).toBe(0);
    expect(tickRunOf({ completedBlockRun: -1 })).toBe(0);
    expect(tickRunOf(null)).toBe(0);
  });

  it("log out can find every tick key and nothing else (E2)", () => {
    expect(isDoneBlocksKey(doneBlocksKey("p1", "m1"))).toBe(true);
    expect(isDoneBlocksKey(doneBlocksKey("p1", "m1", 4))).toBe(true);
    expect(isDoneBlocksKey("SW_ZSTORE_PACKS")).toBe(false);
    expect(isDoneBlocksKey("pack-p1-module-m1-last-step")).toBe(false);
  });
});

/**
 * D1 (10 Nov 2026): two phones. The server's ticks join the phone's own, and
 * the phone sends up what the server is missing.
 */
describe("ticks from the other phone", () => {
  it("reads the server's ticks off the day", () => {
    expect(Array.from(serverDoneBlocks({ completedBlockIds: ["a", "b"] }))).toEqual([
      "a",
      "b",
    ]);
  });

  it("treats a server without the field as no ticks", () => {
    expect(serverDoneBlocks({}).size).toBe(0);
    expect(serverDoneBlocks(null).size).toBe(0);
    expect(serverDoneBlocks({ completedBlockIds: "a" }).size).toBe(0);
    expect(Array.from(serverDoneBlocks({ completedBlockIds: ["a", 3] }))).toEqual(["a"]);
  });

  it("phone B shows the steps done on phone A, and keeps its own", () => {
    const phoneB = new Set(["c"]);
    const shown = mergeBlockCompletion(phoneB, serverDoneBlocks({ completedBlockIds: ["a", "b"] }));
    expect(Array.from(shown).sort()).toEqual(["a", "b", "c"]);
  });

  it("sends only this phone's ticks the server lacks", () => {
    const pending = ticksToSend(
      new Set(["a", "b", "c"]),
      new Set(["a"]),
      new Set(["a", "b", "c"]),
      new Set(),
    );
    expect(pending).toEqual(["b", "c"]);
  });

  it("skips ticks already sent this visit and steps that are not on this day", () => {
    const pending = ticksToSend(
      new Set(["a", "b", "old-block"]),
      new Set(),
      new Set(["a", "b"]),
      new Set(["a"]),
    );
    expect(pending).toEqual(["b"]);
  });
});
