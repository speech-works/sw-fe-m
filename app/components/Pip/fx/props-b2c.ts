/**
 * Acting props for batch 2 part C (100 x 100 boxes; keys prefixed "c2-").
 * Moments: first AI call done (mic drop, the voice that flies, a flag on the summit) and paired with a practice buddy
 * (puzzle pieces, a high five between two glove props, two cups of chai). Same sticker look as ./props-b2b.ts.
 */
import type { FxShape } from "./types";

type Pth = FxShape["paths"][number];
const SL = "#1B1917", WH = "#FFFFFF", PAPER = "#FFF6E0", PAPER2 = "#F1DDB4", LIME = "#DFFF2E", GOLD = "#FFC530", SUN = "#FFD84A", OR = "#FF7A1A", ORD = "#DD560F",
  RED = "#FF2B2B", STEEL = "#D6DEE6", STEEL2 = "#A9B6C3";
const r1 = (n: number) => Math.round(n * 10) / 10;
const move = (d: string, dx: number, dy: number) => d.replace(/([MLHVCSQTA])([^A-Za-z]*)/g, (_m, c: string, args: string) => {
  const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return c + n.map((v, i) => r1(c === "H" ? v + dx : c === "V" ? v + dy : c === "A" ? (i % 7 === 5 ? v + dx : i % 7 === 6 ? v + dy : v) : i % 2 ? v + dy : v + dx)).join(" ");
});
const fl = (d: string, fill: string, round = 0, opacity?: number): Pth => ({ d, fill, ...(round ? { stroke: fill, sw: round } : {}), ...(opacity != null ? { opacity } : {}) });
const ln = (d: string, stroke: string, sw: number, opacity = 1): Pth => ({ d, stroke, sw, opacity });
/** A sticker: main pieces with a dark offset sliver under them, then the details on top. */
const sticker = (mains: Pth[], details: Pth[] = [], dx = 2.5, dy = 3.2): FxShape => ({
  paths: [...mains.map(m => ({ ...m, d: move(m.d, dx, dy), ...(m.fill ? { fill: SL } : {}), ...(m.stroke ? { stroke: SL } : {}), opacity: 0.9 })), ...mains, ...details],
});
const ell = (cx: number, cy: number, rx: number, ry = rx) => `M${r1(cx - rx)} ${r1(cy)}A${rx} ${ry} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${rx} ${ry} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const starN = (cx: number, cy: number, R: number, r: number, n: number, a0 = -90) => "M" + Array.from({ length: n * 2 }, (_, i) => {
  const a = ((a0 + (i * 180) / n) * Math.PI) / 180, q = i % 2 ? r : R; return `${r1(cx + q * Math.cos(a))} ${r1(cy + q * Math.sin(a))}`; }).join("L") + "Z";

// ── faces ──
const happy = (cx: number, cy: number, k: number, ink = SL): Pth[] => [
  ln(`M${r1(cx - 9 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0M${r1(cx + 3 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0`, ink, r1(2.5 * k)),
  ln(`M${r1(cx - 3.5 * k)} ${r1(cy + 5 * k)}q${r1(3.5 * k)} ${r1(4 * k)} ${r1(7 * k)} 0`, ink, r1(2.3 * k)),
  fl(ell(cx - 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8), fl(ell(cx + 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8)];
const eyes = (cx: number, cy: number, k: number, gx = 0, gy = 0, gap = 7): Pth[] => [-1, 1].flatMap(s => [
  fl(ell(cx + s * gap * k, cy, r1(5.2 * k), r1(5.8 * k)), WH), fl(ell(cx + s * gap * k + gx * 1.7 * k, cy + gy * 1.9 * k, r1(2.9 * k), r1(3.3 * k)), SL),
  fl(ell(cx + s * gap * k + gx * 1.7 * k + 1.1 * k, cy + gy * 1.9 * k - 1.3 * k, r1(0.95 * k)), WH)]);
const smile = (cx: number, cy: number, k: number, ink = SL): Pth => ln(`M${r1(cx - 4 * k)} ${cy}q${r1(4 * k)} ${r1(4.6 * k)} ${r1(8 * k)} 0`, ink, r1(2.3 * k));
const cheeks = (cx: number, cy: number, k: number, gap = 12): Pth[] => [-1, 1].map(s => fl(ell(cx + s * gap * k, cy, r1(2.8 * k), r1(2.3 * k)), "#FF8FA3", 0, 0.8));
const awake = (cx: number, cy: number, k: number, gx = 0, gy = 0): Pth[] => [...eyes(cx, cy, k, gx, gy), smile(cx, cy + 8 * k, k), ...cheeks(cx, cy + 7 * k, k)];
/** Wide eyes and a small round mouth: "whoa". */
const whoa = (cx: number, cy: number, k: number): Pth[] => [...eyes(cx, cy, k, 0, 0.5), fl(ell(cx, cy + 10 * k, r1(2.6 * k), r1(3.2 * k)), SL)];
/** Dark glasses and a one-sided grin: the cool face. */
const cool = (cx: number, cy: number, k: number): Pth[] => [
  fl(rrect(cx - 17 * k, cy - 6 * k, 15 * k, 11 * k, 4.5 * k), SL), fl(rrect(cx + 2 * k, cy - 6 * k, 15 * k, 11 * k, 4.5 * k), SL), ln(`M${cx - 3 * k} ${cy - 3 * k}H${cx + 3 * k}`, SL, 2.4 * k),
  ln(`M${r1(cx - 20 * k)} ${r1(cy - 3 * k)}L${r1(cx - 16 * k)} ${r1(cy - 3 * k)}M${r1(cx + 16 * k)} ${r1(cy - 3 * k)}L${r1(cx + 20 * k)} ${r1(cy - 3 * k)}`, SL, 2 * k),
  ln(`M${r1(cx - 13 * k)} ${r1(cy - 1 * k)}l${r1(4 * k)} ${r1(-3 * k)}M${r1(cx + 6 * k)} ${r1(cy - 1 * k)}l${r1(4 * k)} ${r1(-3 * k)}`, WH, 1.5 * k, 0.85),
  ln(`M${r1(cx - 5 * k)} ${r1(cy + 10 * k)}q${r1(6 * k)} ${r1(4.5 * k)} ${r1(12 * k)} ${r1(-2 * k)}`, SL, 2.4 * k)];

// ── first call: a hand mic (round head, orange handle) ──
const mic = (face: Pth[]): FxShape => sticker([fl("M40 50H60L57 91C57 94.5 55 96 52 96H48C45 96 43 94.5 43 91Z", OR, 1), fl(ell(50, 31, 26, 26), STEEL)], [
  fl("M53 58H59.4L57 91C57 94.5 55 96 52 96Z", ORD, 0, 0.7), fl(rrect(38, 53, 24, 7, 3), GOLD), fl(rrect(46, 70, 8, 12, 4), PAPER), fl(ell(50, 73.5, 2), GREEN_ON),
  ln("M27 20C34 9 66 9 73 20M26 42C34 54 66 54 74 42", STEEL2, 1.8), ln("M31 12L26 20M69 12L74 20M40 7V13M60 7V13M50 5.5V12", STEEL2, 1.6),
  ln("M32 19C35 14 39 11 44 10", WH, 2.8, 0.8), ...face]);
const GREEN_ON = "#3DDC64";

// ── first call: the voice (a two-colour ribbon wave) and the paper plane it folds into ──
const WAVE_A = "M4 50C7 43 11 43 14 50S22 64 26 50S34 16 41 50S50 88 57 50S65 20 71 50S79 62 83 50S90 43 96 50";
const WAVE_B = "M4 50C7 57 11 57 14 50S22 36 26 50S34 84 41 50S50 12 57 50S65 80 71 50S79 38 83 50S90 57 96 50";
const wave = (a: string): FxShape => sticker([ln(move(a, 5, 9), "#FF9BD8", 4.5), ln(a, LIME, 8.5)], [ln(move(a, -0.5, -1.8), WH, 1.6, 0.55)], 2, 3);

// ── first call: a mountain with a face, and the flag that plants itself on it ──
const PEAK = "M50 14C54 14 57 17 60 22L92 78C95 84 92 90 85 90H15C8 90 5 84 8 78L40 22C43 17 46 14 50 14Z";
const peak = (face: Pth[]): FxShape => sticker([fl(PEAK, "$c")], [
  fl("M60 22L92 78C95 84 92 90 85 90H66C74 70 70 44 60 22Z", SL, 0, 0.22),
  fl("M50 14C54 14 57 17 60 22L69 38L61 32L55 40L48 32L41 40L32 36L40 22C43 17 46 14 50 14Z", WH),
  fl(ell(24, 82, 1.6), WH, 0, 0.5), fl(ell(31, 76, 1.3), WH, 0, 0.5), fl(ell(76, 82, 1.5), WH, 0, 0.4), ...face]);
const POLE: Pth[] = [ln("M30 95V11", PAPER, 5)];
const flagTop: Pth[] = [fl(ell(30, 9, 5.5), GOLD), ln("M27.5 30V80", PAPER2, 1.6, 0.9)];
const flag = (d: string, oneY: number): FxShape => sticker([...POLE, fl(d, "$c", 2)], [...flagTop, ln(`M52 ${oneY + 5}L60 ${oneY}V${oneY + 21}`, WH, 5.5), ln(`M38 ${oneY - 3}C44 ${oneY - 5} 48 ${oneY - 4} 52 ${oneY - 2}`, WH, 1.8, 0.5)], 2, 2.6);

// ── buddy: two puzzle pieces (the left one has the knob, the right one the gap; put the right one's box 28 units to the right) ──
const PUZ_L = "M22 24H58A6 6 0 0 1 64 30V42C64 44 66 45 68 44A10 10 0 1 1 68 56C66 55 64 56 64 58V70A6 6 0 0 1 58 76H22A6 6 0 0 1 16 70V30A6 6 0 0 1 22 24Z";
const PUZ_R = "M42 24H78A6 6 0 0 1 84 30V70A6 6 0 0 1 78 76H42A6 6 0 0 1 36 70V58C36 56 38 55 40 56A10 10 0 1 0 40 44C38 45 36 44 36 42V30A6 6 0 0 1 42 24Z";
const puzL = (face: Pth[]): FxShape => sticker([fl(PUZ_L, "$c")], [fl("M16 64V70A6 6 0 0 0 22 76H58A6 6 0 0 0 64 70V64Z", SL, 0, 0.14), ln("M23 30H40", WH, 2.6, 0.65),
  fl(ell(24, 68, 1.5), SL, 0, 0.3), fl(ell(30, 71, 1.2), SL, 0, 0.3), ...face]);
const puzR = (face: Pth[]): FxShape => sticker([fl(PUZ_R, "$c")], [fl("M36 64V70A6 6 0 0 0 42 76H78A6 6 0 0 0 84 70V64Z", SL, 0, 0.14), ln("M58 30H76", WH, 2.6, 0.65),
  fl(ell(76, 68, 1.5), SL, 0, 0.3), fl(ell(70, 71, 1.2), SL, 0, 0.3), ...face]);

// ── buddy: a glove hand for the high five (palm to us, fingers spread; `flip` puts the thumb on the right) ──
const glove = (flip: boolean): FxShape => {
  const X = (x: number) => (flip ? 100 - x : x);
  return sticker([ln(`M${X(36)} 50L${X(28)} 23M${X(46)} 46L${X(43)} 13M${X(57)} 46L${X(60)} 14M${X(67)} 50L${X(75)} 25M${X(33)} 68L${X(14)} 54`, "$c", 11.5), fl(rrect(27, 40, 46, 42, 16), "$c")], [
    fl(rrect(31, 79, 38, 15, 5), WH), ln("M31 86.5H69", "$c", 4), fl(ell(50, 62, 11, 9), WH, 0, 0.28),
    ln(`M${X(40)} 47L${X(41)} 53M${X(51.5)} 45V52M${X(62)} 47L${X(61)} 53`, SL, 1.5, 0.3), ln(`M${X(27)} 26L${X(29)} 33M${X(42.5)} 16L${X(43.3)} 24`, WH, 2.2, 0.6)]);
};

// ── buddy: a clay cup of chai with a face ──
const CUP = "M22 30H78C78 58 70 90 60 90H40C30 90 22 58 22 30Z";
const chai = (face: Pth[]): FxShape => sticker([fl(CUP, "$c", 2)], [
  fl("M62 90C70 86 77 58 78 30H68C68 56 64 82 56 90Z", SL, 0, 0.16), fl(ell(50, 30, 29, 7.5), "#7A3E1E"), fl(ell(50, 30.6, 24.5, 5.4), "#E2A565"),
  ln("M35 30C40 28 47 27.5 54 28.5", "#F8DDB5", 1.8), ln("M30 78L35 74L40 78L45 74L50 78L55 74L60 78L65 74L70 78", WH, 1.7, 0.5),
  fl(ell(28, 42, 1.4), WH, 0, 0.5), fl(ell(72, 44, 1.4), WH, 0, 0.4), ...face]);

export const PROPS_B2C: Record<string, FxShape> = {
  // first call done
  "c2-mic-whoa": mic(whoa(50, 28, 1.25)), "c2-mic": mic(awake(50, 28, 1.3)), "c2-mic-cool": mic(cool(50, 29, 1.25)),
  // a comic impact burst (two layers)
  "c2-bam": { paths: [fl(starN(50, 50, 48, 27, 11), "$c", 2), fl(starN(50, 50, 33, 18, 11, -74), SUN, 2), fl(starN(50, 50, 17, 9, 11), WH, 1)] },
  "c2-wave-a": wave(WAVE_A), "c2-wave-b": wave(WAVE_B),
  // a paper plane, nose to the right
  "c2-plane": sticker([fl("M6 26L95 50L6 74L24 50Z", PAPER, 2)], [fl("M24 50H95L6 74Z", PAPER2, 1), fl("M6 26L28 32L24 50Z", LIME, 1), ln("M24 50H93", "#BFA676", 1.6), ln("M34 36L62 43.5", WH, 2, 0.9)], 2, 3),
  "c2-peak": peak(awake(48, 60, 1.35, 0.7, -0.7)), "c2-peak-happy": peak(happy(48, 61, 1.45, WH)),
  "c2-flag-furled": sticker([...POLE, fl(rrect(32, 14, 11, 33, 5), "$c")], [...flagTop, ln("M34 22H42M34 30H42M34 38H42", SL, 1.4, 0.3)], 2, 2.6),
  "c2-flag-a": flag("M32 13C46 6 60 22 86 13V45C60 54 46 38 32 45Z", 19), "c2-flag-b": flag("M32 13C46 20 60 6 86 13V45C60 38 46 52 32 45Z", 19),
  // buddy paired
  "c2-puz-l": puzL(awake(40, 47, 1.25, 0.8, 0)), "c2-puz-l-happy": puzL(happy(40, 49, 1.3)),
  "c2-puz-r": puzR(awake(64, 47, 1.25, -0.8, 0)), "c2-puz-r-happy": puzR(happy(64, 49, 1.3)),
  "c2-glove-l": glove(false), "c2-glove-r": glove(true),
  "c2-chai-l": chai(awake(50, 54, 1.3, 0.8, -0.2)), "c2-chai-r": chai(awake(50, 54, 1.3, -0.8, -0.2)), "c2-chai-happy": chai(happy(50, 56, 1.35, WH)),
};
void RED;
