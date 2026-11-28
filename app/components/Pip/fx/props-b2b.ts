/**
 * Acting props for batch 2 part B (100 x 100 boxes; keys must not collide with library.ts or ./props.ts).
 * Moments: welcome, onboarding done, buddy paired, purchase done, error / offline, waiting, notification permission.
 * Look: the round-3 sticker look (flat bright pieces, dark details, a highlight stroke, small texture dots), most things with a
 * face. Parts of one object share ONE box (same origin and size in the emitter), so they move as one piece.
 */
import type { FxShape } from "./types";

type Pth = FxShape["paths"][number];
const SL = "#1B1917", WH = "#FFFFFF", PAPER = "#FFF6E0", PAPER2 = "#F1DDB4", LIME = "#DFFF2E", GOLD = "#FFC530", SUN = "#FFD84A", OR = "#FF7A1A", ORD = "#DD560F",
  RED = "#FF2B2B", PINK = "#FF9BD8", ICE = "#BFE3FF", BLUE = "#1E7BFF", GREEN = "#3DDC64", LEAF = "#2FA84F", LEAF2 = "#7BD86A", TEAL = "#2BB3A3", GREY = "#8E8576", AMBER = "#E0A21A";
const r1 = (n: number) => Math.round(n * 10) / 10;
const move = (d: string, dx: number, dy: number) => d.replace(/([MLHVCSQTA])([^A-Za-z]*)/g, (_m, c: string, args: string) => {
  const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return c + n.map((v, i) => r1(c === "H" ? v + dx : c === "V" ? v + dy : c === "A" ? (i % 7 === 5 ? v + dx : i % 7 === 6 ? v + dy : v) : i % 2 ? v + dy : v + dx)).join(" ");
});
const fl = (d: string, fill: string, round = 0, opacity?: number): Pth => ({ d, fill, ...(round ? { stroke: fill, sw: round } : {}), ...(opacity != null ? { opacity } : {}) });
const ln = (d: string, stroke: string, sw: number, opacity = 1): Pth => ({ d, stroke, sw, opacity });
/** A sticker: main pieces with a dark offset sliver under them (dx, dy), then the details on top. */
const sticker = (mains: Pth[], details: Pth[] = [], dx = 2.5, dy = 3.2): FxShape => ({
  paths: [...mains.map(m => ({ ...m, d: move(m.d, dx, dy), ...(m.fill ? { fill: SL } : {}), ...(m.stroke ? { stroke: SL } : {}), opacity: 0.9 })), ...mains, ...details],
});
const ell = (cx: number, cy: number, rx: number, ry = rx) => `M${r1(cx - rx)} ${r1(cy)}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const star4 = (cx: number, cy: number, R: number, q = 0.2) => { const k = R * q; return `M${cx} ${cy - R}Q${cx + k} ${cy - k} ${cx + R} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + R}Q${cx - k} ${cy + k} ${cx - R} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - R}Z`; };
const starN = (cx: number, cy: number, R: number, r: number, n: number, a0 = -90) => "M" + Array.from({ length: n * 2 }, (_, i) => {
  const a = ((a0 + (i * 180) / n) * Math.PI) / 180, q = i % 2 ? r : R; return `${r1(cx + q * Math.cos(a))} ${r1(cy + q * Math.sin(a))}`; }).join("L") + "Z";
const heartAt = (cx: number, cy: number, k: number) => {
  const q = (x: number, y: number) => `${r1(cx + (x - 50) * k)} ${r1(cy + (y - 48) * k)}`;
  return `M${q(50, 88)}C${q(24, 68)} ${q(8, 52)} ${q(9, 33)}C${q(10, 18)} ${q(21, 9)} ${q(33, 10)}C${q(42, 11)} ${q(47, 16)} ${q(51, 23)}C${q(55, 15)} ${q(62, 9)} ${q(71, 10)}C${q(84, 11)} ${q(93, 21)} ${q(91, 35)}C${q(89, 53)} ${q(76, 68)} ${q(50, 88)}Z`;
};

// ── faces ──
/** Happy: closed smiling eyes, a smile, pink cheeks. Middle at (cx, cy), k = size. */
const happy = (cx: number, cy: number, k: number, ink = SL): Pth[] => [
  ln(`M${r1(cx - 9 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0M${r1(cx + 3 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0`, ink, r1(2.5 * k)),
  ln(`M${r1(cx - 3.5 * k)} ${r1(cy + 5 * k)}q${r1(3.5 * k)} ${r1(4 * k)} ${r1(7 * k)} 0`, ink, r1(2.3 * k)),
  fl(ell(cx - 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8), fl(ell(cx + 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8)];
/** Two big open eyes looking (gx, gy: -1..1). */
const eyes = (cx: number, cy: number, k: number, gx = 0, gy = 0, gap = 7): Pth[] => [-1, 1].flatMap(s => [
  fl(ell(cx + s * gap * k, cy, r1(5.2 * k), r1(5.8 * k)), WH), fl(ell(cx + s * gap * k + gx * 1.7 * k, cy + gy * 1.9 * k, r1(2.9 * k), r1(3.3 * k)), SL),
  fl(ell(cx + s * gap * k + gx * 1.7 * k + 1.1 * k, cy + gy * 1.9 * k - 1.3 * k, r1(0.95 * k)), WH)]);
const smile = (cx: number, cy: number, k: number, ink = SL): Pth => ln(`M${r1(cx - 4 * k)} ${cy}q${r1(4 * k)} ${r1(4.6 * k)} ${r1(8 * k)} 0`, ink, r1(2.3 * k));
const cheeks = (cx: number, cy: number, k: number, gap = 12): Pth[] => [-1, 1].map(s => fl(ell(cx + s * gap * k, cy, r1(2.8 * k), r1(2.3 * k)), "#FF8FA3", 0, 0.8));
/** Awake: open eyes, a smile, cheeks. */
const awake = (cx: number, cy: number, k: number, gx = 0, gy = 0): Pth[] => [...eyes(cx, cy, k, gx, gy), smile(cx, cy + 8 * k, k), ...cheeks(cx, cy + 7 * k, k)];
/** Asleep: eyes shut (curves down), a small mouth. */
const asleep = (cx: number, cy: number, k: number): Pth[] => [
  ln(`M${r1(cx - 10 * k)} ${cy}q${r1(3 * k)} ${r1(4 * k)} ${r1(6 * k)} 0M${r1(cx + 4 * k)} ${cy}q${r1(3 * k)} ${r1(4 * k)} ${r1(6 * k)} 0`, SL, r1(2.4 * k)),
  fl(ell(cx, cy + 8 * k, r1(1.8 * k), r1(1.5 * k)), SL)];

// ── welcome ──
const LETTER: Record<string, string> = { h: "M32 24V74M68 24V74M32 50H68", e: "M66 25H35V74H66M35 50H58", l: "M37 24V74H66", o: ell(50, 49, 19, 25) };
/** A chunky letter creature: the letter in its colour, eyes on it, two little feet. */
const letter = (ch: string, ex: number, ey: number): FxShape => sticker([ln(LETTER[ch], "$c", 21)], [
  ...eyes(ex, ey, 1.05, 0.2, -0.3, 6.4), smile(ex, ey + 9, 0.9),
  fl(ell(ch === "l" ? 36 : 33, 91, 8, 4.5), PAPER), fl(ell(ch === "l" ? 62 : 67, 91, 8, 4.5), PAPER)]);

// ── buddy: a tin can of a tin-can phone (open end outwards) and a small bird, drawn for either side ──
const can = (flip: boolean): FxShape => {
  const X = (x: number) => (flip ? 100 - x : x);
  return sticker([fl(rrect(X(flip ? 82 : 22), 26, 60, 48, 7), "#CBD5DF")], [
    fl(`M${X(34)} 26H${X(64)}V74H${X(34)}Z`, "$c"), ln(`M${X(28)} 27V73M${X(70)} 27V73M${X(76)} 28V72`, "#9AA8B6", 2),
    fl(ell(X(22), 50, 7, 24), "#5E6B78"), fl(ell(X(23), 50, 4.5, 19), "#2D353D"), ln(`M${X(36)} 31H${X(60)}`, WH, 2.4, 0.55),
    ...eyes(X(49), 46, 1.0, flip ? 0.6 : -0.6, -0.2), smile(X(49), 55, 1), ...cheeks(X(49), 54, 1, 12), fl(ell(X(83), 50, 2.2), PAPER)]);
};
const bird = (flip: boolean, fly: boolean, C1: string, C2: string): FxShape => {
  const X = (x: number) => (flip ? 100 - x : x), M = (pts: number[][]) => "M" + pts.map(([x, y]) => `${X(x)} ${y}`).join("L") + "Z";
  return sticker([fl(ell(X(50), 54, 27, 25), C1), fl(M([[24, 50], [6, 40], [8, 60], [26, 66]]), C1, 3)], [
    fl(ell(X(52), 64, 15, 12), WH, 0, 0.9), fl(M([[76, 46], [94, 52], [76, 58]]), GOLD, 2.5),
    ...(fly ? [fl(M([[36, 50], [22, 18], [48, 26], [58, 48]]), C2, 3), ln(`M${X(30)} 28L${X(40)} 44M${X(40)} 28L${X(47)} 42`, WH, 1.6, 0.6)]
      : [fl(M([[30, 50], [22, 70], [44, 74], [56, 56]]), C2, 4), ln(`M${X(30)} 66L${X(40)} 58`, WH, 1.6, 0.6), ln(`M${X(44)} 78V88M${X(58)} 78V88`, GOLD, 3)]),
    fl(ell(X(64), 44, 6, 6.6), WH), fl(ell(X(65.5), 43.5, 3.3, 3.7), SL), fl(ell(X(66.6), 42, 1.1), WH), fl(ell(X(72), 55, 3, 2.4), "#FF8FA3", 0, 0.85),
    ln(`M${X(46)} 30L${X(42)} 22M${X(50)} 29L${X(50)} 20`, C1, 3)]);
};
/** A round face badge (flat bold colours, a darker rim on one side), mouth shut or wide open. */
const badge = (fill: string, rim: string, lash: boolean, open: boolean): FxShape => ({ paths: [
  fl(ell(50, 50, 46), rim), fl("M50 8C74 8 94 26 94 50C94 74 74 94 50 94C30 94 16 78 16 56C16 30 30 8 50 8Z", fill),
  ...(lash ? [ln("M30 25l-2-5M35 23l-1-5M40 23l1-5M56 23l-1-5M61 23l1-5M66 25l2-5", SL, 2.2)] : []),
  fl(ell(lash ? 37 : 36, 34, lash ? 6.5 : 8.5), SL), fl(ell(lash ? 63 : 62, lash ? 34 : 38, lash ? 6.5 : 8.5), SL),
  fl(ell(lash ? 39 : 39, 31.5, lash ? 1.8 : 2.6), WH), fl(ell(lash ? 65 : 65, lash ? 31.5 : 35.5, lash ? 1.8 : 2.6), WH),
  ...(open
    ? [fl("M28 54H72C73 72 63 84 50 84C37 84 27 72 28 54Z", lash ? "#E0261C" : "#B3122F", 3), fl("M30 54H70V60H30Z", WH), fl(ell(50, 76, 9, 6), "#FF8FA3")]
    : [ln("M32 58C40 68 60 68 68 58", lash ? "#E0261C" : "#B3122F", 6)]),
] });

// ── waiting: a goldfish, facing right or left ──
const fish = (flip: boolean): FxShape => {
  const X = (x: number) => (flip ? 100 - x : x);
  return { paths: [
    fl(`M${X(30)} 50L${X(8)} 30C${X(14)} 44 ${X(14)} 56 ${X(8)} 70Z`, "#FFA24A", 3), fl(`M${X(46)} 34C${X(52)} 20 ${X(64)} 22 ${X(66)} 34Z`, "#FFA24A", 2),
    fl(`M${X(90)} 50C${X(82)} 30 ${X(48)} 26 ${X(26)} 50C${X(48)} 74 ${X(82)} 70 ${X(90)} 50Z`, OR),
    fl(`M${X(52)} 54C${X(46)} 62 ${X(50)} 68 ${X(60)} 62Z`, "#FFA24A", 2), ln(`M${X(46)} 40C${X(54)} 34 ${X(64)} 34 ${X(72)} 37`, "#FFC08A", 3),
    fl(ell(X(74), 45, 5.4), WH), fl(ell(X(75.4), 45, 2.9), SL), fl(ell(X(76.4), 43.8, 1), WH), ln(`M${X(78)} 56q${flip ? -4 : 4} 3 ${flip ? -7 : 7} -1`, SL, 2.2)] };
};

const TODO_ROWS = [47, 62, 77];
const BAG = "M50 12C41 12 36 16 33 24C22 42 11 62 11 78C11 88 19 93 29 93H71C81 93 89 88 89 78C89 62 78 42 67 24C64 16 59 12 50 12Z";
const GLASS = "M31 15H69C69 34 55 42 52.5 50C55 58 69 66 69 85H31C31 66 45 58 47.5 50C45 42 31 34 31 15Z";
const CLOUD = "M27 76C14 76 6 67 6 57C6 47 13 40 22 39C24 26 35 17 48 17C60 17 70 24 73 35C85 34 94 43 94 55C94 67 85 76 74 76Z";
const LAMP_HEAD = "M51.6 58.4A26 26 0 0 1 88.4 21.6Z";
const BELL = "M50 14C68 14 76 30 76 48C76 62 80 68 88 74H12C20 68 24 62 24 48C24 30 32 14 50 14Z";

export const PROPS_B2B: Record<string, FxShape> = {
  // a flat ground patch under a prop (the flat shadow of the founder's sticker references; lighter than the dark canvas)
  "b2-shadow": { paths: [fl(ell(50, 50, 47, 9), "$c")] },
  // a comic flash: an 8-point star with a white core (sparkler head, a bump)
  "b2-flash": { paths: [fl(starN(50, 50, 48, 21, 8), "$c", 2), fl(starN(50, 50, 26, 12, 8, -67), WH, 1)] },
  // a small curl of steam
  "b2-steam": { paths: [ln("M50 84C38 70 62 58 50 44C40 32 58 24 50 12", "$c", 8, 0.85)] },
  // sound arcs on both sides (a bell ringing, a phone buzzing)
  "b2-arcs": { paths: [ln("M19 32C13 43 13 57 19 68M9 25C0 41 0 59 9 75M81 32C87 43 87 57 81 68M91 25C100 41 100 59 91 75", "$c", 3.4)] },

  // ── welcome, first launch ──
  // the welcome mat rolled up (it rolls in, so its face turns with it), then flat: "hi!" in cream on orange, fringes at both ends
  "b2-mat-roll": sticker([fl(ell(50, 50, 40), OR)], [
    ln("M50 50C50 42 62 42 62 52C62 66 40 68 36 52C32 34 54 24 68 36C80 48 76 70 58 78", SUN, 4.5), ln("M24 34C28 26 34 20 42 17", "#FFB066", 4),
    ...eyes(46, 44, 0.8, 0.3, 0), fl(ell(26, 60, 2), ORD), fl(ell(74, 30, 2), ORD), fl(ell(34, 76, 2), ORD)]),
  "b2-mat": sticker([fl("M14 36H86L97 68H3Z", OR, 3)], [
    { d: "M20 41H80L88 63H12Z", stroke: SUN, sw: 2.2 },
    ln("M6 71v5M12 71v5M18 71v5M24 71v5M30 71v5M36 71v5M42 71v5M48 71v5M54 71v5M60 71v5M66 71v5M72 71v5M78 71v5M84 71v5M90 71v5M95 71v5", SUN, 2.2),
    ln("M36 44V60M36 54C39 49 47 50 47 55V60M56 52V60M67 44V54", PAPER, 4.6), fl(ell(56, 45.5, 2.6), PAPER), fl(ell(67, 60, 2.6), PAPER),
    fl(ell(24, 47, 1.3), ORD), fl(ell(78, 57, 1.3), ORD), fl(ell(28, 59, 1.3), ORD), fl(ell(75, 46, 1.3), ORD)]),
  // a desk lamp (asleep: grey bulb, eyes shut), its lit bulb and awake eyes, and its beam of light
  "b2-lamp": sticker([fl(ell(34, 90, 23, 6.5), BLUE), ln("M34 88L25 56L52 30", BLUE, 6.5), fl(LAMP_HEAD, BLUE, 3)], [
    fl(ell(25, 56, 5), "#0B4FB8"), fl(ell(34, 87, 4), "#0B4FB8"), fl(ell(73, 43, 9.5), "#B9C2CE"), fl(LAMP_HEAD, BLUE, 3), ln("M50 30C52 23 57 18 64 16", "#6FB0FF", 3.5),
    ln("M52 36q3 4 6 0M64 31q3 4 6 0", SL, 2.4)]),
  "b2-lamp-on": { paths: [fl(ell(73, 43, 9.5), SUN), fl(ell(70.5, 46, 2.6), WH, 0, 0.9), fl(LAMP_HEAD, BLUE, 3), ln("M50 30C52 23 57 18 64 16", "#6FB0FF", 3.5),
    ...eyes(61, 33, 0.78, 0.6, 0.6, 7.2), ln("M83 50l5 5M74 57l1 7M88 41l7 1", SUN, 2.6)] },
  "b2-beam": { paths: [fl("M6 6L100 58L50 100Z", SUN, 0, 0.2), fl("M6 6L90 62L58 92Z", SUN, 0, 0.2)] },
  // a pot plant: droopy and asleep, then perked up and awake
  "b2-plant-sleepy": sticker([fl("M30 62H70L65 92H35Z", OR, 2), fl(rrect(26, 56, 48, 10, 4), "#FF9A4A")], [
    fl("M48 58C36 46 18 50 8 64C22 70 40 68 48 58Z", LEAF, 2), fl("M52 58C64 46 82 50 92 64C78 70 60 68 52 58Z", LEAF, 2), fl("M50 58C43 48 45 38 53 31C58 42 57 50 50 58Z", LEAF, 2),
    ln("M14 63C24 60 36 60 46 58M86 63C76 60 64 60 54 58", LEAF2, 1.8), ...asleep(50, 76, 0.9)]),
  "b2-plant": sticker([fl("M30 62H70L65 92H35Z", OR, 2), fl(rrect(26, 56, 48, 10, 4), "#FF9A4A")], [
    fl("M48 58C30 54 16 40 13 22C30 26 45 38 48 58Z", LEAF, 2), fl("M52 58C70 54 84 40 87 22C70 26 55 38 52 58Z", LEAF, 2), fl("M50 58C39 40 43 20 50 6C57 20 61 40 50 58Z", "#35B85A", 2),
    ln("M17 26C28 34 40 44 47 56M83 26C72 34 60 44 53 56M50 12V54", LEAF2, 1.8), ...awake(50, 75, 0.85, 0, -0.5), fl(ell(38, 88, 1.2), ORD), fl(ell(62, 86, 1.2), ORD)]),
  // a coffee mug with a face
  "b2-mug": sticker([fl(rrect(22, 36, 46, 50, 9), PAPER), ln("M68 48C86 46 86 72 68 70", PAPER, 6.5)], [
    fl(ell(45, 38, 21, 5.5), "#5A3A22"), ln("M30 37C36 35 42 34.5 48 34.5", "#8A6240", 1.6), fl("M22 76H68V78C68 82 64 86 60 86H30C26 86 22 82 22 78Z", PAPER2), ...happy(45, 58, 1.15)]),
  // H, E, L, O: letter creatures with feet (HELLO uses L twice)
  "b2-let-h": letter("h", 50, 50), "b2-let-e": letter("e", 40, 37), "b2-let-l": letter("l", 40, 52), "b2-let-o": letter("o", 50, 30),

  // ── onboarding done ──
  // a TO DO sticky note with three empty boxes; its three ticks (same box); the "all set" rosette
  "b2-todo": sticker([fl("M19 8H81A5 5 0 0 1 86 13V76L70 92H19A5 5 0 0 1 14 87V13A5 5 0 0 1 19 8Z", SUN)], [
    fl("M70 92V80A4 4 0 0 1 74 76H86Z", AMBER), fl("M14 13A5 5 0 0 1 19 8H81A5 5 0 0 1 86 13V16H14Z", "#FFE98A"),
    ln("M24 22H34M29 22V34M42 22.5a4.6 6 0 1 0 .1 0M56 22V34M56 22C67 22 67 34 56 34M73 22.5a4.6 6 0 1 0 .1 0", "#5A3A22", 3.2),
    ...TODO_ROWS.flatMap(y => [{ d: rrect(22, y - 5.5, 11, 11, 2.5), stroke: "#5A3A22", sw: 2.4 } as Pth, ln(`M40 ${y}H${y === 77 ? 62 : 76}`, OR, 3.6)])]),
  ...Object.fromEntries(TODO_ROWS.map((y, i) => [`b2-tick-${i + 1}`, { paths: [ln(`M23 ${y}L28 ${y + 5}L38 ${y - 9}`, RED, 4.6)] }])),
  "b2-rosette": sticker([fl("M36 60L26 96L42 86L50 98L58 86L74 96L64 60Z", "#1E9E48", 2), fl(starN(50, 40, 38, 32, 12), GREEN, 3)], [
    fl(ell(50, 40, 25), "#22B455"), ln("M37 41L47 51L64 30", WH, 7.5), ln("M26 28C29 21 34 16 41 13", "#A9F5C0", 3)]),
  // a slice of party cake (blue icing, red sponge, cream filling, sprinkles, a red candle for the sparkler)
  "b2-cake": sticker([fl("M8 62L92 50V80L8 92Z", "#E4452A", 2), fl("M8 62L62 36L92 50Z", "#35C4F0", 2)], [
    fl(rrect(45.5, 24, 7, 28, 2), RED), ln("M45.5 32L52.5 29M45.5 40L52.5 37M45.5 48L52.5 45", WH, 1.8), ln("M49 24V19", SL, 1.6),
    ln("M11 73Q30 66 50 67.5T90 61", PAPER, 5.5), ln("M11 84Q30 77 50 78.5T90 72", PAPER, 5.5),
    ln("M8 62L92 50", "#35C4F0", 5), fl("M20 60C20 68 28 68 28 59ZM44 57C44 66 52 66 52 56ZM70 53C70 61 78 61 78 52Z", "#35C4F0", 1),
    fl(ell(66, 39, 6, 5), WH), fl(ell(76, 43.5, 6, 5), WH), fl(ell(85, 48, 5, 4.5), WH),
    ln("M30 56l5-2", PINK, 2.4), ln("M38 50l4 2", SUN, 2.4), ln("M60 46l5 1", LIME, 2.4), ln("M62 52l-4 2", PINK, 2.4), ln("M24 60l4 0", LIME, 2.4), ln("M70 50l3-2", SUN, 2.4),
    ...happy(40, 78, 1.0, "#7A1D10").slice(0, 2)]),
  // a rocket with a face, nose up
  "b2-rocket": sticker([fl("M30 54L13 78V88L32 78Z", OR, 2), fl("M70 54L87 78V88L68 78Z", OR, 2), fl("M50 4C67 17 71 38 71 58V76H29V58C29 38 33 17 50 4Z", PAPER)], [
    fl("M50 4C58 10 64 19 67.5 30H32.5C36 19 42 10 50 4Z", RED), fl("M29 68H71V76H29Z", BLUE), fl("M37 76H63L67 86H33Z", "#5E6B78", 1.5),
    ln("M36 40V62", WH, 3, 0.9), ...awake(50, 47, 1.0, 0, -0.6), fl(ell(60, 62, 1.3), PAPER2), fl(ell(40, 64, 1.3), PAPER2)]),
  // countdown numbers
  "b2-n3": sticker([ln("M34 28C48 14 70 28 52 48C74 54 60 86 32 72", "$c", 15)]),
  "b2-n2": sticker([ln("M32 36C36 14 72 18 64 44C60 56 42 62 32 78H68", "$c", 15)]),
  "b2-n1": sticker([ln("M36 36L52 22V78", "$c", 15)]),

  // ── buddy paired ──
  "b2-badge-a": badge(GOLD, OR, true, false), "b2-badge-a-open": badge(GOLD, OR, true, true),
  "b2-badge-b": badge("#22D3FF", BLUE, false, false), "b2-badge-b-open": badge("#22D3FF", BLUE, false, true),
  "b2-can-l": can(false), "b2-can-r": can(true),
  // the string of the tin-can phone: slack, then pulled tight
  "b2-string-slack": { paths: [ln("M2 44C30 66 70 66 98 44", PAPER, 1)] },
  "b2-string": { paths: [ln("M2 50H98", PAPER, 1)] },
  // a word on its way along the string
  "b2-pulse": { paths: [fl(ell(50, 50, 30, 38), "$c"), fl(ell(42, 40, 8, 10), WH, 0, 0.7)] },
  "b2-bird-r": bird(false, false, OR, ORD), "b2-bird-r-fly": bird(false, true, OR, ORD), "b2-bird-l": bird(true, false, "#22D3FF", BLUE), "b2-bird-l-fly": bird(true, true, "#22D3FF", BLUE),
  "b2-wire": { paths: [ln("M0 50H100", "#A79F92", 0.7)] },

  // ── purchase done ──
  // your program as a book: shut (front cover with a face), then open with a ribbon
  "b2-book": sticker([fl(rrect(20, 10, 62, 80, 7), OR)], [
    fl("M20 17A7 7 0 0 1 27 10H33V90H27A7 7 0 0 1 20 83Z", ORD), ln("M84 17V84", PAPER, 3), fl("M33 62H82V75H33Z", LIME), fl(starN(57.5, 27, 11, 4.8, 5), SUN, 1.5),
    ...awake(57.5, 46, 1.05, 0, -0.4), fl(ell(40, 82, 1.3), ORD), fl(ell(72, 84, 1.3), ORD), ln("M39 16H60", "#FFB066", 3)]),
  "b2-book-open": sticker([fl("M3 26C19 19 38 19 50 28C62 19 81 19 97 26V86C81 80 62 80 50 88C38 80 19 80 3 86Z", OR, 2)], [
    fl("M50 31C40 23 22 23 8 28V80C22 76 40 76 50 83Z", PAPER), fl("M50 31C60 23 78 23 92 28V80C78 76 60 76 50 83Z", PAPER), fl("M50 31C54 28 58 26.5 62 25.5V77C58 78 54 80 50 83Z", PAPER2),
    ln("M15 38C24 35 34 35 43 39M15 48C24 45 34 45 43 49M15 58C24 55 34 55 43 59M15 68C22 66 28 66 34 67", "#B9AE9C", 2.6),
    fl(starN(77, 43, 10, 4.4, 5), GOLD, 1.5), ln("M68 60C74 58 80 58 86 60M68 69C74 67 80 67 86 69", "#B9AE9C", 2.6), fl("M46.5 82V98L50 94L53.5 98V82Z", LIME)]),
  // a door in its frame, shut; then open with light inside; a gold key with a face (teeth to the left, so it walks in from the right)
  "b2-door": sticker([fl(rrect(17, 3, 66, 94, 7), PAPER)], [
    fl(rrect(24, 10, 52, 87, 3), OR), fl(rrect(30, 16, 40, 28, 3), ORD), fl(rrect(30, 50, 40, 40, 3), ORD), ln("M33 20H52", "#FF9A4A", 2.5),
    fl(ell(34, 56, 5), GOLD), fl(ell(34, 67, 2.6), SL), fl("M32.6 67H35.4L36.4 74H31.6Z", SL)]),
  "b2-door-open": sticker([fl(rrect(17, 3, 66, 94, 7), PAPER)], [
    fl(rrect(24, 10, 52, 87, 3), SUN), fl(ell(50, 60, 20, 34), "#FFF3B0"), fl(ell(50, 66, 11, 24), WH, 0, 0.8),
    fl("M76 10L92 16V92L76 97Z", ORD, 1.5), fl(ell(88, 58, 2.4), GOLD), fl(star4(42, 30, 6), WH), fl(star4(60, 44, 4), WH)], 2.5, 3.2),
  "b2-key": sticker([fl(ell(70, 50, 22), GOLD), fl(rrect(8, 44.5, 46, 11, 4), GOLD), fl("M12 54H20V68H12ZM25 54H33V64H25Z", GOLD, 1.5)], [
    ln("M56 36C60 31 66 29 72 30", "#FFE98A", 3.5), ln("M14 48H44", "#FFE98A", 2), ...happy(70, 50, 1.25)]),
  // a golden ticket with a face, and its stub (same box): the stub tears off
  "b2-ticket": sticker([fl("M14 28H66V72H14A4 4 0 0 1 10 68V58A8 8 0 0 0 10 42V32A4 4 0 0 1 14 28Z", GOLD)], [
    { d: "M19 33H61V67H19Z", stroke: "#FFE98A", sw: 2 }, ...happy(40, 49, 1.25), fl(star4(25, 39, 4), WH), fl(star4(55, 61, 4), WH),
    ln("M66 31v3M66 38v3M66 45v3M66 52v3M66 59v3M66 66v3", AMBER, 1.8)]),
  "b2-ticket-stub": sticker([fl("M68 28H86A4 4 0 0 1 90 32V42A8 8 0 0 0 90 58V68A4 4 0 0 1 86 72H68Z", SUN)], [fl(starN(77.5, 44, 7, 3.1, 5), OR, 1), ln("M72 57H83M72 63H80", AMBER, 2.4)]),

  // ── error / offline: your work is safe ──
  // a retro computer, its screen dark; the "!" screen; the calm screen (a happy face and a green check)
  "b2-pc": sticker([fl(rrect(15, 6, 70, 58, 9), PAPER), fl(rrect(9, 72, 82, 20, 5), PAPER), fl("M38 62H62V74H38Z", PAPER2)], [
    fl("M15 52H85V55A9 9 0 0 1 76 64H24A9 9 0 0 1 15 55Z", PAPER2), fl(rrect(23, 13, 54, 38, 5), "#22302A"), ln("M54 82H80", GREY, 3), fl(ell(20, 82, 2.6), GREEN),
    fl("M9 86H91V87A5 5 0 0 1 86 92H14A5 5 0 0 1 9 87Z", PAPER2), fl(ell(80, 58, 1.8), GREY)]),
  "b2-pc-alert": { paths: [fl(rrect(23, 13, 54, 38, 5), GOLD), ln("M52 20L49 35", "#5A3A22", 6.5), fl(ell(47.5, 44, 3.6), "#5A3A22"), ln("M28 18H40", "#FFE98A", 2.4)] },
  "b2-pc-ok": { paths: [fl(rrect(23, 13, 54, 38, 5), "#B8F5C8"), ...happy(43, 30, 1.2, "#14532D"), fl(ell(66, 40, 8.5), GREEN), ln("M61.5 40.5L65 44L71 36.5", WH, 3), ln("M28 18H40", WH, 2.4, 0.8)] },
  // a small cloud, dozing
  "b2-cloud": sticker([fl(CLOUD, "#AFC0D8")], [ln("M30 40C33 33 39 29 46 28", "#DCE6F2", 3.5), ...asleep(50, 54, 1.2), ...cheeks(50, 61, 1.2, 14)]),
  // an umbrella with a face on it
  "b2-umbrella": sticker([fl("M5 54C6 28 26 10 50 10C74 10 94 28 95 54Q84 44 72.5 54Q61 44 50 54Q39 44 27.5 54Q16 44 5 54Z", LIME, 2)], [
    fl("M50 10C38 22 30 38 27.5 54Q39 44 50 54Z", "#B4DC0A"), fl("M50 10C62 22 70 38 72.5 54Q61 44 50 54Z", "#C9EE14"), fl("M50 10C68 14 86 30 95 54Q84 44 72.5 54C70 38 62 22 50 10Z", "#A5CC00"),
    ln("M50 52V84C50 93 37 93 37 84", PAPER, 4.5), fl(ell(50, 8.5, 3.4), PAPER), ln("M18 34C24 24 32 18 42 15", "#F2FF9C", 3), ...happy(50, 34, 1.0)]),
  // your work: a sheet of paper lying flat, with a face
  "b2-sheet": sticker([fl("M22 36H92L80 70H8Z", PAPER, 2)], [ln("M30 44H56M27 52H48M24 60H42", GREY, 3), ...happy(68, 51, 1.0), fl("M92 36L88 47H80Z", PAPER2)]),
  // a ginger cat, sitting like a loaf, eyes shut
  "b2-cat": sticker([fl("M12 78C10 58 28 44 52 44C76 44 90 58 88 78C88 84 84 87 78 87H22C16 87 12 84 12 78Z", "#FF9A3D"), ln("M86 80C97 78 97 62 89 60", "#FF9A3D", 7),
    fl(ell(34, 50, 21, 18), "#FF9A3D"), fl("M15 44L17 22L33 34Z", "#FF9A3D", 3), fl("M53 44L51 22L35 34Z", "#FF9A3D", 3)], [
    fl("M19 38L20 28L28 35Z", "#FFB9C4"), fl("M49 38L48 28L40 35Z", "#FFB9C4"), ln("M62 47L64 56M72 49L73 58M81 55L81 63", ORD, 3.2), ln("M30 33L31 39M37 33L36 39", ORD, 2.6),
    fl(ell(34, 58, 9, 7), PAPER), ...happy(34, 50, 1.05), fl("M32 54.5H36L34 57Z", "#FF6F8E"), ln("M20 55L8 53M20 59L9 61M48 55L60 53M48 59L59 61", PAPER, 1.3),
    fl(ell(28, 86, 7, 4), PAPER), fl(ell(46, 86, 7, 4), PAPER), fl(ell(93, 60, 4), PAPER)]),

  // ── waiting ──
  // a goldfish in a bag of water: the water (behind the fish), the bag's skin and knot (in front), the fish
  "b2-bag-water": { paths: [fl(BAG, WH, 0, 0.1),
    fl("M19.5 50C30 46 40 54 50 50C60 46 70 54 80.5 50C85 60 89 70 89 78C89 88 81 93 71 93H29C19 93 11 88 11 78C11 70 15 60 19.5 50Z", "#2FA8F0"),
    fl("M19.5 50C30 46 40 54 50 50C60 46 70 54 80.5 50L82.5 54.5C71 58 61 50 50 54.5C40 58 30 50 17.5 54.5Z", "#7CCBFA")] },
  "b2-bag": { paths: [{ d: BAG, stroke: WH, sw: 3 }, fl(rrect(42, 3, 16, 11, 3.5), RED), ln("M45 7H52", "#FF8A8A", 2), ln("M27 40C23 50 19 62 18 72", WH, 3.4, 0.8), ln("M19 79V82", WH, 3.4, 0.8), ln("M74 36C77 42 79 47 80 51", WH, 2.4, 0.5)] },
  "b2-fish-r": fish(false), "b2-fish-l": fish(true),
  // a sand timer: the frame and glass; the sand up top (it shrinks into the neck); the heap below (it grows from the floor)
  "b2-hourglass": sticker([fl(rrect(21, 5, 58, 10, 4.5), GOLD), fl(rrect(21, 85, 58, 10, 4.5), GOLD)], [
    ln("M26 15V85M74 15V85", AMBER, 3.4), fl(GLASS, ICE, 0, 0.2), { d: GLASS, stroke: ICE, sw: 2.4 }, ln("M36 21C36.5 28 40 34 45 39", WH, 2.4, 0.8), ln("M27 9H50", "#FFE98A", 2.4)]),
  "b2-sand-top": { paths: [fl("M34.5 24H65.5C63 35 55 42 51.8 49H48.2C45 42 37 35 34.5 24Z", SUN), ln("M40 26H60", "#FFE98A", 2)] },
  "b2-sand-heap": { paths: [fl("M33.5 83.5C34.5 73 42 65 50 62C58 65 65.5 73 66.5 83.5Z", SUN), fl(ell(44, 78, 1.2), AMBER), fl(ell(55, 74, 1.2), AMBER), fl(ell(50, 80, 1.2), AMBER)] },
  "b2-sand-line": { paths: [ln("M50 50V82", SUN, 1.6)] },
  // a snail: body with eyes on stalks (facing right); its shell alone, drawn round its own middle so it can turn like a loading wheel
  "b2-snail": sticker([fl("M8 85C8 77 18 73 32 73H68C75 73 77 64 77 54C77 45 83 40 88 44C95 50 93 71 89 80C87 86 81 89 73 89H16C10 89 8 87 8 85Z", "#FFD27A"),
    ln("M81 46L77 25M88 45L93 27", "#FFD27A", 4.5)], [
    fl(ell(77, 23, 6), WH), fl(ell(93, 25, 6), WH), fl(ell(78.4, 22, 3.1), SL), fl(ell(94.4, 24, 3.1), SL), fl(ell(79.4, 20.8, 1), WH), fl(ell(95.4, 22.8, 1), WH),
    ln("M80 62q4.5 4 9 0", SL, 2.3), fl(ell(79, 68, 2.6, 2.1), "#FF8FA3", 0, 0.8), ln("M14 85H64", "#F2B75A", 2.4), fl(ell(24, 80, 1.2), "#F2B75A"), fl(ell(40, 81, 1.2), "#F2B75A")]),
  "b2-shell": sticker([fl(ell(50, 50, 44), OR)], [
    ln("M50 50C50 41 63 41 63 52C63 67 39 70 35 52C31 32 55 21 71 35C84 48 80 72 60 81", PAPER, 6), ln("M18 40C21 30 28 21 38 16", "#FFB066", 4.5), fl(ell(22, 62, 2), ORD), fl(ell(78, 26, 2), ORD)]),
  // a loading dot
  "b2-dot": { paths: [fl(ell(50, 50, 40), "$c")] },

  // ── notification permission ──
  // a bell with a face, looking up; its clapper (same box: it swings round the bell's middle)
  "b2-clapper": { paths: [fl(ell(50, 86, 8), AMBER)] },
  "b2-bell": sticker([fl(BELL, GOLD), fl(rrect(9, 71, 82, 10, 5), SUN)], [
    { d: ell(50, 10.5, 5), stroke: GOLD, sw: 4 }, ln("M33 31C35 25 39 21 45 19", "#FFE98A", 4), ...awake(50, 46, 1.25, 0, -0.9), fl(ell(34, 64, 1.3), AMBER), fl(ell(66, 62, 1.3), AMBER)]),
  // the same bell asleep (the "Not now" ending): eyes shut, a small round mouth, no shine on its rim
  "b2-bell-asleep": sticker([fl(BELL, GOLD), fl(rrect(9, 71, 82, 10, 5), SUN)], [
    { d: ell(50, 10.5, 5), stroke: GOLD, sw: 4 }, ln("M33 31C35 25 39 21 45 19", "#FFE98A", 4), ...asleep(50, 46, 1.25), fl(ell(34, 64, 1.3), AMBER), fl(ell(66, 62, 1.3), AMBER)]),
  // a letterbox on a post with a face on its door; its flag (drawn round its pivot: down is 90 degrees); a letter that peeks out
  "b2-mailbox": sticker([fl(rrect(44, 62, 12, 37, 2), "#9A6A3A"), fl("M20 68V38C20 20 33 9 50 9C67 9 80 20 80 38V68Z", BLUE, 2)], [
    fl("M28 64V39C28 26 37 17 50 17C63 17 72 26 72 39V64Z", "#5BA6FF"), ln("M33 34C35 27 40 23 46 21", "#B5D6FF", 3), ...awake(50, 40, 1.15, 0, -0.7)]),
  "b2-flag": sticker([ln("M50 50V20", PAPER, 4), fl("M52 18H72V33H52Z", RED, 2)], [fl(ell(50, 50, 4), GREY)], 1.5, 2),
  "b2-letter": sticker([fl(rrect(16, 26, 68, 48, 6), PAPER)], [ln("M17 30L50 54L83 30", PAPER2, 2.6), ...eyes(50, 38, 1.1, 0, -0.6, 8), fl(heartAt(50, 62, 0.2), RED)]),
  // a phone with a face on its screen; the notification that drops onto it (same box)
  "b2-phone": sticker([fl(rrect(26, 5, 48, 90, 11), "#F4502A")], [
    fl(rrect(31.5, 13, 37, 66, 5), PAPER), fl(ell(50, 87, 4.2), PAPER), ln("M30 16C30 12 32 10 36 9.5", "#FF8A6A", 2.4), ...awake(50, 50, 1.05, 0, -0.8)]),
  "b2-banner": sticker([fl(rrect(33.5, 16, 33, 13, 4.5), WH)], [fl(ell(40, 22.5, 3.2), OR), ln("M46.5 20.5H61M46.5 25H56", GREY, 2)], 1, 1.6),
  // a night cap z (for the "Not now" endings)
  "b2-zed": sticker([ln("M28 26H72L28 74H72", "$c", 15)]),
};
