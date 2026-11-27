/**
 * Acting props for batch 2 part A (100 x 100 boxes; keys must not collide with library.ts or ./props.ts; all start "a2-").
 * Look: the round-3 sticker look (flat bold pieces, a dark offset sliver, details on top), happy faces on everyday things,
 * round badge faces with big open mouths, and a flat ground patch under things that stand ("a2-ground").
 * Parts of one object share ONE box (same origin and size in the emitter), so they scale and move as one piece.
 */
import type { FxShape } from "./types";

type Pth = FxShape["paths"][number];
const SL = "#1B1917", WH = "#FFFFFF", PAPER = "#FFF6E0", PAPER2 = "#F1DDB4", LIME = "#DFFF2E", LIME2 = "#A8C800", GOLD = "#FFC530", SUN = "#FFD84A", GOLD2 = "#E0A21A",
  OR = "#FF7A1A", ORD = "#DD560F", RED = "#FF2B2B", RED2 = "#C81E1E", PINK = "#FF9BD8", PINK2 = "#E24BA8", ICE = "#BFE3FF", BLUE = "#1E7BFF", SKY = "#3FA9FF", CYAN = "#3FD0FF",
  GREEN = "#3DDC64", GREEN2 = "#1FA84A", TEAL = "#2BB3A3", TEAL2 = "#1C8377", LILAC = "#C4B5FD", VIO = "#8B5CF6", STEEL = "#DDE6EE", STEEL2 = "#9AA7B5", STEEL3 = "#6E7B8A", CHEEK = "#FF8FA3";
const r1 = (n: number) => Math.round(n * 10) / 10;
const move = (d: string, dx: number, dy: number) => d.replace(/([MLHVCSQTA])([^A-Za-z]*)/g, (_m, c: string, args: string) => {
  const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return c + n.map((v, i) => r1(c === "H" ? v + dx : c === "V" ? v + dy : c === "A" ? (i % 7 === 5 ? v + dx : i % 7 === 6 ? v + dy : v) : i % 2 ? v + dy : v + dx)).join(" ");
});
const fl = (d: string, fill: string, round = 0, opacity?: number): Pth => ({ d, fill, ...(round ? { stroke: fill, sw: round } : {}), ...(opacity != null ? { opacity } : {}) });
const ln = (d: string, stroke: string, sw: number, opacity = 1): Pth => ({ d, stroke, sw, opacity });
/** A sticker: main pieces with a dark offset sliver under them (dx, dy), then the details on top. */
const sticker = (mains: Pth[], details: Pth[] = [], dx = 3, dy = 4): FxShape => ({
  paths: [...mains.map(m => ({ ...m, d: move(m.d, dx, dy), ...(m.fill ? { fill: SL } : {}), ...(m.stroke ? { stroke: SL } : {}), opacity: 0.9 })), ...mains, ...details],
});
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${r1(cx - rx)} ${r1(cy)}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const star5 = (cx: number, cy: number, R: number, r: number) => "M" + Array.from({ length: 10 }, (_, i) => {
  const a = ((-90 + i * 36) * Math.PI) / 180, q = i % 2 ? r : R; return `${r1(cx + q * Math.cos(a))} ${r1(cy + q * Math.sin(a))}`; }).join("L") + "Z";
const heartAt = (cx: number, cy: number, k: number) => {
  const q = (x: number, y: number) => `${r1(cx + (x - 50) * k)} ${r1(cy + (y - 48) * k)}`;
  return `M${q(50, 88)}C${q(24, 68)} ${q(8, 52)} ${q(9, 33)}C${q(10, 18)} ${q(21, 9)} ${q(33, 10)}C${q(42, 11)} ${q(47, 16)} ${q(51, 23)}C${q(55, 15)} ${q(62, 9)} ${q(71, 10)}C${q(84, 11)} ${q(93, 21)} ${q(91, 35)}C${q(89, 53)} ${q(76, 68)} ${q(50, 88)}Z`;
};

// ── faces (middle at cx, cy; k = size) ──
const cheeks = (cx: number, cy: number, k: number): Pth[] => [fl(ell(cx - 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), CHEEK, 0, 0.8), fl(ell(cx + 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), CHEEK, 0, 0.8)];
/** happy: closed smiling eyes, a smile, pink cheeks */
const happy = (cx: number, cy: number, k: number): Pth[] => [
  ln(`M${r1(cx - 9 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0M${r1(cx + 3 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0`, SL, r1(2.5 * k)),
  ln(`M${r1(cx - 3.5 * k)} ${r1(cy + 5 * k)}q${r1(3.5 * k)} ${r1(4 * k)} ${r1(7 * k)} 0`, SL, r1(2.3 * k)), ...cheeks(cx, cy, k)];
/** awake: round dot eyes with a glint, a smile, cheeks */
const awake = (cx: number, cy: number, k: number): Pth[] => [
  fl(ell(cx - 6 * k, cy, r1(2.6 * k), r1(3 * k)), SL), fl(ell(cx + 6 * k, cy, r1(2.6 * k), r1(3 * k)), SL), fl(ell(cx - 5.2 * k, cy - 1 * k, r1(0.9 * k), r1(0.9 * k)), WH), fl(ell(cx + 6.8 * k, cy - 1 * k, r1(0.9 * k), r1(0.9 * k)), WH),
  ln(`M${r1(cx - 3.5 * k)} ${r1(cy + 5.5 * k)}q${r1(3.5 * k)} ${r1(3.6 * k)} ${r1(7 * k)} 0`, SL, r1(2.3 * k)), ...cheeks(cx, cy, k)];
/** asleep: eyes shut (lids down), a small round mouth */
const asleep = (cx: number, cy: number, k: number): Pth[] => [
  ln(`M${r1(cx - 9 * k)} ${cy}q${r1(3 * k)} ${r1(3.6 * k)} ${r1(6 * k)} 0M${r1(cx + 3 * k)} ${cy}q${r1(3 * k)} ${r1(3.6 * k)} ${r1(6 * k)} 0`, SL, r1(2.4 * k)),
  fl(ell(cx, cy + 7 * k, r1(1.8 * k), r1(2.2 * k)), SL), ...cheeks(cx, cy, k)];
/** surprised: big white eyes, raised brows, an "o" mouth */
const oface = (cx: number, cy: number, k: number): Pth[] => [
  fl(ell(cx - 6.5 * k, cy - 1 * k, r1(4.6 * k), r1(5 * k)), WH), fl(ell(cx + 6.5 * k, cy - 1 * k, r1(4.6 * k), r1(5 * k)), WH),
  { d: ell(cx - 6.5 * k, cy - 1 * k, r1(4.6 * k), r1(5 * k)), stroke: SL, sw: r1(1.4 * k) }, { d: ell(cx + 6.5 * k, cy - 1 * k, r1(4.6 * k), r1(5 * k)), stroke: SL, sw: r1(1.4 * k) },
  fl(ell(cx - 6.5 * k, cy - 0.6 * k, r1(2.2 * k), r1(2.5 * k)), SL), fl(ell(cx + 6.5 * k, cy - 0.6 * k, r1(2.2 * k), r1(2.5 * k)), SL),
  ln(`M${r1(cx - 10 * k)} ${r1(cy - 9 * k)}q${r1(3.5 * k)} ${r1(-2.6 * k)} ${r1(7 * k)} ${r1(-0.6 * k)}M${r1(cx + 3 * k)} ${r1(cy - 9.6 * k)}q${r1(3.5 * k)} ${r1(-2 * k)} ${r1(7 * k)} ${r1(0.6 * k)}`, SL, r1(1.8 * k)),
  fl(ell(cx, cy + 9 * k, r1(3.2 * k), r1(3.8 * k)), "#E8261C"), { d: ell(cx, cy + 9 * k, r1(3.2 * k), r1(3.8 * k)), stroke: SL, sw: r1(1.5 * k) }];

// ── round badge faces (flat colour, a darker rim, big eyes, a big mouth) ──
type Mouth = "smile" | "open" | "o" | "soft" | "laugh";
function badge(bg: string, rim: string, mouth: Mouth, brows = false): FxShape {
  const eyes: Pth[] = mouth === "laugh"
    ? [ln("M28 42q7 -9 14 0M58 42q7 -9 14 0", SL, 5)]
    : mouth === "soft"
      ? [fl(ell(37, 44, 5.5, 5.5), SL), fl(ell(63, 44, 5.5, 5.5), SL), fl(ell(38.6, 42.2, 1.8, 1.8), WH), fl(ell(64.6, 42.2, 1.8, 1.8), WH), ln("M28 37Q36 33.5 43 32.5M57 32.5Q64 33.5 72 37", SL, 2.6, 0.9)]
      : [fl(ell(36, 40, 6.5, 7), SL), fl(ell(64, 40, 6.5, 7), SL), fl(ell(38, 37.6, 2.2, 2.2), WH), fl(ell(66, 37.6, 2.2, 2.2), WH), ...(brows ? [ln("M26 27q9 -6 17 -1M57 26q9 -5 17 1", SL, 3.4)] : [])];
  const m: Pth[] = mouth === "smile" ? [ln("M36 60Q50 72 64 60", SL, 5)]
    : mouth === "soft" ? [ln("M41 65Q50 68 59 65", SL, 4.4)]
      : mouth === "o" ? [fl(ell(50, 66, 8, 9.5), "#E8261C"), { d: ell(50, 66, 8, 9.5), stroke: SL, sw: 3 }]
        : [fl("M29 54H71C71 73 61 84 50 84C39 84 29 73 29 54Z", "#E8261C", 2), fl("M30 54H70V61H30Z", WH), fl("M38 76C42 70 58 70 62 76C59 81 55 83.5 50 83.5C45 83.5 41 81 38 76Z", CHEEK), { d: "M29 54H71C71 73 61 84 50 84C39 84 29 73 29 54Z", stroke: SL, sw: 2.6 }];
  return { paths: [fl(ell(52.5, 53.5, 44, 44), SL, 0, 0.9), fl(ell(50, 50, 44, 44), rim), fl(ell(52.5, 53, 40.5, 40.5), bg), ...eyes, ...m,
    ...(mouth === "smile" || mouth === "soft" ? [fl(ell(26, 56, 5, 4), CHEEK, 0, 0.75), fl(ell(76, 56, 5, 4), CHEEK, 0, 0.75)] : [])] };
}
const CHOIR: [string, string][] = [[OR, ORD], [LIME, LIME2], [CYAN, BLUE], [PINK, PINK2], [GOLD, GOLD2]];

// ── a microphone on a little stand; the face changes ──
const mic = (face: Pth[], extra: Pth[] = []): FxShape => sticker([
  fl(rrect(28, 88, 44, 8, 4), STEEL3), ln("M50 76V90", STEEL2, 6), ln("M23 46C23 80 77 80 77 46", STEEL3, 5.5), fl(rrect(27, 5, 46, 62, 23), STEEL, 1)], [
  fl("M27 28C27 15 37 5 50 5C63 5 73 15 73 28Z", STEEL2), ln("M33 14H67M29.5 21H70.5", STEEL, 2.2), ln("M41 7.5V27M50 6V27M59 7.5V27", STEEL, 2.2), fl("M27 27H73V33H27Z", OR),
  ln("M32.5 40V55", WH, 3, 0.8), ...face, ...extra], 2.5, 3.2);

// ── a tin can lying on its side (a tin-can telephone); the open end faces out, the string leaves the closed end ──
function can(flip: boolean): FxShape {
  const X = (x: number) => (flip ? 100 - x : x);
  const box = (x0: number, x1: number, y0: number, y1: number) => `M${X(x0)} ${y0}H${X(x1)}V${y1}H${X(x0)}Z`;
  return sticker([fl(`M${X(22)} 29H${X(82)}C${X(86)} 29 ${X(88)} 32 ${X(88)} 36V64C${X(88)} 68 ${X(86)} 71 ${X(82)} 71H${X(22)}Z`, STEEL)], [
    fl(box(40, 76, 29, 71), OR), ln(`M${X(34)} 30V70M${X(82)} 31V69`, STEEL2, 2.4), fl(ell(X(22), 50, 9, 21), STEEL3), fl(ell(X(22), 50, 5.6, 16), "#3D4753"),
    ln(`M${X(42)} 33H${X(74)}`, WH, 2.4, 0.5), ...happy(X(58), 49, 1.25), fl(ell(X(89), 50, 2.6, 2.6), PAPER)]);
}

const CLOUD_D = "M27 76C14 76 6 67 6 57C6 47 13 40 22 39C24 26 35 17 48 17C60 17 70 24 73 35C85 34 94 43 94 55C94 67 85 76 74 76Z";
const TOAST_D = "M31 15C24 15 20 21 23 26C24 28 27 29 27 32V62H73V32C73 29 76 28 77 26C80 21 76 15 69 15Z";
const STAR_D = star5(50, 53, 40, 21);
const POT: Pth[] = [fl("M30 64H70L65 91H35Z", OR, 2), fl(rrect(25, 56, 50, 10, 3.5), "#FF9A4D")];
const LAMP_BASE: Pth[] = [fl(ell(36, 89, 22, 6.5), BLUE), ln("M36 87L28 54L52 34", BLUE, 6.5)];
const LAMP_SHADE = "M47 12C60 8 80 18 84 32L61 57L33 33Z";
const DOOR_FRAME: Pth[] = [fl(rrect(23, 6, 54, 86, 5), PAPER), fl(rrect(16, 90, 68, 7, 3.5), OR)];

export const PROPS_B2A: Record<string, FxShape> = {
  // a flat ground patch under a standing prop (the flat shadow of the sticker look), colour $c
  "a2-ground": { paths: [fl(ell(50, 50, 46, 9), "$c")] },
  // a fat check in a circle badge, and a bare fat orange check (both centred)
  "a2-ok": sticker([fl(ell(50, 50, 40, 40), GREEN)], [ln("M31 51L45 65L70 36", WH, 11)]),
  "a2-check": { paths: [ln("M19 55L41 77L86 25", SL, 24, 0.9), ln("M16 52L38 74L83 22", "#F76117", 17), ln("M20 51L28 59", "#FFB37A", 4, 0.9)] },
  // short lines flying out of a hit (a bell's ding, a tap), colour $c
  "a2-ding": { paths: [ln("M22 34L8 24M15 52H0M30 19L22 5M78 34L92 24M85 52H100M70 19L78 5", "$c", 5)] },

  // ── practice done ──
  // a yellow TO DO sticky note: header, three written lines, a folded corner
  "a2-todo": sticker([fl("M14 12H86V70L70 88H14Z", SUN, 2)], [
    fl("M14 12H86V30H14Z", GOLD, 2), fl("M86 70L70 88V70Z", GOLD2), ln("M23 16.5H33M28 16.5V27", "#5A2E0C", 3.6), { d: ell(41.5, 21.5, 4, 5.2), stroke: "#5A2E0C", sw: 3.4 },
    ln("M55 16.5V27M55 16.5C63.5 16.5 63.5 27 55 27Z", "#5A2E0C", 3.4), { d: ell(72.5, 21.5, 4, 5.2), stroke: "#5A2E0C", sw: 3.4 },
    ln("M24 43H62M24 55H70M24 67H52", "#B98A14", 4.5, 0.75)]),
  // a desk bell: gold dome with a happy face on an orange base; the push button is its own part (drawn first)
  "a2-bell-knob": { paths: [fl(rrect(46, 16, 8, 18, 2), GOLD2), fl(rrect(39, 9, 22, 10, 5), RED), ln("M44 12.5H52", WH, 2.2, 0.7)] },
  "a2-bell": sticker([fl("M17 76C17 46 31 30 50 30C69 30 83 46 83 76Z", GOLD, 2), fl(rrect(10, 74, 80, 13, 6), OR)], [
    fl(rrect(10, 81, 80, 6, 3), ORD), ln("M27 62C28 49 35 41 44 38", WH, 4.5, 0.75), ...happy(52, 57, 1.5)]),
  // a toaster: the back rim with its slot (drawn first), the toast with a browned check, the front with a happy face
  "a2-toaster-back": { paths: [fl(rrect(19, 28, 62, 16, 6), "#C2330F"), fl(rrect(26, 31, 48, 8, 3.5), "#3A1A10")] },
  "a2-toast": { paths: [fl(TOAST_D, "#C98040", 5), fl(TOAST_D, "#F6D29C"), ln("M38 37L47 46L63 28", "#9A5A1C", 6.5), ln("M31 24C31 21 33 20 36 20", WH, 2.6, 0.7)] },
  "a2-toaster": sticker([fl("M11 46C11 39 16 35 23 35H77C84 35 89 39 89 46V82C89 86 86 89 82 89H18C14 89 11 86 11 82Z", "#FF5A2E", 1)], [
    fl("M11 76H89V82C89 86 86 89 82 89H18C14 89 11 86 11 82Z", "#DD3D17"), fl(rrect(20, 88, 12, 6, 3), SL), fl(rrect(68, 88, 12, 6, 3), SL),
    ln("M19 47C19 43 22 41 26 41", WH, 3.2, 0.7), fl(rrect(88, 50, 8, 7, 3), PAPER), ...happy(50, 59, 1.6), fl(ell(22, 68, 1.5, 1.5), "#DD3D17"), fl(ell(79, 46, 1.5, 1.5), "#DD3D17")]),

  // ── practice ended early ──
  // a book lying open (cover, two pages with lines), the lime ribbon that marks the place, and the book shut on it
  "a2-book-open": sticker([fl("M4 30L50 37L96 30V83L50 91L4 83Z", OR, 3)], [
    fl("M50 31C40 23 22 23 9 28V78C22 73 40 73 50 81Z", PAPER), fl("M50 31C60 23 78 23 91 28V78C78 73 60 73 50 81Z", PAPER), ln("M50 31V81", PAPER2, 2.4),
    ln("M16 38C25 35 34 35 43 38M16 48C25 45 34 45 43 48M16 58C25 55 34 55 43 58M57 38C66 35 75 35 84 38M57 48C66 45 75 45 84 48", "#B9AE9C", 2.6)]),
  "a2-ribbon": { paths: [fl("M46 23H58V65L52 58.5L46 65Z", SL, 0, 0.5), fl("M44 21H56V63L50 56.5L44 63Z", LIME), ln("M47 25V52", WH, 1.8, 0.6)] },
  "a2-book-shut": { paths: [
    fl("M54 80H68V99L61 93L54 99Z", LIME2), fl("M52 80H66V98L59 92L52 98Z", LIME),
    fl(rrect(23, 16, 62, 71, 7), SL, 0, 0.9), fl(rrect(26, 78, 54, 8, 2), PAPER), ln("M30 82H78", PAPER2, 1.6), fl(rrect(20, 12, 62, 70, 7), OR), fl(rrect(20, 12, 12, 70, 5), ORD),
    fl(rrect(40, 21, 32, 7, 3.5), SUN), ...happy(56, 48, 1.7)] },
  // a tea cup on wheels: blue cup, tea inside, a tag on a string, a saucer for a chassis, pink wheels
  "a2-cupcar": sticker([fl("M22 40H80V58C80 71 69 80 51 80C33 80 22 71 22 58Z", SKY, 1), fl(rrect(14, 78, 74, 8, 4), ICE)], [
    ln("M23 47C8 44 8 66 26 64", SKY, 6.5), fl(ell(51, 40, 29, 6), ICE), fl(ell(51, 40.6, 24.5, 4), "#B5651D"), ln("M36 39.6C41 38.4 47 38 53 38.2", "#E09A5A", 1.6),
    ln("M72 40C80 30 84 38 90 30", PAPER, 1.6), fl(rrect(84, 16, 13, 15, 2), PAPER), fl(heartAt(90.5, 23.5, 0.08), "#F76117"),
    ln("M29 49V60", WH, 3.2, 0.7), ...happy(53, 57, 1.45),
    fl(ell(30, 89, 9, 9), PINK), fl(ell(30, 89, 3.6, 3.6), SUN), fl(ell(72, 89, 9, 9), PINK), fl(ell(72, 89, 3.6, 3.6), SUN)]),
  "a2-steam": { paths: [ln("M50 86C38 72 62 62 50 48C40 36 58 28 50 14", PAPER, 8, 0.85)] },
  // a door in its frame on an orange mat: shut (a calm sleeping face), and left open with warm light inside
  "a2-door-shut": sticker(DOOR_FRAME, [fl(rrect(29, 12, 42, 80, 2), TEAL), fl(rrect(34, 17, 32, 26, 3), TEAL2, 0, 0.5), fl(rrect(34, 62, 32, 25, 3), TEAL2, 0, 0.5),
    fl(ell(64, 54, 3.6, 3.6), GOLD), ...asleep(49, 30, 1.2)]),
  "a2-door-ajar": sticker(DOOR_FRAME, [fl(rrect(29, 12, 42, 80, 2), SUN), fl("M44 12H71V92H44Z", "#FFEFA8"), fl("M56 92H71L92 97H66Z", SUN, 0, 0.7),
    fl("M29 12L55 20V97L29 92Z", TEAL), fl("M29 12L55 20V97L29 92Z", SL, 0, 0.12), fl("M33 19L51 24V45L33 42Z", TEAL2, 0, 0.5), fl("M33 62L51 64V89L33 86Z", TEAL2, 0, 0.5),
    fl(ell(49, 57, 3, 3.4), GOLD), ...happy(42, 52, 0.85)]),

  // ── first call done ──
  // a retro phone (red body with a happy face, two cradle prongs) and its handset (its own part, lying on the cradle)
  "a2-phone": sticker([fl("M19 86C14 86 11 82 13 77L24 52C26 47 30 44 36 44H64C70 44 74 47 76 52L87 77C89 82 86 86 81 86Z", RED, 1)], [
    fl("M14 78H86C88 82 85 86 81 86H19C15 86 12 82 14 78Z", RED2), fl(rrect(26, 36, 10, 12, 3), RED2), fl(rrect(64, 36, 10, 12, 3), RED2),
    fl(ell(50, 64, 15, 15), PAPER), ...awake(50, 62, 1.25), ln("M27 56C28 52 30 50 34 49", WH, 2.6, 0.6)]),
  "a2-handset": sticker([fl("M8 29C8 19 21 14 30 19C34 21 36 25 41 26H59C64 25 66 21 70 19C79 14 92 19 92 29C92 37 86 42 79 42C72 42 70 36 63 35H37C30 36 28 42 21 42C14 42 8 37 8 29Z", "#FF4B3A", 1)], [
    ln("M16 25C19 22 24 21 28 23", WH, 2.8, 0.7), ln("M44 30.5H56", RED2, 2.4, 0.7)], 2, 2.6),
  "a2-can-l": can(false),
  "a2-can-r": can(true),
  // the string between the cans: at rest, and two shapes of it shaking
  "a2-string": { paths: [ln("M0 50H100", PAPER, 1.3)] },
  "a2-string-w1": { paths: [ln("M0 50C10 45 20 55 30 50S50 45 60 50S80 55 90 50S97 48 100 50", PAPER, 1.3)] },
  "a2-string-w2": { paths: [ln("M0 50C10 55 20 45 30 50S50 55 60 50S80 45 90 50S97 52 100 50", PAPER, 1.3)] },

  // ── level up ──
  // a bonus block with a happy face (Pip bumps it from below), a gold star with a face, an empty star place
  "a2-block": sticker([fl(rrect(12, 14, 76, 74, 12), GOLD)], [
    fl("M12 70H88V76A12 12 0 0 1 76 88H24A12 12 0 0 1 12 76Z", GOLD2), fl(ell(21, 23, 2.6, 2.6), GOLD2), fl(ell(79, 23, 2.6, 2.6), GOLD2), fl(ell(21, 79, 2.6, 2.6), "#B77F00"), fl(ell(79, 79, 2.6, 2.6), "#B77F00"),
    ln("M20 34C20 27 24 23 31 23", WH, 3.4, 0.75), ...awake(50, 45, 1.9)]),
  "a2-star": sticker([fl(STAR_D, GOLD, 9)], [ln("M35 43C37 37 41 33 46 31", WH, 3.4, 0.75), ...happy(50, 54, 1.25)]),
  "a2-star-slot": { paths: [{ d: STAR_D, fill: "#2A2622", stroke: "#2A2622", sw: 9 }, { d: STAR_D, stroke: "#6B6457", sw: 2.4 }] },
  // a ladder piece (two rails, two rungs; pieces stack) and the hole it climbs out of
  "a2-ladder": { paths: [ln("M17 2V102M89 2V102", SL, 10, 0.9), ln("M14 0V100M86 0V100", OR, 10), ln("M14 25H86M14 75H86", GOLD, 9), ln("M11.5 4V96", "#FFA85C", 2.4, 0.9)] },
  "a2-hole": { paths: [fl(ell(50, 50, 46, 12), VIO), fl(ell(50, 51.5, 36, 8), "#2E1670")] },

  // ── recording problem ──
  "a2-mic": mic(awake(50, 46, 1.35)),
  "a2-mic-o": mic(oface(50, 46, 1.3)),
  "a2-mic-sleep": mic(asleep(50, 46, 1.35)),
  // the mic's nightcap (in the mic's box)
  "a2-nightcap": sticker([fl("M26 18C30 2 58 -6 74 16C80 24 86 30 92 30C84 36 72 32 66 24L62 19Z", LILAC, 1)], [fl(rrect(24, 14, 52, 9, 4.5), WH), fl(ell(91, 31, 6, 6), WH), ln("M38 9C44 5 52 4 58 6", WH, 2, 0.6)], 2, 2.6),
  // a plug and the socket end of a cable, both with faces; their cables are their own long parts
  "a2-plug": sticker([fl(rrect(72, 37, 22, 7, 2), STEEL), fl(rrect(72, 56, 22, 7, 2), STEEL), fl(rrect(26, 27, 50, 46, 14), LIME)], [
    fl(rrect(26, 27, 12, 46, 6), LIME2), ln("M44 33H62", WH, 2.6, 0.6), ...awake(57, 49, 1.3)]),
  "a2-socket": sticker([fl(rrect(24, 24, 52, 52, 14), PINK)], [fl(rrect(64, 24, 12, 52, 6), PINK2), fl(rrect(24, 36, 5, 9, 1.5), SL), fl(rrect(24, 55, 5, 9, 1.5), SL), ln("M38 30H56", WH, 2.6, 0.6), ...awake(46, 49, 1.3)]),
  "a2-cable-l": { paths: [ln("M100 50C82 50 78 62 62 60C42 57 30 40 0 47", LIME2, 3.2)] },
  "a2-cable-r": { paths: [ln("M0 50C18 50 22 38 38 40C58 43 70 60 100 53", PINK2, 3.2)] },

  // ── home greeting ──
  // a desk lamp: off (sleeping), and on (awake, a lit bulb, a cone of warm light)
  "a2-lamp-off": sticker([...LAMP_BASE, fl(LAMP_SHADE, BLUE, 2)], [fl(ell(49, 47, 9, 9), "#6B6457"), fl(LAMP_SHADE, BLUE, 2), fl(ell(28, 54, 4, 4), ICE), ln("M52 17C58 16 66 19 72 24", SKY, 3, 0.9), ...asleep(59, 31, 0.85)]),
  "a2-lamp-on": sticker([...LAMP_BASE, fl(LAMP_SHADE, BLUE, 2)], [fl("M36 38L60 56L84 99H18Z", SUN, 0, 0.3), fl(ell(49, 47, 12, 12), SUN, 0, 0.45), fl(ell(49, 47, 9, 9), "#FFF3B0"), fl(LAMP_SHADE, BLUE, 2),
    fl(ell(28, 54, 4, 4), ICE), ln("M52 17C58 16 66 19 72 24", SKY, 3, 0.9), ...happy(59, 31, 0.85)]),
  // a plant in a pot: drooping and asleep, and perked up
  "a2-plant-droop": sticker([...POT], [fl("M49 58C36 48 20 52 9 66C25 72 40 68 49 58Z", GREEN2), fl("M51 58C64 48 80 52 91 66C75 72 60 68 51 58Z", GREEN), fl("M50 58C43 49 45 39 55 32C60 42 58 51 50 58Z", GREEN),
    ln("M46 59C36 58 24 60 14 65", GREEN, 1.8, 0.8), ...POT, ...asleep(50, 76, 1.05)]),
  "a2-plant-up": sticker([...POT], [fl("M48 59C30 55 17 42 13 24C32 27 45 40 48 59Z", GREEN2), fl("M52 59C70 55 83 42 87 24C68 27 55 40 52 59Z", GREEN), fl("M50 59C39 44 39 24 50 8C61 24 61 44 50 59Z", GREEN),
    ln("M50 56V18M46 55C40 44 30 35 20 29", GREEN2, 1.8, 0.8), ln("M54 55C60 44 70 35 80 29", "#8AF0A5", 1.8, 0.8), ...POT, ...happy(50, 76, 1.05)]),
  // a small round bird facing left: beak shut, and singing
  "a2-bird": sticker([fl("M68 58L94 46L90 70Z", BLUE, 2), fl(ell(47, 54, 27, 25), CYAN)], [ln("M41 78V90M55 78V90", OR, 3.4), fl(ell(44, 63, 16, 13), ICE), fl("M42 50C55 47 66 56 64 70C53 71 44 63 42 50Z", BLUE),
    fl("M24 49L7 54L24 60Z", OR), fl(ell(35, 43, 4.2, 4.8), SL), fl(ell(36.2, 41.4, 1.4, 1.4), WH), fl(ell(27, 62, 3.4, 2.6), CHEEK, 0, 0.8), ln("M46 30C46 24 50 21 54 22", CYAN, 4)]),
  "a2-bird-sing": sticker([fl("M68 58L94 46L90 70Z", BLUE, 2), fl(ell(47, 54, 27, 25), CYAN)], [ln("M41 78V90M55 78V90", OR, 3.4), fl(ell(44, 63, 16, 13), ICE), fl("M42 50C55 47 66 56 64 70C53 71 44 63 42 50Z", BLUE),
    fl("M25 47L6 41L22 54Z", OR), fl("M24 60L8 67L22 54Z", ORD), fl("M24 49L13 54L24 59Z", "#E8261C"), ln("M31 42q4 -5 8 0", SL, 2.6), fl(ell(27, 63, 3.4, 2.6), CHEEK, 0, 0.8), ln("M46 30C46 24 50 21 54 22", CYAN, 4)]),

  // ── mood check-in ──
  "a2-mood-neutral": badge(LIME, LIME2, "smile"),
  "a2-mood-low": badge("#A9CCFF", "#5B8DEF", "soft"),
  "a2-mood-high": badge(OR, ORD, "laugh"),
  // a cloud with a calm face, and a sun with a face that comes out from behind it
  "a2-cloud": sticker([fl(CLOUD_D, WH)], [ln("M28 64C36 70 50 70 58 64", ICE, 4), ln("M30 40C33 33 39 29 46 28", ICE, 3.5), ...awake(49, 52, 1.5)]),
  "a2-sun": { paths: [ln("M50 5V16M50 84V95M5 50H16M84 50H95M18 18L26 26M74 74L82 82M82 18L74 26M26 74L18 82", GOLD, 7), fl(ell(50, 50, 27, 27), SUN), ...happy(50, 50, 1.35)] },
  // this week as seven day squares on a card: four days hold a small mood dot, today has an orange edge, two are still to come
  "a2-week": { paths: [
    fl(rrect(2, 34, 96, 32, 8), "#2B2723"), { d: rrect(2, 34, 96, 32, 8), stroke: "#4A443C", sw: 0.8 },
    ...Array.from({ length: 7 }, (_, i): Pth[] => {
      const x = 6 + 12.9 * i;
      return [fl(rrect(x, 44.75, 10.5, 10.5, 3), i < 4 ? "#3A352F" : "#211E1B"), ...(i === 4 ? [{ d: rrect(x, 44.75, 10.5, 10.5, 3), stroke: OR, sw: 1.1 }] : []),
        ...(i < 4 ? [fl(ell(x + 5.25, 50, 3.3, 3.3), [LIME, "#A9CCFF", GOLD, LIME][i])] : []), fl(rrect(x + 3.25, 39, 4, 1.6, 0.8), i === 4 ? OR : "#6B6457")];
    }).flat()] },
};
CHOIR.forEach(([bg, rim], i) => {
  PROPS_B2A[`a2-ch${i}-shut`] = badge(bg, rim, "smile", i % 2 === 0);
  PROPS_B2A[`a2-ch${i}-open`] = badge(bg, rim, i % 2 ? "o" : "open", i % 2 === 0);
});
