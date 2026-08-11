import { buildRoom, GAP } from "../geometry";

/**
 * The Community room's camera.
 *
 * Two properties matter enough to pin. The first is PERFORMANCE: every tile is
 * an SVG avatar, and the tile count is set by arithmetic nobody reads when
 * they're adjusting how the room looks. A regression here is invisible in a
 * screenshot and very visible on a mid-range Android, so the budget is asserted
 * rather than assumed.
 *
 * The second is that the perspective actually IS a perspective — tiles growing
 * toward the viewer is the only thing that makes this read as a room you're
 * standing in rather than a mosaic seen from above.
 */

const PHONE = { w: 393, h: 852 }; // iPhone 15
const SMALL = { w: 375, h: 667 }; // SE — the tightest shipping viewport

describe("buildRoom", () => {
  it("stays inside the tile budget on a normal phone", () => {
    // The flat wall this replaced drew 15–20. Two-and-a-bit times that is the
    // accepted cost of the full-bleed room; an order of magnitude is not.
    const room = buildRoom(PHONE.w, PHONE.h);
    expect(room.total).toBeGreaterThan(20);
    expect(room.total).toBeLessThanOrEqual(40);
  });

  it("does not blow the budget on a large tablet-ish viewport", () => {
    const room = buildRoom(1024, 1366);
    expect(room.total).toBeLessThanOrEqual(80);
  });

  it("grows tiles toward the viewer", () => {
    const { bands } = buildRoom(PHONE.w, PHONE.h);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].size).toBeGreaterThan(bands[i - 1].size);
    }
  });

  it("thins the haze toward the viewer and never goes negative", () => {
    const { bands } = buildRoom(PHONE.w, PHONE.h);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].haze).toBeLessThanOrEqual(bands[i - 1].haze);
    }
    expect(Math.min(...bands.map((b) => b.haze))).toBeGreaterThanOrEqual(0);
  });

  it("stacks bands with no vertical gaps or overlaps", () => {
    const { bands } = buildRoom(PHONE.w, PHONE.h);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].top).toBe(bands[i - 1].top + bands[i - 1].size + GAP);
    }
  });

  it("overfills every row so neither end is ever on screen", () => {
    // A row that exactly fits shows a start and an end, which reads as a strip
    // of icons rather than a crowd continuing past the frame.
    const { bands } = buildRoom(PHONE.w, PHONE.h);
    for (const b of bands) {
      expect(b.count * (b.size + GAP)).toBeGreaterThan(PHONE.w);
    }
  });

  it("stops generating before the scrim goes opaque", () => {
    // Tiles below this line cost a full SVG each and paint nothing.
    const { bands } = buildRoom(PHONE.w, PHONE.h);
    const last = bands[bands.length - 1];
    expect(last.top).toBeLessThanOrEqual(PHONE.h * 0.78);
  });

  it("clears the copy block on every viewport", () => {
    // The regression this pins: targeting the subject's TOP at 0.4 put its
    // actual centre at 0.4 + half a tile, which on the SE ran the pair straight
    // through the headline. The stage begins near 0.50 on the shortest screen,
    // so the subject has to be wholly above that with room to spare.
    for (const v of [PHONE, SMALL]) {
      const { subjectTop, subjectSize } = buildRoom(v.w, v.h);
      expect(subjectTop).toBeGreaterThan(v.h * 0.08);
      expect(subjectTop + subjectSize).toBeLessThan(v.h * 0.48);
    }
  });

  it("keeps the subject pair inside the screen width", () => {
    // Two tiles plus their gap. If this ever exceeds the viewport the pair is
    // cropped, and a cropped empty seat stops reading as a seat.
    for (const v of [PHONE, SMALL]) {
      const { subjectSize } = buildRoom(v.w, v.h);
      expect(subjectSize * 2 + 16).toBeLessThan(v.w);
    }
  });

  it("scales the subject up so it is not mistaken for set dressing", () => {
    const room = buildRoom(PHONE.w, PHONE.h);
    expect(room.subjectSize).toBeGreaterThan(room.bands[room.subjectBand].size);
  });

  it("is deterministic — the same viewport gives the same room", () => {
    // Art that re-lays out between renders reads as a glitch.
    expect(buildRoom(PHONE.w, PHONE.h)).toEqual(buildRoom(PHONE.w, PHONE.h));
  });

  it("survives a zero or negative viewport rather than looping or throwing", () => {
    // useWindowDimensions can report 0 for a frame on some Android launches.
    for (const [w, h] of [[0, 0], [393, 0], [0, 852], [-5, -5]]) {
      const room = buildRoom(w, h);
      expect(room.bands).toEqual([]);
      expect(room.total).toBe(0);
      expect(room.subjectSize).toBe(0);
    }
  });
});
