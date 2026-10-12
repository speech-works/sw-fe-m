import {
  MAX_SAVED_REPLIES,
  addReply,
  canSaveReply,
  nextThoughtIndex,
  reframePairs,
  savedPairsFromBlock,
} from "../reframeReplies";

describe("reframePairs", () => {
  it("reads a single pair saved before lists existed", () => {
    expect(reframePairs({ thought: "A", reply: "B", source: "written" })).toEqual([
      { thought: "A", reply: "B" },
    ]);
  });

  it("reads every pair of a list, in order", () => {
    expect(
      reframePairs({
        thought: "B",
        reply: "2",
        source: "written",
        replies: [
          { thought: "A", reply: "1", source: "written" },
          { thought: "B", reply: "2", source: "written" },
        ],
      }),
    ).toEqual([
      { thought: "A", reply: "1" },
      { thought: "B", reply: "2" },
    ]);
  });

  it("returns nothing for empty or broken data", () => {
    expect(reframePairs(null)).toEqual([]);
    expect(reframePairs({ thought: "A", reply: " " })).toEqual([]);
  });
});

describe("savedPairsFromBlock", () => {
  it("prefers the full list and falls back to the single pair", () => {
    expect(
      savedPairsFromBlock({
        savedReframe: { thought: "B", reply: "2" },
        savedReframes: [
          { thought: "A", reply: "1" },
          { thought: "B", reply: "2" },
        ],
      }),
    ).toHaveLength(2);
    expect(savedPairsFromBlock({ savedReframe: { thought: "A", reply: "1" } })).toEqual([
      { thought: "A", reply: "1" },
    ]);
    expect(savedPairsFromBlock({})).toEqual([]);
  });
});

describe("saving replies on the thought screen", () => {
  it("cannot save an empty box", () => {
    expect(canSaveReply("")).toBe(false);
    expect(canSaveReply("   \n")).toBe(false);
    expect(canSaveReply("They may only be listening")).toBe(true);
    expect(addReply([], "A thought", "  ")).toEqual([]);
  });

  it("saves the person's own words with the thought they answer", () => {
    const one = addReply([], "I ruined it", "  One block in a long talk ");
    expect(one).toEqual([
      { thought: "I ruined it", reply: "One block in a long talk", source: "written" },
    ]);
    const two = addReply(one, "They think I am nervous", "They may only be listening");
    expect(two).toHaveLength(2);
  });

  it("does not save the same pair twice or past the limit", () => {
    const one = addReply([], "A", "B");
    expect(addReply(one, "A", "B")).toBe(one);
    const full = Array.from({ length: MAX_SAVED_REPLIES }, (_, i) => ({
      thought: `t${i}`,
      reply: `r${i}`,
      source: "written" as const,
    }));
    expect(addReply(full, "new", "new")).toBe(full);
  });

  it("needs a thought to answer", () => {
    expect(addReply([], undefined, "words")).toEqual([]);
  });

  it("moves to the next thought and wraps round", () => {
    expect(nextThoughtIndex(0, 3)).toBe(1);
    expect(nextThoughtIndex(2, 3)).toBe(0);
    expect(nextThoughtIndex(0, 0)).toBe(0);
  });
});
