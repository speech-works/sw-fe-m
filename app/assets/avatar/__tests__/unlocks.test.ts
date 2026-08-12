import {
  PART_REGISTRY,
  UNLOCK_LEVEL,
  EARN_STAGE,
  partTier,
  partUnlockLevel,
  partsUnlockedBetween,
  stageCrossedBetween,
  isPartUnlocked,
  slotOfPart,
} from "../registry";
import { STAGE_MIN_LEVELS } from "../../../types/avatar";
import type { AvatarSlot } from "../../../types/avatar";

const allIds = (Object.keys(PART_REGISTRY) as AvatarSlot[]).flatMap((s) =>
  Object.keys(PART_REGISTRY[s]),
);

/**
 * The unlock ladder.
 *
 * These assert the SHAPE of the reward curve, not just that the code runs.
 * Levels cost `18(level-1)²` XP against an 800/week cap, so a part parked above
 * ~30 is one almost nobody will ever wear — the tests below are what stop the
 * table drifting up there as parts get added.
 */
describe("unlock ladder", () => {
  it("gives every part a level, priced by its tier", () => {
    allIds.forEach((id) => {
      const lvl = partUnlockLevel(id);
      expect(Number.isFinite(lvl)).toBe(true);
      expect(lvl).toBeGreaterThanOrEqual(1);
      if (partTier(id) === "everyday") expect(lvl).toBe(1);
      // Collection pieces always cost something. Journey gear does NOT: the
      // Seeker kit is granted at stage 0, which is level 1 — the tourist hat
      // and camera are meant to be there on day one, since the story starts
      // with you already being a tourist.
      if (partTier(id) === "collection") expect(lvl).toBeGreaterThan(1);
    });
  });

  it("prices every collection part, and prices nothing that does not exist", () => {
    const collection = allIds.filter((id) => partTier(id) === "collection");
    const unpriced = collection.filter((id) => UNLOCK_LEVEL[id] === undefined);
    expect(unpriced).toEqual([]);
    // A stale row here is a part someone renamed or deleted; it would silently
    // price nothing at all.
    const orphaned = Object.keys(UNLOCK_LEVEL).filter((id) => !allIds.includes(id));
    expect(orphaned).toEqual([]);
  });

  it("resolves journey gear through the stage it belongs to", () => {
    Object.entries(EARN_STAGE).forEach(([id, stage]) => {
      expect(partUnlockLevel(id)).toBe(STAGE_MIN_LEVELS[stage]);
    });
  });

  it("opens the ladder early enough to be discovered", () => {
    const first = Math.min(...Object.values(UNLOCK_LEVEL));
    expect(first).toBeLessThanOrEqual(5);
  });

  it("puts the bulk of the reward where people actually reach", () => {
    const levels = Object.values(UNLOCK_LEVEL);
    const reachable = levels.filter((l) => l <= 25).length;
    // ~19 weeks of capped practice gets you to 30; most of the catalog has to
    // land before that or the ladder is decoration.
    expect(reachable / levels.length).toBeGreaterThan(0.7);
  });

  it("has no gap that stalls the drip through the early levels", () => {
    const levels = new Set(Object.values(UNLOCK_LEVEL));
    const gaps: number[] = [];
    for (let l = 3; l <= 25; l++) if (!levels.has(l)) gaps.push(l);
    expect(gaps).toEqual([]);
  });

  it("unlocks at the boundary, not after it", () => {
    expect(isPartUnlocked("headgear.party", 3)).toBe(false);
    expect(isPartUnlocked("headgear.party", 4)).toBe(true);
    expect(isPartUnlocked("headgear.party", 5)).toBe(true);
    // Everyday parts are wearable from the first minute.
    expect(isPartUnlocked("hair.afro", 1)).toBe(true);
    // Unknown ids must not lock a stored manifest out of its own gear.
    expect(isPartUnlocked("collar.fromTheFuture", 1)).toBe(true);
  });
});

/**
 * What the reward reveal announces.
 *
 * The failure this guards is a lie, not a crash: showing someone a hat they
 * already had, or swallowing one they just earned. Both are silent — the popup
 * looks perfectly fine either way.
 */
describe("partsUnlockedBetween", () => {
  it("is half-open — the level you were already on grants nothing new", () => {
    // eyewear.heart needs level 5, so arriving AT 5 reveals it...
    expect(partsUnlockedBetween(4, 5)).toContain("eyewear.heart");
    // ...and leaving 5 must not reveal it a second time.
    expect(partsUnlockedBetween(5, 6)).not.toContain("eyewear.heart");
  });

  it("returns nothing when the level did not go up", () => {
    expect(partsUnlockedBetween(7, 7)).toEqual([]);
    expect(partsUnlockedBetween(9, 4)).toEqual([]);
  });

  it("collects every rung of a multi-level jump", () => {
    const one = partsUnlockedBetween(3, 4);
    const two = partsUnlockedBetween(4, 5);
    const both = partsUnlockedBetween(3, 5);
    const merged = [...one, ...two].sort(
      (a, b) => partUnlockLevel(a) - partUnlockLevel(b) || a.localeCompare(b),
    );
    expect(both).toEqual(merged);
    expect(both.length).toBe(one.length + two.length);
  });

  it("includes journey gear, which is priced through its stage", () => {
    // Stage 1 (Pathfinder) opens at level 6 — its kit has to appear there and
    // nowhere else, or the story gear is never announced at all.
    expect(partsUnlockedBetween(5, 6)).toContain("headgear.explorer");
    expect(partsUnlockedBetween(6, 7)).not.toContain("headgear.explorer");
  });

  it("only ever names parts that were locked before and are wearable after", () => {
    for (let to = 2; to <= 55; to++) {
      partsUnlockedBetween(to - 1, to).forEach((id) => {
        expect(isPartUnlocked(id, to - 1)).toBe(false);
        expect(isPartUnlocked(id, to)).toBe(true);
      });
    }
  });

  it("comes back in unlock order, stably", () => {
    const ids = partsUnlockedBetween(1, 30);
    const levels = ids.map(partUnlockLevel);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(partsUnlockedBetween(1, 30)).toEqual(ids);
  });

  it("never leaks the free catalog into a reveal", () => {
    // A level-up must not announce the ~70 everyday parts, which are level 1.
    // The obvious way to break this is an inclusive lower bound.
    expect(partsUnlockedBetween(1, 2)).toEqual([]);
    partsUnlockedBetween(1, 60).forEach((id) => {
      expect(partTier(id)).not.toBe("everyday");
    });
  });

  it("stays small enough to show as a gift", () => {
    // The reveal shows 4 cards and hides the rest behind "and N more". A single
    // level dumping a dozen pieces means the ladder has bunched up.
    for (let to = 2; to <= 55; to++) {
      expect(partsUnlockedBetween(to - 1, to).length).toBeLessThanOrEqual(6);
    }
  });
});

/**
 * Which level-ups get the loud treatment.
 *
 * This gate is the only thing keeping the big celebration rare. If it starts
 * returning true for ordinary levels the god-rays fire five or six times in
 * someone's first week and stop meaning anything, and nothing about the app
 * would look broken while that happened.
 */
describe("stageCrossedBetween", () => {
  it("fires on the level each stage begins at, and nowhere else", () => {
    const crossings: number[] = [];
    for (let to = 2; to <= 60; to++) {
      if (stageCrossedBetween(to - 1, to)) crossings.push(to);
    }
    // Stage 0 opens at level 1, which nobody levels UP into.
    expect(crossings).toEqual(STAGE_MIN_LEVELS.filter((l) => l > 1));
  });

  it("catches a crossing jumped over in one practice", () => {
    // Level 5 to 7 skips past 6 without ever landing on it.
    expect(stageCrossedBetween(5, 7)).toBe(true);
    expect(stageCrossedBetween(6, 8)).toBe(false);
  });

  it("stays quiet when the level did not go up", () => {
    expect(stageCrossedBetween(6, 6)).toBe(false);
    expect(stageCrossedBetween(20, 6)).toBe(false);
  });

  it("keeps the loud tier genuinely rare", () => {
    const loud = [];
    for (let to = 2; to <= 30; to++) if (stageCrossedBetween(to - 1, to)) loud.push(to);
    // Through level 30, which is roughly a committed user's first five months,
    // this may fire at most twice.
    expect(loud.length).toBeLessThanOrEqual(2);
  });
});

describe("slotOfPart", () => {
  it("places every registered part, and nothing else", () => {
    (Object.keys(PART_REGISTRY) as AvatarSlot[]).forEach((slot) => {
      Object.keys(PART_REGISTRY[slot]).forEach((id) => {
        expect(slotOfPart(id)).toBe(slot);
      });
    });
    expect(slotOfPart("headgear.fromTheFuture")).toBeNull();
  });
});
