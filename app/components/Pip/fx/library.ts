/**
 * The effects gallery for Pip: the particle drawings (FX_SHAPES) and the effects built from them (FX_EFFECTS).
 * Everything here is DATA for the engine in ./FxLayer.tsx (see ./types.ts for every field).
 *
 * Rules this set follows:
 * - OPEN and FLOATING. Effects use the whole screen: pieces come in from the edges, drift past Pip and leave past the edges.
 *   No rings, halos, glows, light wheels, comic bursts or any big single shape behind or around Pip.
 * - Depth: every field of pieces has small, slow, paler far ones (behind Pip) and bigger, faster, brighter near ones.
 * - Sticker look: chunky flat hand-cut shapes in three palettes (neon, warm, soft). Big stickers carry a dark offset sliver,
 *   so pale and white ones keep an edge on the light canvas.
 * - Things that belong to Pip start at his centre (the default origin) or on an "arc" around it; everything else is placed
 *   on the screen (x, y = 0..1 of the screen).
 * - At most 90 particles per effect, at most 16 "flicker" particles. Sounds sit on the visual hits.
 */
import type { FxEffect, FxEmitter, FxShape } from "./types";

// ───────────────────────────── colours ─────────────────────────────
// Three sticker sets. Neon: lime, hot red, candy pink, white. Warm: Speechworks orange, sunny yellow, coral, peach.
// Soft: yellow, coral, pink, cobalt, teal. Big stickers carry a dark offset sliver (cut-paper look), so pale and white
// ones keep an edge on the light canvas; the sliver disappears on the dark canvas.
const INK = "#1B1917";
const LIME = "#DFFF2E", RED = "#FF2B2B", PINK = "#FF9BD8", WHITE = "#FFFFFF";
const OR = "#F76117", OR2 = "#FF7A1A", CORAL = "#FF5A2E", GOLD = "#FFC530", SUN = "#FFD84A", CREAM = "#FFCFA8";
const ROSE = "#FF9DB1", BLUE = "#1E7BFF", TEAL = "#2BB3A3";
const SKY = "#7CC6FE", ICE = "#BFE3FF", VIO = "#8B5CF6", LILAC = "#C4B5FD";

const NEON = [LIME, RED, PINK, LIME, RED, PINK, WHITE];
const SOFT = [GOLD, CORAL, ROSE, BLUE, TEAL];
const PARTY = [RED, PINK, LIME, GOLD, BLUE, TEAL, OR];
const GOLDS = [GOLD, SUN, OR2, CREAM];
const SNOW = [ICE, SKY, WHITE, "#A5D8FF"];
const PETAL = [PINK, ROSE, "#FFC2D9", "#FF6FA8"];
const LEAF = [OR, GOLD, CORAL, OR2, RED];

// ───────────────────────────── shape maths ─────────────────────────────
type Pth = FxShape["paths"][number];
const f = (n: number) => Math.round(n * 10) / 10;
/** A point at radius r and angle deg (0 = right, -90 = up) around (cx, cy). */
const P = (r: number, deg: number, cx = 50, cy = 50) => `${f(cx + r * Math.cos((deg * Math.PI) / 180))} ${f(cy + r * Math.sin((deg * Math.PI) / 180))}`;
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const times = (n: number, fn: (i: number) => string) => Array.from({ length: n }, (_, i) => fn(i)).join("");
/** Move a path (its absolute commands; relative ones follow by themselves). */
const shift = (d: string, dx: number, dy: number) => d.replace(/([MLHVCSQTA])([^A-Za-z]*)/g, (_m, c: string, args: string) => {
  const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return c + n.map((v, i) => f(c === "H" ? v + dx : c === "V" ? v + dy : c === "A" ? (i % 7 === 5 ? v + dx : i % 7 === 6 ? v + dy : v) : i % 2 ? v + dy : v + dx)).join(" ");
});
/** A solid piece; `round` softens its corners. */
const fl = (d: string, fill: string, round = 0): Pth => (round ? { d, fill, stroke: fill, sw: round } : { d, fill });
/** A thick line piece. */
const ln = (d: string, stroke: string, sw: number, opacity = 1): Pth => ({ d, stroke, sw, opacity });
/** A sticker: its main pieces with a dark offset sliver under them, then the small details on top. */
const sticker = (mains: Pth[], details: Pth[] = []): FxShape => ({
  paths: [...mains.map(m => ({ ...m, d: shift(m.d, 3, 4), ...(m.fill ? { fill: INK } : {}), ...(m.stroke ? { stroke: INK } : {}), opacity: 0.9 })), ...mains, ...details],
});

/** A fat five-point star. */
const star5 = (R: number, r: number, cy = 52) => "M" + times(10, i => (i ? "L" : "") + P(i % 2 ? r : R, -90 + i * 36, 50, cy)) + "Z";
const heartD = "M50 88C24 68 8 52 9 33C10 18 21 9 33 10C42 11 47 16 51 23C55 15 62 9 71 10C84 11 93 21 91 35C89 53 76 68 50 88Z";
const flameD = "M52 4C60 24 84 38 82 64C80 84 66 96 50 96C32 96 18 82 18 62C18 48 26 40 32 26C36 36 40 40 45 40C50 28 48 16 52 4Z";
const star4 = (cx: number, cy: number, R: number) => { const q = R * 0.16; return `M${cx} ${cy - R}Q${cx + q} ${cy - q} ${cx + R} ${cy}Q${cx + q} ${cy + q} ${cx} ${cy + R}Q${cx - q} ${cy + q} ${cx - R} ${cy}Q${cx - q} ${cy - q} ${cx} ${cy - R}Z`; };

// ───────────────────────────── the drawings (100 x 100 box) ─────────────────────────────
// Sticker style: chunky, flat, bold, a little wonky, as if cut from paper by hand. Solid fills; thick lines only where needed.
export const FX_SHAPES: Record<string, FxShape> = {
  // paper bits
  rect: { paths: [fl("M34 13L65 10L69 86L32 90Z", "$c", 7)] },
  strip: { paths: [fl("M11 38L88 33L90 60L13 65Z", "$c", 7)] },
  squig: { paths: [ln("M13 55C20 26 34 28 40 50S58 74 64 50S80 28 88 45", "$c", 17)] },
  dot: { paths: [fl("M50 17C70 15 85 32 83 52C81 72 66 85 48 83C30 81 15 66 17 48C19 30 32 18 50 17Z", "$c")] },
  tri: { paths: [fl("M47 18L85 75L17 80Z", "$c", 11)] },
  streamer: { paths: [ln("M22 9C54 11 70 25 54 37S20 41 34 29S78 35 70 57S30 69 42 55S72 71 60 91", "$c", 11)] },
  // light
  sparkle: { paths: [fl(star4(50, 50, 46), "$c", 3)] },
  glitter: { paths: [fl("M50 14L85 48L52 86L15 52Z", "$c", 7)] },
  sparkpair: sticker([fl(star4(40, 58, 36), "$c", 3), fl(star4(79, 21, 16), "$c", 3)]),
  star: { paths: [fl(star5(35, 21), "$c", 14)] },
  // hearts
  heart: sticker([fl(heartD, "$c")]),
  // fire
  flame: { paths: [
    fl(flameD, "$c"),
    fl("M51 48C55 60 66 66 66 78C66 88 58 94 50 94C41 94 34 88 34 78C34 69 40 64 43 57C45 62 48 62 51 48Z", GOLD)] },
  flameheart: sticker([fl(flameD, "$c")], [fl("M50 88C38 79 30 71 30 63C30 55 36 51 41 51C45 51 48 53 50 57C52 53 55 51 59 51C64 51 70 55 70 63C70 71 62 79 50 88Z", WHITE)]),
  // weather and nature
  snowflake: { paths: [
    ln(times(3, i => `M${P(35, i * 60 - 90)}L${P(35, i * 60 + 90)}`), "$c", 13),
    fl(times(6, i => { const [x, y] = P(36, i * 60 - 90).split(" ").map(Number); return circle(x, y, 9); }), "$c"),
    fl(circle(50, 50, 15), "$c")] },
  petal: { paths: [fl("M50 8C64 10 85 34 80 60C77 80 62 93 48 92C34 90 22 78 20 58C17 34 38 7 50 8Z", "$c")] },
  leaf: { paths: [fl("M50 4C75 22 87 46 78 68C73 82 62 91 50 96C38 90 26 82 22 67C14 46 27 21 50 4Z", "$c"), ln("M50 30V96", INK, 4, 0.3)] },
  bubble: { paths: [{ d: circle(50, 50, 42), fill: "$c", opacity: 0.18 }, ln(circle(50, 50, 42), "$c", 8), ln("M28 41A24 24 0 0 1 41 28", WHITE, 8, 0.95)] },
  cloud: sticker([fl("M27 76C14 76 6 67 6 57C6 47 13 40 22 39C24 26 35 17 48 17C60 17 70 24 73 35C85 34 94 43 94 55C94 67 85 76 74 76Z", "$c")]),
  moon: sticker([fl("M60 7A45 45 0 1 0 93 60A36 36 0 1 1 60 7Z", "$c")]),
  // props
  balloon: { paths: [
    ln("M50 82C44 87 56 91 50 98", "#9AA5B5", 4),
    fl(shift("M50 4C72 3 85 20 84 40C83 59 67 73 50 73C33 73 16 58 16 39C16 20 29 5 50 4Z", 3, 4), INK),
    fl("M50 4C72 3 85 20 84 40C83 59 67 73 50 73C33 73 16 58 16 39C16 20 29 5 50 4Z", "$c"),
    fl("M50 70L58 83H42Z", "$c", 3),
    ln("M31 33C31 25 36 18 43 16", WHITE, 8, 0.7)] },
  note: sticker([fl("M16 78a17 13 0 1 0 34 0a17 13 0 1 0-34 0Z", "$c"), ln("M45 78V16C52 32 76 30 72 54", "$c", 10)]),
  notes: sticker([fl("M8 80a13.5 10.5 0 1 0 27 0a13.5 10.5 0 1 0-27 0ZM56 70a13.5 10.5 0 1 0 27 0a13.5 10.5 0 1 0-27 0Z", "$c"), ln("M30.5 80V27L78.5 17V70", "$c", 9), fl("M31 24L79 14V32L31 42Z", "$c")]),
  bulb: { paths: [
    ln("M50 3V10M17 16L22 21M83 16L78 21M5 46H12M95 46H88", GOLD, 7),
    fl(shift("M50 19C32 19 21 32 21 47C21 57 27 63 33 69C36 72 37 75 37 79H63C63 75 64 72 67 69C73 63 79 57 79 47C79 32 68 19 50 19Z", 3, 4), INK),
    fl("M50 19C32 19 21 32 21 47C21 57 27 63 33 69C36 72 37 75 37 79H63C63 75 64 72 67 69C73 63 79 57 79 47C79 32 68 19 50 19Z", GOLD),
    ln("M41 44v.1M59 44v.1M42 55Q50 63 58 55", INK, 5.5),
    fl("M38 81H62V89C62 93 57 96 50 96C43 96 38 93 38 89Z", "#6B6257")] },
  qmark: sticker([ln("M31 34C31 20 40 12 52 12C64 12 73 20 73 31C73 46 52 46 52 62", "$c", 18), fl(circle(52, 85, 10.5), "$c")]),
  zed: sticker([ln("M26 24H74L26 76H74", "$c", 17)]),
  hat: sticker([fl("M49 17L81 84H19Z", "$c", 7)], [
    fl("M36 46Q50 53 63.5 46L69 58Q50 66 30.5 58Z", GOLD), fl("M26 68Q50 77 73.5 68L78.5 80Q50 89 21 80Z", GOLD), fl(circle(49, 13, 11), PINK)]),
  bubbleheart: sticker(
    [fl("M22 9H78C87 9 94 16 94 25V57C94 66 87 73 78 73H48L26 92L28 73H22C13 73 6 66 6 57V25C6 16 13 9 22 9Z", "$c")],
    [fl("M50 63C36 53 28 45 28 36C28 29 34 24 40 24C44 24 48 26 50 31C52 26 56 24 60 24C66 24 72 29 72 36C72 45 64 53 50 63Z", WHITE)]),
  // stickers
  megaphone: sticker([
    fl("M12 40L58 17C64 14 69 18 69 25V72C69 79 64 82 58 80L12 59Z", "$c", 6),
    fl("M24 62L39 66L41 86C41 92 28 93 27 86Z", "$c", 4),
    ln("M80 30L90 23M83 49H95M80 67L90 75", "$c", 8)]),
  bolt: sticker([fl("M59 6L19 54H43L34 94L83 41H56Z", "$c", 7)]),
  quote: sticker([
    fl("M8 62C8 38 20 22 41 15L46 26C36 32 31 38 31 44C40 44 46 51 46 60C46 72 38 80 27 80C16 80 8 72 8 62Z", "$c"),
    fl("M54 62C54 38 66 22 87 15L92 26C82 32 77 38 77 44C86 44 92 51 92 60C92 72 84 80 73 80C62 80 54 72 54 62Z", "$c")]),
  asterisk: sticker([ln("M50 14V86M19 32L81 68M19 68L81 32", "$c", 17)]),
  thumb: sticker([
    fl("M9 48H24V88H9Z", "$c", 6),
    fl("M33 46C41 40 45 28 45 15C45 6 59 5 61 17C62 25 59 32 57 38H80C90 38 92 50 84 53C92 57 90 66 82 68C88 73 84 80 77 81C80 87 76 91 68 91H45C39 91 35 89 33 86Z", "$c", 3)]),
  smiley: sticker(
    [fl("M50 6C76 5 95 24 94 50C93 76 74 95 49 94C24 93 5 74 6 49C7 25 25 7 50 6Z", "$c")],
    [fl("M35 24a6 10 0 1 0 .1 0ZM63 24a6 10 0 1 0 .1 0Z", INK), fl("M24 54H76C77 72 65 84 50 84C35 84 23 72 24 54Z", INK)]),
  gift: sticker(
    [fl("M9 30H91V48H85V88C85 92 82 94 79 94H21C18 94 15 92 15 88V48H9Z", "$c", 4)],
    [fl("M43 30H57V94H43ZM50 30C40 9 17 11 23 25C26 32 40 32 50 30ZM50 30C60 9 83 11 77 25C74 32 60 32 50 30Z", GOLD), ln("M15 49H85", INK, 3, 0.3)]),
  card: sticker(
    [fl("M12 36C12 28 18 22 26 22H70C78 22 84 28 84 36V64C84 72 78 78 70 78H40L22 94L24 78C17 77 12 71 12 64Z", "$c")],
    [ln("M28 41H62M28 58H50", INK, 7, 0.8),
     fl("M80 20C74 15 71 12 71 8C71 5 73 3 76 3C78 3 79 4 80 6C81 4 82 3 84 3C87 3 89 5 89 8C89 12 86 15 80 20ZM93 38C89 35 87 33 87 30C87 28 88 27 90 27C91 27 92 28 93 29C94 28 95 27 96 27C98 27 99 28 99 30C99 33 97 35 93 38Z", RED)]),
  ffwd: sticker([fl("M10 22L49 50L10 78ZM51 22L90 50L51 78Z", "$c", 9)]),
  wave: sticker(
    [ln("M36 46L29 19M49 42L47 12M62 44L65 16M74 52L83 29M30 68L13 51", "$c", 14),
     fl("M26 50C28 40 80 38 82 55C84 73 74 93 54 93C38 93 27 81 26 66Z", "$c")],
    [fl("M88 4L96 12L88 20L80 12ZM9 20L15 26L9 32L3 26Z", RED)]),
  point: sticker(
    [ln("M37 58V14", "$c", 17), fl("M24 54C24 46 78 45 80 58V78C80 88 70 94 56 94H44C32 94 24 86 24 76Z", "$c", 3)],
    [ln("M52 60V72M66 60V72", INK, 3.5, 0.35)]),
};

// ───────────────────────────── emitter helpers ─────────────────────────────
type E = FxEmitter;
type R2 = [number, number];
const CONFETTI = ["rect", "strip", "squig", "dot", "tri", "rect"];
const SPARKS = ["glitter", "sparkle", "dot", "sparkle"];
const TOP = -0.06, BOT = 1.07;
/** The whole width of the screen, just above its top (for rain) or down to just below its bottom (for rise). */
const SKY_LINE: E["area"] = [-0.04, TOP, 1.04, TOP], GROUND: E["area"] = [-0.04, 0, 1.04, BOT];
const mul = (v: R2 | undefined, k: number, d: R2): R2 => { const q = v ?? d; return [q[0] * k, q[1] * k]; };

/** Depth: one field of pieces as three planes: far (small, slow, pale, behind Pip), middle, near (big, fast, bright). */
const depth = (e: E, n: number): E[] => ([[0.4, 0.55, 0.7, 0.5, "back"], [0.35, 0.85, 0.9, 0.85, "front"], [0.25, 1.3, 1.15, 1, "front"]] as const)
  .map(([share, size, speed, op, layer]) => ({ ...e, count: Math.max(1, Math.round(n * share)), size: mul(e.size, size, [0.03, 0.05]), speed: mul(e.speed, speed, [0.6, 1.2]), opacity: (e.opacity ?? 1) * op, layer }));

/** Paper confetti thrown up from one point (Pip's centre unless `origin` is given); it tumbles and falls off the screen. */
const toss = (o: Partial<E>): E => ({ kind: "burst", shapes: CONFETTI, colors: PARTY, flip: true, spin: [160, 520], size: [0.028, 0.05], spread: [-172, -8], speed: [0.45, 1.15], drag: 2.2, gravity: 0.42, life: [2000, 2700], fadeIn: 60, fadeOut: 500, ...o });
/** Pieces falling down the whole screen. */
const fall = (o: Partial<E>): E => ({ kind: "rain", shapes: CONFETTI, colors: PARTY, area: SKY_LINE, speed: [0.36, 0.56], gravity: 0.12, sway: 0.03, swayHz: 0.7, spin: [80, 300], size: [0.028, 0.05], life: [2200, 2600], stagger: 900, fadeIn: 200, fadeOut: 500, ...o });
/** Pieces floating up the whole screen. */
const lift = (o: Partial<E>): E => ({ kind: "rise", shapes: ["dot"], area: GROUND, speed: [0.3, 0.48], gravity: -0.06, sway: 0.03, swayHz: 0.5, size: [0.03, 0.06], life: [2300, 2800], stagger: 900, fadeIn: 200, fadeOut: 500, ...o });
/** Small bright sparks out of one point: they slow fast, hang and sink a little. */
const sparks = (o: Partial<E>): E => ({ kind: "burst", shapes: SPARKS, colors: GOLDS, spread: [0, 360], speed: [0.2, 0.55], drag: 3, gravity: 0.12, spin: [60, 240], size: [0.02, 0.048], life: [1000, 1500], fadeIn: 40, fadeOut: 550, ...o });
/** Sparkles that open and close once at random spots, drifting up a little. */
const twinkles = (count: number, at: number, stagger: number, colors: string[], o: Partial<E> = {}): E =>
  ({ kind: "twinkle", shapes: ["sparkle", "sparkle", "sparkpair"], colors, count, area: [0.04, 0.03, 0.96, 0.9], at, stagger, size: [0.035, 0.08], life: [600, 1000], spin: [10, 50], speed: [0.005, 0.02], sway: 0.008, ...o });
/** Upright things (hearts, notes, bulbs...) let go from Pip: they drift out in every direction, far across the screen, and float away. */
const release = (shapes: string[], colors: string[], n: number, o: Partial<E> = {}): E =>
  ({ kind: "burst", upright: true, shapes, colors, count: n, spread: [0, 360], speed: [0.3, 0.78], drag: 1.5, gravity: -0.04, size: [0.06, 0.12], life: [1700, 2300], stagger: 500, fadeIn: 160, fadeOut: 550, ...o });
/** Stickers that float loose across the screen: tilted, turning slowly. */
const loose = (shapes: string[], colors: string[], n: number, o: Partial<E> = {}): E =>
  ({ kind: "burst", shapes, colors, count: n, spread: [0, 360], speed: [0.35, 0.85], drag: 1.6, gravity: 0.03, tilt: [-22, 22], spin: [4, 16], size: [0.14, 0.22], life: [1900, 2500], stagger: 350, fadeIn: 140, fadeOut: 500, ...o });
/** One firework shell at a place on the screen: a short trail up, then sparks that hang and sink, then late sparkles. No ring. */
const shell = (x: number, y: number, t: number, colors: string[], layer: "back" | "front", n = 22): E[] => [
  { kind: "rise", shapes: ["dot"], colors: [colors[0]], count: 4, at: t - 380, stagger: 120, area: [x, 0, x, y + 0.34], speed: [1.3, 1.3], size: [0.014, 0.022], life: [260, 260], fadeIn: 30, fadeOut: 120, layer },
  sparks({ origin: [x, y], at: t, count: n, colors, layer, speed: [0.25, 0.85], size: [0.024, 0.055], life: [1100, 1600] }),
  sparks({ origin: [x, y], at: t + 40, count: 4, colors, layer, shapes: ["sparkpair"], speed: [0.15, 0.5], size: [0.06, 0.1], life: [1100, 1500] }),
];

// ───────────────────────────── the effects ─────────────────────────────
// founder 2026-11-26 rejected and removed: Sunrise drift, Magic swirl, Balloons, Cosy campfire, Soft oops, Drum-roll reveal
export const FX_EFFECTS: FxEffect[] = [
  // ── paper ──
  { id: "confetti-burst", name: "Confetti burst", ms: 3000,
    feel: "Paper flies up from behind Pip, spreads wide over the screen and tumbles down past the bottom edge. For a quiz answer that is right or a step done.",
    emitters: [
      ...depth(toss({ colors: [...NEON.slice(0, 6), GOLD] }), 72),
      twinkles(10, 350, 1100, [LIME, PINK, GOLD]),
    ],
    sounds: [{ name: "popper", at: 0, volume: 0.8 }, { name: "sparkle", at: 420, volume: 0.45 }],
    pip: [{ at: 0, body: "bighop", face: "laugh", haptic: "success" }, { at: 1000, face: "smile" }, { at: 2600, face: "calm" }] },

  { id: "confetti-cannons", name: "Side cannons", ms: 3200,
    feel: "Two cannons fire from the bottom corners of the screen, one after the other; the paper arcs up, crosses in the middle and floats down. For a day done.",
    emitters: [
      ...depth(toss({ origin: [-0.03, 1.02], spread: [-82, -58], speed: [1.7, 3.0], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 40),
      ...depth(toss({ at: 220, origin: [1.03, 1.02], spread: [-122, -98], speed: [1.7, 3.0], drag: 1.5, gravity: 0.55, life: [2200, 2800] }), 40),
      toss({ origin: [-0.03, 1.02], spread: [-78, -62], speed: [1.9, 2.7], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 4, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2200, 2800] }),
      toss({ at: 220, origin: [1.03, 1.02], spread: [-118, -102], speed: [1.9, 2.7], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 4, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2200, 2800] }),
    ],
    sounds: [{ name: "popper", at: 0, volume: 0.8 }, { name: "popper", at: 220, volume: 0.7 }, { name: "chime-up", at: 800, volume: 0.55 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 500, body: "bounce", face: "laugh", haptic: "success" }, { at: 1500, face: "smile" }, { at: 2800, face: "calm" }] },

  { id: "confetti-rain", name: "Confetti rain", ms: 3500,
    feel: "Paper drifts down the whole screen from above, far pieces slow and small, near ones big, with a soft xylophone run. For a calm finish.",
    emitters: [
      ...depth(fall({ flip: true }), 84),
    ],
    sounds: [{ name: "xylo-run", at: 0, volume: 0.6 }, { name: "sparkle", at: 1000, volume: 0.4 }, { name: "chime-up", at: 1900, volume: 0.45 }],
    pip: [{ at: 0, body: "nod", face: "curious" }, { at: 600, body: "sway", face: "smile" }, { at: 1600, body: "hop", face: "laugh" }, { at: 3100, face: "calm" }] },

  { id: "streamers", name: "Curly streamers", ms: 3200,
    feel: "Long curly ribbons shoot up from Pip with a zip, open out across the screen and curl down past him. For a program finished.",
    emitters: [
      ...depth(toss({ at: 100, shapes: ["streamer"], speed: [0.6, 1.2], drag: 2.0, gravity: 0.32, size: [0.1, 0.17], spin: [30, 130], flip: false, life: [2300, 3000] }), 20),
      ...depth(toss({ at: 100, shapes: ["dot", "tri", "strip"], size: [0.022, 0.038] }), 36),
      twinkles(8, 600, 1200, [LIME, GOLD, PINK]),
    ],
    sounds: [{ name: "zip", at: 0, volume: 0.6 }, { name: "popper", at: 100, volume: 0.7 }, { name: "tada", at: 320, volume: 0.7 }],
    pip: [{ at: 0, body: "settle", face: "curious" }, { at: 120, body: "pop", face: "laugh", haptic: "success" }, { at: 1200, face: "proud" }, { at: 2800, face: "calm" }] },

  // ── light ──
  { id: "fireworks", name: "Fireworks", ms: 3500,
    feel: "Three rockets climb the screen and open one by one in yellow, red-pink and lime; the sparks hang, then sink and fade. For a program finished.",
    emitters: [
      ...shell(0.22, 0.3, 450, [GOLD, SUN, OR2], "front"),
      ...shell(0.8, 0.2, 1050, [RED, PINK, ROSE], "front"),
      ...shell(0.5, 0.48, 1700, [LIME, TEAL, SKY], "back"),
    ],
    sounds: [{ name: "whoosh", at: 60, volume: 0.4 }, { name: "firework", at: 450, volume: 0.75 }, { name: "firework", at: 1050, volume: 0.7 }, { name: "firework", at: 1700, volume: 0.8 }, { name: "sparkle", at: 2250, volume: 0.45 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 1050, body: "hop", face: "laugh" }, { at: 1700, body: "bighop", face: "proud", haptic: "success" }, { at: 3100, face: "calm" }] },

  { id: "gold-shower", name: "Golden shower", ms: 3500,
    feel: "Gold sparkles sink slowly down the whole screen, near ones large and bright, far ones tiny, while a harp plays. For a quiet, proud moment such as a first call done.",
    emitters: [
      ...depth(fall({ shapes: ["sparkle", "glitter", "sparkle", "dot"], colors: GOLDS, speed: [0.3, 0.5], gravity: 0.06, sway: 0.016, spin: [40, 160], size: [0.024, 0.055], life: [2100, 2500], stagger: 1000 }), 68),
      twinkles(12, 500, 2000, [GOLD, SUN, CREAM], { size: [0.045, 0.09] }),
    ],
    sounds: [{ name: "harp", at: 0, volume: 0.7 }, { name: "sparkle", at: 750, volume: 0.5 }, { name: "sparkle", at: 1800, volume: 0.35 }],
    pip: [{ at: 0, body: "nod", face: "warm" }, { at: 1100, face: "proud" }, { at: 3100, face: "calm" }] },

  { id: "star-burst", name: "Star burst", ms: 2600,
    feel: "Fat sticker stars in lime, yellow, pink and red fly out from Pip in every direction, slow down and float off. Short and bright, for a quiz answer that is right.",
    emitters: [
      ...depth({ kind: "burst", at: 60, shapes: ["star"], colors: [LIME, GOLD, PINK, RED], spread: [0, 360], speed: [0.35, 0.95], drag: 2.6, gravity: 0.1, spin: [60, 220], size: [0.045, 0.09], life: [1500, 2200], fadeIn: 40, fadeOut: 600 }, 40),
      sparks({ at: 60, count: 18, colors: [LIME, PINK, GOLD], speed: [0.3, 0.8], drag: 3.2, size: [0.014, 0.03], life: [800, 1200] }),
      twinkles(8, 700, 900, [GOLD, PINK, LIME]),
    ],
    sounds: [{ name: "zip", at: 0, volume: 0.45 }, { name: "chime-up", at: 60, volume: 0.75 }, { name: "sparkle", at: 700, volume: 0.45 }],
    pip: [{ at: 0, body: "pop", face: "proud", haptic: "success" }, { at: 1100, face: "smile" }, { at: 2200, face: "calm" }] },

  { id: "shockwave", name: "Spark pop", ms: 1600,
    feel: "A quick spray of bright bits jumps out from Pip in all directions and floats off, with a boop and a ding. Very short, for a tap that worked or a small step done.",
    emitters: [
      ...depth(sparks({ at: 20, shapes: ["dot", "glitter", "tri"], colors: [LIME, RED, PINK, GOLD], speed: [0.4, 1.0], drag: 3.6, gravity: 0.06, size: [0.018, 0.04], life: [800, 1250], fadeOut: 500 }), 34),
      sparks({ at: 20, count: 5, shapes: ["sparkpair"], colors: [GOLD, LIME, PINK], speed: [0.3, 0.6], drag: 3.2, size: [0.06, 0.09], life: [900, 1300] }),
    ],
    sounds: [{ name: "boop", at: 0, volume: 0.7 }, { name: "whoosh", at: 60, volume: 0.3 }, { name: "ding", at: 430, volume: 0.55 }],
    pip: [{ at: 0, body: "pop", face: "smile", haptic: "light" }, { at: 1200, face: "calm" }] },

  { id: "glitter-rain", name: "Glitter rain", ms: 3000,
    feel: "A fast fall of tiny bright bits in neon colours streaks down the whole screen with a quick xylophone run. For a level up.",
    emitters: [
      ...depth(fall({ shapes: ["glitter", "dot", "glitter", "sparkle"], colors: [LIME, RED, PINK, GOLD, BLUE], speed: [0.55, 0.9], gravity: 0.25, sway: 0.01, swayHz: 1.2, spin: [120, 360], size: [0.018, 0.042], life: [1500, 1900], stagger: 1050 }), 78),
      twinkles(10, 300, 1700, [GOLD, PINK, LIME]),
    ],
    sounds: [{ name: "xylo-run", at: 0, volume: 0.65 }, { name: "sparkle", at: 450, volume: 0.5 }, { name: "sparkle", at: 1400, volume: 0.4 }],
    pip: [{ at: 0, body: "nod", face: "smile" }, { at: 800, body: "hop", face: "laugh", haptic: "success" }, { at: 2600, face: "calm" }] },

  // ── love ──
  { id: "hearts", name: "Heart hands", ms: 3800,
    feel: "Pip makes a heart with his hands and hearts float out from him and up the whole screen, big near ones and small far ones, with soft blips. For thanks, a mood check-in or a first call done.",
    emitters: [
      ...depth(release(["heart"], [RED, PINK, ROSE, OR2], 0, { at: 900, stagger: 900, size: [0.06, 0.12], life: [1800, 2000] }), 26),
      ...depth(lift({ upright: true, shapes: ["heart"], colors: [PINK, ROSE, RED], at: 600, stagger: 900, speed: [0.3, 0.46], size: [0.04, 0.085], life: [1900, 2250] }), 28),
      twinkles(8, 1200, 1500, [PINK, CREAM, ROSE]),
    ],
    sounds: [{ name: "harp", at: 300, volume: 0.4 }, { name: "heart-blip", at: 900, volume: 0.7 }, { name: "heart-blip", at: 1200, volume: 0.6 }, { name: "heart-blip", at: 1500, volume: 0.5 }, { name: "heart-blip", at: 2000, volume: 0.35 }],
    pip: [{ at: 0, move: "h-heart", haptic: "light" }] },

  { id: "speech-heart", name: "Heart message", ms: 3200,
    feel: "Little speech bubbles with hearts leave Pip like messages sent, drift out across the screen and float away, with small hearts between them. For a kind word or thanks for a check-in.",
    emitters: [
      release(["bubbleheart"], [PINK, RED, ROSE], 3, { at: 200, layer: "back", stagger: 700, size: [0.09, 0.12], opacity: 0.6, speed: [0.2, 0.5] }),
      release(["bubbleheart"], [PINK, RED, CORAL], 5, { at: 200, stagger: 800, size: [0.14, 0.2], life: [1900, 2200] }),
      ...depth(release(["heart"], [RED, PINK, ROSE], 0, { at: 400, stagger: 900, size: [0.035, 0.07], life: [1500, 1900] }), 18),
      twinkles(6, 700, 1500, [PINK, CREAM, LIME]),
    ],
    sounds: [{ name: "pop", at: 200, volume: 0.65 }, { name: "heart-blip", at: 400, volume: 0.7 }, { name: "heart-blip", at: 800, volume: 0.5 }, { name: "heart-blip", at: 1100, volume: 0.4 }],
    pip: [{ at: 0, face: "warm" }, { at: 220, body: "nod", haptic: "light" }, { at: 1400, face: "smile" }, { at: 2800, face: "calm" }] },

  // ── air ──
  { id: "bubbles", name: "Soap bubbles", ms: 3500,
    feel: "Clear bubbles of many sizes float up the whole screen and wobble past Pip with a bubbly sound and two small pops. For waiting or a light, playful moment.",
    emitters: [
      ...depth(lift({ upright: true, shapes: ["bubble"], colors: [SKY, TEAL, LILAC, ROSE], speed: [0.3, 0.5], gravity: -0.08, sway: 0.035, size: [0.06, 0.15], life: [2200, 2600], stagger: 900, fadeOut: 220 }), 34),
      twinkles(8, 1400, 1300, [SKY, ICE, LILAC], { shapes: ["sparkle"], size: [0.03, 0.055], life: [320, 520] }),
    ],
    sounds: [{ name: "bubbles", at: 0, volume: 0.7 }, { name: "pop", at: 1600, volume: 0.35 }, { name: "pop", at: 2350, volume: 0.3 }],
    pip: [{ at: 0, body: "sway", face: "curious" }, { at: 1200, face: "smile" }, { at: 1600, body: "hop" }, { at: 3100, face: "calm" }] },

  { id: "music", name: "Music notes", ms: 3200,
    feel: "Notes leave Pip, drift out and float up the screen, swaying in time with a xylophone run while Pip sways too. For a happy step done or a good mood.",
    emitters: [
      ...depth(release(["note", "notes"], [VIO, PINK, TEAL, OR, BLUE], 0, { stagger: 1300, gravity: -0.06, size: [0.08, 0.14], life: [1600, 1900] }), 24),
      ...depth(lift({ shapes: ["dot", "glitter"], colors: [VIO, PINK, TEAL, GOLD], speed: [0.3, 0.5], swayHz: 1.0, spin: [60, 200], size: [0.014, 0.03], life: [1800, 2200], stagger: 1000 }), 26),
    ],
    sounds: [{ name: "xylo-run", at: 0, volume: 0.7 }, { name: "boop", at: 920, volume: 0.4 }, { name: "xylo-run", at: 1450, volume: 0.55 }, { name: "ding", at: 2250, volume: 0.5 }],
    pip: [{ at: 0, body: "sway", face: "smile" }, { at: 730, body: "sway" }, { at: 1460, body: "sway", face: "laugh" }, { at: 2200, body: "nod" }, { at: 2850, face: "calm" }] },

  // ── fire ──
  { id: "spark-fountain", name: "Sparkler fountains", ms: 3100,
    feel: "Two fountains of gold sparks shoot up from the bottom corners of the screen, cross high above and rain down. For a level up or a program finished.",
    emitters: [
      ...depth(sparks({ origin: [0.1, 1.03], stagger: 1300, spread: [-96, -70], speed: [1.1, 1.9], drag: 1.3, gravity: 0.75, size: [0.018, 0.044], life: [1200, 1600], fadeOut: 400 }), 38),
      ...depth(sparks({ origin: [0.9, 1.03], stagger: 1300, at: 120, spread: [-110, -84], speed: [1.1, 1.9], drag: 1.3, gravity: 0.75, size: [0.018, 0.044], life: [1200, 1600], fadeOut: 400 }), 38),
      twinkles(10, 600, 1300, [GOLD, CREAM, OR2]),
    ],
    sounds: [{ name: "zip", at: 0, volume: 0.45 }, { name: "fire", at: 60, volume: 0.45 }, { name: "sparkle", at: 400, volume: 0.55 }, { name: "sparkle", at: 1250, volume: 0.4 }, { name: "chime-up", at: 1700, volume: 0.55 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 800, body: "bounce", face: "laugh", haptic: "success" }, { at: 1700, face: "proud" }, { at: 2600, face: "calm" }] },

  // ── weather and nature ──
  { id: "snowfall", name: "Gentle snowfall", ms: 5000,
    feel: "Snow falls slowly down the whole screen and sways from side to side with a soft hush. Pip shivers once, then smiles. For a calm pause or a mood check-in.",
    emitters: [
      ...depth(fall({ shapes: ["snowflake", "snowflake", "dot"], colors: SNOW, speed: [0.2, 0.34], gravity: 0.02, sway: 0.04, swayHz: 0.35, spin: [10, 55], size: [0.026, 0.06], life: [3200, 3700], stagger: 1300, fadeIn: 300, fadeOut: 700 }), 84),
    ],
    sounds: [{ name: "snow", at: 0, volume: 0.7 }, { name: "sparkle", at: 2400, volume: 0.25 }],
    pip: [{ at: 0, face: "curious" }, { at: 800, body: "sway" }, { at: 1600, body: "sway" }, { at: 2500, body: "nod", face: "warm" }, { at: 4600, face: "calm" }] },

  { id: "snow-globe", name: "Snow swirl", ms: 3600,
    feel: "A shake, and snow whirls up around Pip in a wide swirl, hangs, then settles slowly down the screen. For a welcome or a new day.",
    emitters: [
      { kind: "arc", shapes: ["snowflake", "dot"], colors: SNOW, count: 22, at: 300, stagger: 700, arc: [100, 440], radius: [0.3, 0.75], size: [0.03, 0.06], life: [1100, 1500], speed: [0.03, 0.08], sway: 0.03, spin: [20, 90] },
      ...depth({ kind: "burst", shapes: ["snowflake", "dot", "dot"], colors: SNOW, at: 350, spread: [0, 360], speed: [0.4, 1.1], drag: 2.3, gravity: 0.1, spin: [20, 120], size: [0.02, 0.055], life: [2400, 3200], fadeIn: 60, fadeOut: 700 }, 62),
    ],
    sounds: [{ name: "boing", at: 330, volume: 0.5 }, { name: "whoosh", at: 350, volume: 0.45 }, { name: "snow", at: 600, volume: 0.6 }, { name: "sparkle", at: 1500, volume: 0.3 }],
    pip: [{ at: 0, face: "curious" }, { at: 330, body: "bounce", haptic: "light" }, { at: 900, body: "sway" }, { at: 1700, face: "smile" }, { at: 3200, face: "calm" }] },

  { id: "blossom", name: "Cherry blossom", ms: 3800,
    feel: "Pink petals blow in from the top left corner, cross the whole screen on the wind and sink away while Pip rests his cheek on his hand. For a mood check-in or a gentle thank you.",
    emitters: [
      ...depth({ kind: "burst", shapes: ["petal"], colors: PETAL, origin: [-0.08, -0.04], stagger: 1400, spread: [12, 72], speed: [0.5, 1.0], drag: 0.45, gravity: 0.1, flip: true, spin: [40, 170], size: [0.034, 0.07], life: [1900, 2400], fadeIn: 150, fadeOut: 550 }, 50),
      ...depth(fall({ shapes: ["petal"], colors: PETAL, at: 300, stagger: 1100, speed: [0.26, 0.42], gravity: 0.04, sway: 0.07, swayHz: 0.45, flip: true, spin: [30, 120], size: [0.026, 0.05], life: [2000, 2400] }), 30),
    ],
    sounds: [{ name: "whoosh", at: 0, volume: 0.25 }, { name: "harp", at: 150, volume: 0.6 }, { name: "sparkle", at: 1600, volume: 0.25 }],
    pip: [{ at: 0, move: "h-cheek" }] },

  { id: "leaves", name: "Autumn leaves", ms: 3500,
    feel: "Orange and gold leaves swing down the whole screen like in a light wind, then a gust sweeps a few right across it. For a pause, or the close of a chapter.",
    emitters: [
      ...depth(fall({ shapes: ["leaf"], colors: LEAF, stagger: 800, speed: [0.3, 0.48], gravity: 0.05, sway: 0.09, swayHz: 0.5, flip: true, spin: [30, 130], size: [0.05, 0.095], life: [2300, 2700] }), 40),
      ...depth({ kind: "burst", shapes: ["leaf"], colors: LEAF, at: 1000, origin: [-0.1, 0.4], stagger: 450, spread: [-14, 22], speed: [0.9, 1.5], drag: 0.7, gravity: 0.12, flip: true, spin: [120, 320], size: [0.04, 0.08], life: [1500, 1900], fadeIn: 100, fadeOut: 450 }, 16),
    ],
    sounds: [{ name: "whoosh", at: 0, volume: 0.4 }, { name: "swoosh-down", at: 1000, volume: 0.45 }, { name: "tick", at: 2100, volume: 0.3 }],
    pip: [{ at: 0, body: "sway", face: "curious" }, { at: 1000, body: "lean" }, { at: 2000, body: "nod", face: "smile" }, { at: 3100, face: "calm" }] },

  { id: "rainbow", name: "Rainbow sweep", ms: 3400,
    feel: "Six bands of light bits sweep across the whole screen from left to right, one colour after the other, hang as a wide open rainbow and drift up and away. For a first call done or after a hard part.",
    emitters: [
      ...[RED, OR2, GOLD, LIME, BLUE, PINK].map((c, k): E => ({ kind: "arc", layer: k % 2 ? "front" : "back", shapes: ["dot", "sparkle", "glitter", "dot"], colors: [c], count: 14, at: 150 + k * 100, stagger: 800, origin: [0.5, 1.15], arc: [236, 304], radius: [1.82 - k * 0.085, 1.86 - k * 0.085], size: [0.034, 0.066], life: [1500, 1900], speed: [0.012, 0.03], sway: 0.012, spin: [10, 60] })),
      twinkles(6, 900, 1400, [GOLD, CREAM, SKY, ROSE]),
    ],
    sounds: [{ name: "slide-up", at: 0, volume: 0.45 }, { name: "chime-up", at: 250, volume: 0.7 }, { name: "sparkle", at: 1050, volume: 0.45 }, { name: "harp", at: 1300, volume: 0.3 }],
    pip: [{ at: 0, face: "curious" }, { at: 300, body: "bounce", face: "proud", haptic: "success" }, { at: 1500, face: "smile" }, { at: 2800, face: "calm" }] },

  // ── thoughts ──
  { id: "idea", name: "Bright idea", ms: 4200,
    feel: "Pip thinks while three ticks count up, then small smiling lightbulbs and sparkles pop out of him and float away across the screen with a ding. For a tip or a new idea.",
    emitters: [
      release(["dot"], [LILAC, SKY], 6, { at: 200, stagger: 800, spread: [-60, -25], speed: [0.14, 0.3], size: [0.016, 0.03], life: [700, 900] }),
      release(["bulb"], [GOLD], 2, { at: 1300, layer: "back", stagger: 250, speed: [0.25, 0.5], size: [0.08, 0.1], opacity: 0.6, life: [1200, 1450] }),
      release(["bulb"], [GOLD], 4, { at: 1300, stagger: 300, size: [0.13, 0.2], life: [1200, 1450] }),
      ...depth(sparks({ at: 1320, colors: [GOLD, SUN, LIME], speed: [0.3, 0.9], gravity: -0.03, life: [900, 1400] }), 22),
      twinkles(6, 1600, 600, [GOLD, CREAM], { life: [500, 800] }),
      // one small bulb stays: it pops out beside Pip's head, bobs for a while, then pops away (founder: one should stay)
      { kind: "pop", shapes: ["bulb"], colors: [GOLD], count: 1, at: 1450, life: [2500, 2500], size: [0.1, 0.1], arc: [305, 305], radius: [0.3, 0.3] },
    ],
    sounds: [{ name: "tick", at: 250, volume: 0.4 }, { name: "tick", at: 550, volume: 0.5 }, { name: "tick", at: 850, volume: 0.6 }, { name: "ding", at: 1300, volume: 0.75 }, { name: "sparkle", at: 1450, volume: 0.4 }],
    pip: [{ at: 0, body: "lean", face: "thinking" }, { at: 1300, body: "hop", face: "laugh", haptic: "light" }, { at: 2100, face: "smile" }, { at: 2650, face: "calm" }] },

  { id: "question", name: "Question marks", ms: 2900,
    feel: "Question marks of different sizes bob up out of Pip with a boing and drift off across the screen; Pip tilts his head. For a question or a choice to make.",
    emitters: [
      release(["qmark"], [LILAC, SKY], 3, { at: 250, layer: "back", stagger: 600, size: [0.06, 0.09], opacity: 0.6, life: [1600, 1900] }),
      release(["qmark"], [VIO, BLUE, TEAL], 5, { at: 250, stagger: 700, size: [0.11, 0.2], life: [1600, 1900] }),
      ...depth(sparks({ at: 270, shapes: ["dot"], colors: [LILAC, SKY, TEAL], speed: [0.2, 0.7], size: [0.012, 0.024], life: [800, 1200] }), 16),
    ],
    sounds: [{ name: "slide-up", at: 0, volume: 0.35 }, { name: "boing", at: 250, volume: 0.65 }, { name: "boop", at: 600, volume: 0.4 }, { name: "boop", at: 900, volume: 0.35 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 1200, body: "nod" }, { at: 2400, face: "calm" }] },

  { id: "thinking-dots", name: "Thinking dots", ms: 4200,
    feel: "Pip holds his chin and soft dots leave him in threes, tick, tick, tick, and float slowly up the screen. For waiting or loading.",
    emitters: [
      ...[0, 1200, 2400].flatMap((t, c) => [0, 220, 440].map((d, i): E =>
        release(["dot"], [[TEAL, VIO, OR][c]], 1, { at: 300 + t + d, stagger: 0, spread: [-42 + i * 9, -42 + i * 9], speed: [0.26 + i * 0.03, 0.26 + i * 0.03], drag: 1.6, gravity: -0.04, size: [0.04 + i * 0.012, 0.04 + i * 0.012], life: [1000, 1000], fadeIn: 120, fadeOut: 550 }))),
      ...depth(lift({ shapes: ["dot"], colors: [LILAC, SKY, CREAM], at: 200, stagger: 1700, speed: [0.12, 0.22], sway: 0.02, size: [0.012, 0.026], life: [1900, 2300], opacity: 0.8 }), 20),
    ],
    sounds: [
      { name: "tick", at: 300, volume: 0.35 }, { name: "tick", at: 520, volume: 0.4 }, { name: "tick", at: 740, volume: 0.45 },
      { name: "tick", at: 1500, volume: 0.35 }, { name: "tick", at: 1720, volume: 0.4 }, { name: "tick", at: 1940, volume: 0.45 },
      { name: "tick", at: 2700, volume: 0.35 }, { name: "tick", at: 2920, volume: 0.4 }, { name: "boop", at: 3140, volume: 0.45 }],
    pip: [{ at: 0, move: "h-chin" }] },

  { id: "party", name: "Party hats", ms: 3400,
    feel: "Pip hops and striped party hats are thrown up from him, turn in the air and fall away with confetti and streamers. For a welcome or a birthday-style moment.",
    emitters: [
      loose(["hat"], [OR, RED, BLUE, TEAL], 3, { at: 450, layer: "back", size: [0.09, 0.12], speed: [0.5, 0.9], drag: 1.8, gravity: 0.34, spin: [30, 90], opacity: 0.6, life: [2000, 2500] }),
      loose(["hat"], [OR, CORAL, BLUE, PINK], 5, { at: 450, spread: [-150, -30], size: [0.14, 0.22], speed: [0.6, 1.1], drag: 1.8, gravity: 0.4, spin: [30, 90], life: [2000, 2500] }),
      ...depth(toss({ at: 500 }), 54),
      toss({ at: 500, shapes: ["streamer"], count: 6, speed: [0.6, 1.1], gravity: 0.34, size: [0.09, 0.14], spin: [30, 130], flip: false }),
      twinkles(8, 900, 1400, [GOLD, CREAM, LIME]),
    ],
    sounds: [{ name: "boing", at: 450, volume: 0.7 }, { name: "popper", at: 500, volume: 0.7 }, { name: "xylo-run", at: 900, volume: 0.5 }],
    pip: [{ at: 0, body: "hop", face: "smile" }, { at: 480, body: "bounce", face: "laugh", haptic: "success" }, { at: 1700, face: "proud" }, { at: 3000, face: "calm" }] },

  // ── night ──
  { id: "sleepy-night", name: "Sleepy night", ms: 5000,
    feel: "Stars open all over the screen and drift up, a small moon floats by, and z, z, Z leave Pip and rise while he waves good night to a slow lullaby. For see you tomorrow.",
    emitters: [
      { kind: "arc", upright: true, layer: "back", shapes: ["moon"], colors: [GOLD], count: 1, at: 200, arc: [186, 186], radius: [0.4, 0.4], size: [0.2, 0.2], life: [4600, 4600], speed: [0.012, 0.012], sway: 0.012, swayHz: 0.2 },
      { kind: "twinkle", layer: "back", shapes: ["star", "sparkle", "sparkle"], colors: [CREAM, GOLD, LILAC, SKY], count: 22, at: 300, stagger: 2800, area: [0.03, 0.02, 0.97, 0.95], size: [0.022, 0.05], life: [1200, 1800], spin: [5, 25], speed: [0.008, 0.02], sway: 0.008, opacity: 0.6 },
      { kind: "twinkle", shapes: ["star", "sparkle", "sparkpair"], colors: [GOLD, CREAM, LILAC], count: 12, at: 600, stagger: 2800, area: [0.03, 0.02, 0.97, 0.95], size: [0.045, 0.085], life: [1100, 1600], spin: [5, 25], speed: [0.012, 0.03], sway: 0.01 },
      ...[1000, 2700].flatMap(t => [0, 1, 2].map((i): E =>
        release(["zed"], [[LILAC, LILAC, VIO][i]], 1, { at: t + i * 380, stagger: 0, spread: [-32 + i * 5, -32 + i * 5], speed: [0.22 + i * 0.06, 0.22 + i * 0.06], drag: 1.2, gravity: -0.03, size: [0.06 + i * 0.035, 0.06 + i * 0.035], life: [1500, 1500], fadeIn: 250, fadeOut: 650 }))),
      ...depth(lift({ shapes: ["dot"], colors: [LILAC, CREAM, SKY], at: 600, stagger: 2300, speed: [0.08, 0.16], sway: 0.02, swayHz: 0.3, size: [0.01, 0.022], life: [1700, 2100], opacity: 0.8 }), 16),
    ],
    sounds: [{ name: "sleepy", at: 0, volume: 0.7 }, { name: "sparkle", at: 700, volume: 0.2 }, { name: "harp", at: 2700, volume: 0.3 }],
    pip: [{ at: 0, move: "h-wave" }] },

  // ── stickers: they come loose from Pip and float off across the screen, tilted and turning slowly ──
  { id: "sticker-hello", name: "Sticker hello", ms: 3300,
    feel: "A waving hand, smileys and sparkle stickers come loose from Pip with a boing, float out over the screen at a tilt and drift off. For a welcome or a new day.",
    emitters: [
      loose(["wave"], [GOLD], 1, { at: 150, spread: [22, 22], speed: [0.34, 0.34], size: [0.26, 0.26], life: [2600, 2600], stagger: 0 }),
      loose(["smiley", "sparkpair"], [LIME, PINK, GOLD], 3, { at: 350, layer: "back", size: [0.08, 0.11], speed: [0.25, 0.5], opacity: 0.6 }),
      loose(["smiley", "sparkpair", "asterisk", "sparkpair"], [LIME, PINK, RED, GOLD], 6, { at: 350, stagger: 700, size: [0.12, 0.19], life: [1800, 2200] }),
      ...depth(sparks({ at: 170, shapes: ["glitter", "dot", "tri"], colors: [RED, LIME, PINK, GOLD], speed: [0.25, 0.8] }), 18),
    ],
    sounds: [{ name: "boing", at: 150, volume: 0.7 }, { name: "pop", at: 480, volume: 0.6 }, { name: "boop", at: 760, volume: 0.55 }, { name: "tick", at: 1000, volume: 0.5 }, { name: "tick", at: 1200, volume: 0.4 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 500, body: "hop", face: "laugh", haptic: "light" }, { at: 1500, body: "nod", face: "smile" }, { at: 2800, face: "calm" }] },

  { id: "sticker-megaphone", name: "Megaphone blast", ms: 3200,
    feel: "A red megaphone sticker sails in from the left edge, and bolts, asterisks and paper bits blow across the whole screen ahead of it. For news or a new program.",
    emitters: [
      loose(["megaphone"], [RED], 1, { at: 100, origin: [-0.16, 0.34], spread: [-8, -8], speed: [0.55, 0.55], drag: 1.9, gravity: 0, tilt: [-12, -12], spin: [0, 0], size: [0.34, 0.34], life: [2500, 2500], stagger: 0 }),
      ...depth({ kind: "burst", shapes: ["strip", "glitter", "dot", "tri"], colors: [LIME, PINK, RED, GOLD], at: 450, stagger: 500, origin: [0.2, 0.32], spread: [-30, 24], speed: [0.6, 1.5], drag: 1.3, gravity: 0.14, flip: true, spin: [120, 400], size: [0.022, 0.045], life: [1300, 1800], fadeOut: 450 }, 36),
      loose(["bolt", "asterisk", "asterisk"], [LIME, PINK, WHITE], 3, { at: 450, layer: "back", origin: [0.2, 0.32], spread: [-28, 22], speed: [0.5, 0.9], drag: 1.2, size: [0.07, 0.1], opacity: 0.6, life: [1700, 2100] }),
      loose(["bolt", "asterisk", "bolt"], [LIME, PINK, GOLD], 5, { at: 450, stagger: 600, origin: [0.2, 0.32], spread: [-32, 26], speed: [0.6, 1.2], drag: 1.2, size: [0.11, 0.18], life: [1700, 2100] }),
    ],
    sounds: [{ name: "zip", at: 0, volume: 0.55 }, { name: "boing", at: 250, volume: 0.6 }, { name: "whoosh", at: 450, volume: 0.45 }, { name: "pop", at: 700, volume: 0.6 }, { name: "boop", at: 900, volume: 0.5 }, { name: "tick", at: 1080, volume: 0.45 }],
    pip: [{ at: 0, face: "curious" }, { at: 450, body: "lean", face: "laugh", haptic: "light" }, { at: 1400, body: "nod", face: "proud" }, { at: 2600, face: "calm" }] },

  { id: "sticker-words", name: "Kind words", ms: 3300,
    feel: "Quote marks, pink speech cards and flames with hearts come loose from Pip and float out over the screen at a tilt, with small hearts between them. For a kind note or thanks after a check-in.",
    emitters: [
      loose(["quote", "card"], [WHITE, PINK], 3, { at: 100, layer: "back", size: [0.08, 0.11], gravity: -0.03, opacity: 0.6 }),
      loose(["quote", "card", "flameheart", "card", "quote"], [WHITE, PINK, RED], 6, { at: 100, stagger: 1000, gravity: -0.03, size: [0.13, 0.2], life: [2000, 2200] }),
      ...depth(release(["heart"], [RED, PINK, ROSE], 0, { at: 500, stagger: 1000, size: [0.035, 0.07], life: [1400, 1750] }), 20),
      twinkles(6, 900, 1300, [LIME, PINK, GOLD]),
    ],
    sounds: [{ name: "pop", at: 100, volume: 0.65 }, { name: "boop", at: 420, volume: 0.6 }, { name: "heart-blip", at: 800, volume: 0.65 }, { name: "heart-blip", at: 1100, volume: 0.5 }, { name: "harp", at: 1250, volume: 0.35 }],
    pip: [{ at: 0, face: "curious" }, { at: 440, body: "nod", face: "warm", haptic: "light" }, { at: 1500, body: "sway", face: "smile" }, { at: 2900, face: "calm" }] },

  { id: "sticker-smileys", name: "Smiley drift", ms: 3200,
    feel: "Grinning smiley stickers bob up the whole screen like corks, big near ones and small far ones, each with a boop. For a mood check-in or a light moment.",
    emitters: [
      ...depth(lift({ upright: true, shapes: ["smiley"], colors: [LIME, GOLD, PINK], speed: [0.34, 0.5], gravity: -0.08, sway: 0.035, swayHz: 0.6, size: [0.1, 0.19], life: [2200, 2500], stagger: 700, fadeIn: 150, fadeOut: 400 }), 18),
      ...depth(lift({ shapes: ["glitter", "dot"], colors: [PINK, LIME, GOLD, RED], spin: [60, 200], at: 200, stagger: 800, speed: [0.3, 0.5], size: [0.016, 0.032], life: [1800, 2200] }), 22),
    ],
    sounds: [{ name: "boop", at: 100, volume: 0.6 }, { name: "pop", at: 380, volume: 0.5 }, { name: "boop", at: 650, volume: 0.5 }, { name: "pop", at: 900, volume: 0.45 }, { name: "boing", at: 1150, volume: 0.6 }, { name: "xylo-run", at: 1350, volume: 0.4 }],
    pip: [{ at: 0, body: "sway", face: "curious" }, { at: 700, face: "smile" }, { at: 1150, body: "hop", face: "laugh", haptic: "light" }, { at: 2800, face: "calm" }] },

  { id: "sticker-zap", name: "Lightning zap", ms: 2500,
    feel: "Lightning bolt stickers shoot out from Pip with a zip, fly wide across the screen at a tilt and fade as they go. Fast and loud, for a level up or a quick win.",
    emitters: [
      loose(["bolt"], [LIME, GOLD], 4, { at: 150, layer: "back", stagger: 250, spread: [0, 360], speed: [0.7, 1.3], drag: 2.4, gravity: 0, size: [0.08, 0.12], opacity: 0.6, life: [1400, 1800] }),
      loose(["bolt", "bolt", "asterisk"], [LIME, RED, PINK, WHITE], 7, { at: 150, stagger: 300, spread: [0, 360], speed: [0.9, 1.8], drag: 2.4, gravity: 0, size: [0.13, 0.24], life: [1500, 2000] }),
      ...depth(sparks({ at: 160, shapes: ["glitter", "dot"], colors: [LIME, RED, PINK], speed: [0.4, 1.1], drag: 3.2, gravity: 0, life: [800, 1300] }), 30),
    ],
    sounds: [{ name: "zip", at: 0, volume: 0.6 }, { name: "pop", at: 150, volume: 0.7 }, { name: "boop", at: 340, volume: 0.55 }, { name: "tick", at: 520, volume: 0.5 }, { name: "ding", at: 700, volume: 0.55 }],
    pip: [{ at: 0, body: "settle", face: "curious" }, { at: 150, body: "bighop", face: "laugh", haptic: "success" }, { at: 1150, face: "proud" }, { at: 2100, face: "calm" }] },

  { id: "sticker-gift", name: "Surprise gift", ms: 3500,
    feel: "A coral gift sticker floats out beside Pip and ticks three times, then lets go: hearts, stars, sparkles and paper fly out of it across the screen with a fanfare. For a new program opened or a surprise.",
    emitters: [
      loose(["gift"], [CORAL], 1, { at: 150, spread: [158, 158], speed: [0.5, 0.5], drag: 2.6, gravity: 0, tilt: [-8, -8], spin: [3, 3], size: [0.3, 0.3], life: [1500, 1500], stagger: 0, fadeOut: 220 }),
      ...depth(toss({ at: 1450, colors: [LIME, RED, PINK, GOLD, BLUE], life: [1500, 1950] }), 44),
      loose(["star", "heart", "sparkpair"], [GOLD, PINK, LIME, RED], 3, { at: 1450, layer: "back", size: [0.06, 0.09], speed: [0.4, 0.8], opacity: 0.6, life: [1300, 1650] }),
      loose(["star", "heart", "sparkpair", "heart"], [GOLD, PINK, LIME, RED], 8, { at: 1450, stagger: 250, speed: [0.5, 1.1], drag: 2.0, gravity: 0.1, size: [0.09, 0.16], life: [1400, 1750] }),
    ],
    sounds: [{ name: "boing", at: 150, volume: 0.65 }, { name: "tick", at: 600, volume: 0.45 }, { name: "tick", at: 850, volume: 0.5 }, { name: "tick", at: 1100, volume: 0.55 }, { name: "popper", at: 1430, volume: 0.65 }, { name: "tada", at: 1480, volume: 0.75 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 850, face: "thinking" }, { at: 1450, body: "bighop", face: "laugh", haptic: "success" }, { at: 2400, face: "proud" }, { at: 3100, face: "calm" }] },

  { id: "sticker-snap", name: "Snapshot", ms: 2900,
    feel: "Sparkles flash open at three places on the screen, tick, tick, pop, and Pip strikes a pose; then thumbs-up and sparkle stickers float out from him. For a first call done, a moment to keep.",
    emitters: [
      twinkles(5, 300, 60, [WHITE, GOLD], { area: [0.6, 0.12, 0.95, 0.34], size: [0.08, 0.16], life: [450, 650] }),
      twinkles(5, 700, 60, [LIME, WHITE], { area: [0.05, 0.3, 0.4, 0.55], size: [0.08, 0.16], life: [450, 650] }),
      twinkles(7, 1050, 80, [GOLD, PINK, WHITE], { area: [0.2, 0.05, 0.9, 0.75], size: [0.09, 0.18], life: [500, 750] }),
      loose(["thumb", "sparkpair"], [GOLD, LIME], 3, { at: 1300, layer: "back", size: [0.07, 0.1], gravity: -0.03, opacity: 0.6, life: [1100, 1250], stagger: 250 }),
      loose(["thumb", "sparkpair", "thumb", "sparkpair"], [GOLD, LIME, PINK], 5, { at: 1300, stagger: 400, gravity: -0.03, size: [0.13, 0.22], life: [1000, 1200] }),
      ...depth(sparks({ at: 1320, shapes: ["glitter", "dot"], colors: [LIME, PINK, RED, GOLD], speed: [0.25, 0.8] }), 16),
    ],
    sounds: [{ name: "tick", at: 300, volume: 0.6 }, { name: "tick", at: 700, volume: 0.6 }, { name: "pop", at: 1050, volume: 0.7 }, { name: "boing", at: 1300, volume: 0.6 }, { name: "ding", at: 1550, volume: 0.5 }],
    pip: [{ at: 0, face: "smile" }, { at: 300, body: "pop", face: "proud" }, { at: 1050, body: "bounce", face: "laugh", haptic: "light" }, { at: 1900, face: "smile" }, { at: 2550, face: "calm" }] },

  { id: "sticker-next", name: "Fast forward", ms: 2600,
    feel: "Speed lines and fast-forward arrow stickers rush across the whole screen from left to right, and a pointing hand sails after them, with a whoosh and a zip. For the next step or the next day.",
    emitters: [
      ...depth({ kind: "burst", shapes: ["strip"], colors: [BLUE, TEAL, GOLD, PINK], stagger: 900, origin: [-0.12, 0.42], spread: [-30, 30], speed: [1.0, 1.7], drag: 0.5, tilt: [-4, 4], size: [0.05, 0.1], life: [800, 1100], fadeIn: 60, fadeOut: 300 }, 36),
      loose(["ffwd"], [BLUE, TEAL], 3, { at: 200, layer: "back", origin: [-0.12, 0.42], spread: [-28, 28], speed: [0.7, 1.0], drag: 0.6, gravity: 0, tilt: [-6, 6], spin: [0, 0], size: [0.08, 0.12], opacity: 0.6, life: [1500, 1900], stagger: 500 }),
      loose(["ffwd", "ffwd", "sparkpair"], [BLUE, TEAL, CORAL], 5, { at: 200, origin: [-0.14, 0.42], spread: [-30, 30], speed: [0.8, 1.3], drag: 0.6, gravity: 0, tilt: [-8, 8], spin: [0, 0], size: [0.14, 0.24], life: [1400, 1750], stagger: 600 }),
      loose(["point"], [GOLD], 1, { at: 650, origin: [-0.14, 0.5], spread: [-12, -12], speed: [0.85, 0.85], drag: 0.6, gravity: 0, tilt: [78, 78], spin: [0, 0], size: [0.26, 0.26], life: [1800, 1800], stagger: 0 }),
    ],
    sounds: [{ name: "whoosh", at: 0, volume: 0.55 }, { name: "zip", at: 230, volume: 0.55 }, { name: "boop", at: 450, volume: 0.5 }, { name: "pop", at: 650, volume: 0.6 }, { name: "chime-up", at: 950, volume: 0.55 }],
    pip: [{ at: 0, body: "lean", face: "curious" }, { at: 650, body: "nod", face: "smile", haptic: "light" }, { at: 1300, body: "hop", face: "laugh" }, { at: 2250, face: "calm" }] },
];

// the scene inside Pip's blob for each effect (founder 2026-11-26: "snowy mountains in the background of blob" for snow; first 4 scenes)
const SCENE_OF: Record<string, NonNullable<FxEffect["scene"]>> = {
  snowfall: "snow", "snow-globe": "snow",
  "spark-fountain": "campfire", fireworks: "campfire",
  "confetti-burst": "party", "confetti-cannons": "party", "confetti-rain": "party", streamers: "party", party: "party",
  hearts: "love", "speech-heart": "love",
};
// no extra scene pieces: still stickers hanging beside Pip looked cheap (founder 2026-11-26); a scene is his blob's colour only
for (const e of FX_EFFECTS) { const scene = SCENE_OF[e.id]; if (scene) e.scene = scene; }
