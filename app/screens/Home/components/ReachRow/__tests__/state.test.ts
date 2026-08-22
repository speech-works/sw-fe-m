import { MAX_DOTS, countWord, resolveReachRow } from "../state";
import type { ProgramGoal, ReachSummary } from "../../../../../api/programGoals/types";

const goal = (text: string): ProgramGoal => ({
  id: text,
  noun: text,
  text,
  rank: 0,
  report: "FULL",
  reportedAt: null,
  closedAt: null,
  answerType: "deed",
  reportStyle: "did_it",
});

const sum = (over: Partial<ReachSummary>): ReachSummary => ({
  total: 0,
  done: 0,
  waiting: 0,
  predictions: 0,
  latestDone: null,
  oldestWaiting: null,
  oldestUnreported: null,
  ...over,
});

describe("resolveReachRow", () => {
  it("explains itself, and asks, only when nothing has ever been set", () => {
    const s = resolveReachRow(sum({}))!;
    expect(s.kind).toBe("empty");
    expect(s.cta).toBeTruthy();
    // Zero of zero is not a number worth printing.
    expect(s.dots.total).toBe(0);
    expect(s.glow).toBe("none");
  });

  it("is the only state with a button", () => {
    const others = [
      sum({ total: 3, oldestUnreported: goal("a") }),
      sum({ total: 3, waiting: 3, oldestWaiting: goal("a") }),
      sum({ total: 3, done: 1, waiting: 2, latestDone: goal("a") }),
      sum({ total: 3, done: 3, latestDone: goal("a") }),
      sum({ total: 3, predictions: 3 }),
    ];
    for (const s of others) expect(resolveReachRow(s)!.cta).toBeNull();
  });

  // ── THE LIGHT ───────────────────────────────────────────────────────────
  it("never lights up before something has been done", () => {
    const unlit = [
      sum({}),
      sum({ total: 3, waiting: 3, oldestWaiting: goal("a") }),
      sum({ total: 3, predictions: 3 }),
    ];
    for (const s of unlit) expect(resolveReachRow(s)!.glow).toBe("none");
  });

  it("uses the brand hue, not the success one, while a program is still running", () => {
    // Nothing to celebrate and nothing to apologise for.
    const s = resolveReachRow(sum({ total: 3, oldestUnreported: goal("a") }))!;
    expect(s.kind).toBe("running");
    expect(s.glow).toBe("warm");
  });

  it("only goes strong when everything is done", () => {
    expect(resolveReachRow(sum({ total: 3, done: 2, waiting: 1, latestDone: goal("a") }))!.glow).toBe("on");
    expect(resolveReachRow(sum({ total: 3, done: 3, latestDone: goal("a") }))!.glow).toBe("strong");
  });

  // ── THE HOLE THIS WAS WRITTEN FOR ───────────────────────────────────────
  it("does not offer the shop to somebody whose goals were all fears", () => {
    // Breaking Thought Traps stores predictions. They close on being answered,
    // none count as done, so every other field is empty while total is 3.
    const s = resolveReachRow(sum({ total: 3, predictions: 3 }))!;
    expect(s.kind).toBe("predictions");
    expect(s.cta).toBeNull();
    expect(s.said).toBe("You named three things you were afraid of");
    // No praise for a fear.
    expect(s.glow).toBe("none");
  });

  it("still treats a deed as a deed when somebody holds both kinds", () => {
    const s = resolveReachRow(
      sum({ total: 6, predictions: 3, done: 2, waiting: 1, latestDone: goal("Call the bank") }),
    )!;
    expect(s.kind).toBe("some_done");
  });

  // ── THE WORDS ───────────────────────────────────────────────────────────
  it("marks a beginning rather than a fraction", () => {
    const s = resolveReachRow(sum({ total: 3, done: 1, waiting: 2, latestDone: goal("a") }))!;
    expect(s.sub).toBe("Your first. Two more when you want them.");
    expect(s.sub).not.toMatch(/1 of 3|33%/);
  });

  it("says the count in words, never as a ratio or a percentage", () => {
    const all = [
      sum({ total: 3, done: 2, waiting: 1, latestDone: goal("a") }),
      sum({ total: 3, done: 3, latestDone: goal("a") }),
      sum({ total: 6, done: 4, waiting: 2, latestDone: goal("a") }),
    ];
    for (const s of all) {
      const text = `${resolveReachRow(s)!.eyebrow} ${resolveReachRow(s)!.sub}`;
      expect(text).not.toMatch(/\d+\s*(of|\/)\s*\d+|%/);
    }
  });

  it("uses none of the words this feature refuses", () => {
    const banned =
      /complete|progress|achievement|streak|score|percent|well done|goal met/i;
    const all = [
      sum({}),
      sum({ total: 3, oldestUnreported: goal("a") }),
      sum({ total: 3, waiting: 3, oldestWaiting: goal("a") }),
      sum({ total: 3, done: 1, waiting: 2, latestDone: goal("a") }),
      sum({ total: 3, done: 3, latestDone: goal("a") }),
      sum({ total: 3, predictions: 3 }),
    ];
    for (const s of all) {
      const r = resolveReachRow(s)!;
      expect(`${r.eyebrow} ${r.said} ${r.sub} ${r.cta ?? ""}`).not.toMatch(banned);
    }
  });

  it("offers permission, not a nudge, when nothing has been done", () => {
    const s = resolveReachRow(sum({ total: 3, waiting: 3, oldestWaiting: goal("a") }))!;
    expect(s.kind).toBe("none_done");
    expect(s.sub).toBe("No rush. They stay here.");
    // Not "1 of 3 done", which is the same fact told as a shortfall.
    expect(s.sub).not.toMatch(/\d/);
  });

  it("reads correctly for a single goal", () => {
    const s = resolveReachRow(sum({ total: 1, done: 1, latestDone: goal("a") }))!;
    expect(s.eyebrow).toBe("YOU DID IT");
    expect(s.sub).not.toContain("them");
  });

  it("keeps singular and plural straight either side", () => {
    expect(resolveReachRow(sum({ total: 2, done: 1, waiting: 1, latestDone: goal("a") }))!.sub)
      .toBe("Your first. One more when you want it.");
    expect(resolveReachRow(sum({ total: 3, done: 2, waiting: 1, latestDone: goal("a") }))!.sub)
      .toBe("Two done. One still on your list.");
  });

  // ── SHAPE ───────────────────────────────────────────────────────────────
  it("carries a dot per goal so the row can draw the history", () => {
    const s = resolveReachRow(sum({ total: 6, done: 4, waiting: 2, latestDone: goal("a") }))!;
    expect(s.dots).toEqual({ total: 6, done: 4 });
  });

  it("counts in words up to ten and in figures past it", () => {
    expect(countWord(3)).toBe("three");
    expect(countWord(10)).toBe("ten");
    expect(countWord(11)).toBe("11");
  });

  it("has a point past which dots stop being countable", () => {
    // The row drops them and keeps the sentence rather than printing confetti.
    expect(MAX_DOTS).toBeLessThanOrEqual(10);
  });

  it("renders nothing at all before the summary arrives", () => {
    expect(resolveReachRow(null)).toBeNull();
  });
});
