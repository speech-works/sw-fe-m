/**
 * Acting props for Pip's moments: things he holds, sets, reads or reacts to (hands on a sheet, a pencil, an alarm clock,
 * party poppers, a medal, calendar pages, a night sky). Drawn flat with the kit's ink outline, each in a 100 x 100 box.
 * They move with the "track" emitter (keyframes): see ./types.ts. Merged into FX_SHAPES by ./library.ts.
 */
import type { FxShape } from "./types";

const INK = "#141311", SKIN = "#C48650";
type Pth = FxShape["paths"][number];
const ink = (d: string, fill: string, sw = 4): Pth => ({ d, fill, stroke: INK, sw });
const line = (d: string, stroke: string, sw: number): Pth => ({ d, stroke, sw });
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Four fingers curled over an edge (the Art of Disclosure cover's hands). The edge is the box's middle line (y 50). */
function grip(flip: boolean): FxShape {
  const F: [number, number][] = [[-21, 30], [-7, 36], [7, 35], [21, 28]];
  return { paths: F.map(([fx, len]) => {
    const x = 50 + (flip ? -fx : fx) * 1.55 - 11, y = 34;
    return ink(rrect(x, y, 22, len * 1.15, 11), SKIN, 5);
  }) };
}

export const PROP_SHAPES: Record<string, FxShape> = {
  "grip-l": grip(false),
  "grip-r": grip(true),
  // a yellow pencil, tip at the bottom left
  pencil: { paths: [
    ink("M72 8L92 28L36 84L16 64Z", "#FFC530"),
    ink("M72 8L80 0L100 20L92 28Z", "#FF9DB1"),
    ink("M16 64L36 84L6 96L4 94Z", "#F3D2A2"),
    { d: "M9 88L4 94L12 92Z", fill: INK },
    line("M44 36L64 56", "#E0A21A", 4),
  ] },
  // a fat green check, outlined
  check: { paths: [
    line("M18 54L40 76L84 26", INK, 24),
    line("M18 54L40 76L84 26", "#58CC02", 14),
  ] },
  // a party popper: a striped cone pointing up, its mouth at the top
  popper: { paths: [
    ink("M50 96L24 24C34 16 66 16 76 24Z", "#FF7A1A"),
    line("M32 46L68 40M38 66L62 62", "#FFD84A", 7),
    ink("M24 24C34 16 66 16 76 24C66 32 34 32 24 24Z", "#FFD84A"),
  ] },
  // a medal on a ribbon: red and blue straps, a gold disc with a star
  medal: { paths: [
    ink("M30 0H46L58 42H44Z", "#FF2B2B"),
    ink("M70 0H54L42 42H56Z", "#1E7BFF"),
    ink(circ(50, 66, 26), "#FFC530", 5),
    ink(circ(50, 66, 18), "#FFD84A", 3),
    { d: "M50 53L53.5 62H63L55.5 67.5L58.5 77L50 71L41.5 77L44.5 67.5L37 62H46.5Z", fill: "#E0A21A" },
  ] },
  // a red twin-bell alarm clock
  alarm: { paths: [
    line("M30 88L22 98M70 88L78 98", INK, 7),
    ink("M14 26C14 12 34 8 40 18Z", "#FFC530"),
    ink("M86 26C86 12 66 8 60 18Z", "#FFC530"),
    line("M50 14V22", INK, 6),
    ink(circ(50, 58, 34), "#FF2B2B", 5),
    ink(circ(50, 58, 25), "#FFF9E9", 3),
    line("M50 58V42M50 58L61 64", INK, 5),
    { d: circ(50, 58, 3.5), fill: INK },
  ] },
  // calendar pages: "1" (today) and "2" (tomorrow)
  "cal-1": { paths: [
    ink(rrect(14, 16, 72, 74, 8), "#FFF9E9"),
    ink("M14 24A8 8 0 0 1 22 16H78A8 8 0 0 1 86 24V36H14Z", "#FF2B2B"),
    line("M34 10V24M66 10V24", INK, 6),
    line("M42 56L52 49V80", INK, 8),
  ] },
  "cal-2": { paths: [
    ink(rrect(14, 16, 72, 74, 8), "#FFF9E9"),
    ink("M14 24A8 8 0 0 1 22 16H78A8 8 0 0 1 86 24V36H14Z", "#58CC02"),
    line("M34 10V24M66 10V24", INK, 6),
    line("M38 56C38 44 62 44 62 56C62 66 40 70 38 80H63", INK, 8),
  ] },
  // flat fills for washing over the screen (the night sky, a flash of heat): $c, sized to cover what they should
  flood: { paths: [{ d: "M0 0H100V100H0Z", fill: "$c" }] },
  // a speed streak (fast-forward), thick at the front, thin at the tail
  speed: { paths: [{ d: "M4 50Q50 46 96 47A3 3 0 0 1 96 53Q50 54 4 50Z", fill: "$c" }] },
  // a sunburst behind Pip: 12 soft wedges
  sunburst: { paths: [{ d: Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180, b = ((i * 30 + 13) * Math.PI) / 180, p = (t: number) => `${(50 + 50 * Math.cos(t)).toFixed(1)} ${(50 + 50 * Math.sin(t)).toFixed(1)}`;
    return `M50 50L${p(a)}L${p(b)}Z`; }).join(""), fill: "$c" }] },
  // the fast-forward sign, outlined
  "ffwd-ink": { paths: [ink("M8 22L48 50L8 78ZM50 22L90 50L50 78Z", "$c", 6)] },
  // a smooth grey pebble (skipping stone)
  stone: { paths: [ink("M14 56C14 40 34 30 54 32C74 34 88 44 86 58C84 70 66 76 48 74C28 72 14 68 14 56Z", "#9AA3AD"), { d: "M30 48C38 42 52 40 62 42", stroke: "#C9D0D6", sw: 5 }] },
  // a ripple: an open ring (splashes where the stone touches)
  ringline: { paths: [{ d: "M8 50a42 18 0 1 0 84 0a42 18 0 1 0 -84 0Z", stroke: "$c", sw: 5 }] },
  // a paper plane flying right
  plane: { paths: [ink("M6 46L94 20L56 86L44 60Z", "#FFF9E9"), ink("M44 60L94 20L36 72Z", "#DDE6EE"), line("M44 60L56 86", INK, 3)] },
  // an orange bouncy ball with a white stripe
  ball: { paths: [ink(circ(50, 50, 40), "#FF7A1A"), { d: "M14 40C34 52 66 52 86 40", stroke: "#FFF9E9", sw: 7 }] },
  // a folded note
  "paper-note": { paths: [ink("M18 14H70L84 28V86H18Z", "#FFF9E9"), ink("M70 14V28H84Z", "#E6DCCB"), line("M30 42H70M30 56H70M30 70H56", "#B9AE9C", 5)] },
  // a soft round glow (aurora bands, haze): one colour, soft by low opacity in the emitter
  glow: { paths: [{ d: circ(50, 50, 48), fill: "$c", opacity: 0.35 }, { d: circ(50, 50, 32), fill: "$c", opacity: 0.45 }, { d: circ(50, 50, 18), fill: "$c", opacity: 0.6 }] },
  // an aurora ribbon: a long wavy band of light, soft edge and a brighter core
  ribbon: { paths: [
    { d: "M0 44C18 28 34 58 52 42C68 28 84 46 100 34V58C84 70 68 52 52 66C34 82 18 52 0 68Z", fill: "$c", opacity: 0.32 },
    { d: "M0 52C18 38 34 64 52 50C68 38 84 52 100 44V52C84 60 68 46 52 58C34 72 18 46 0 60Z", fill: "$c", opacity: 0.55 },
    { d: "M0 55C18 43 34 66 52 53C68 42 84 55 100 47", stroke: "#FFF9E9", sw: 1.2, opacity: 0.5 },
  ] },
  // a cartoon frog, sitting, facing right
  frog: { paths: [
    ink("M14 78C10 58 26 40 50 40C74 40 90 56 88 76C86 88 70 92 50 92C30 92 16 90 14 78Z", "#58CC02"),
    ink("M20 84C12 84 8 92 16 94H34Z", "#46A302", 3), ink("M80 84C88 84 92 92 84 94H66Z", "#46A302", 3),
    ink(circ(34, 40, 13), "#58CC02"), ink(circ(66, 40, 13), "#58CC02"),
    { d: circ(34, 40, 8), fill: "#FFF9E9" }, { d: circ(66, 40, 8), fill: "#FFF9E9" },
    { d: circ(37, 41, 4.5), fill: INK }, { d: circ(69, 41, 4.5), fill: INK },
    line("M34 64C42 72 58 72 66 64", INK, 4),
    { d: circ(28, 66, 5), fill: "#FF9DB1", opacity: 0.6 }, { d: circ(72, 66, 5), fill: "#FF9DB1", opacity: 0.6 },
  ] },
  // a small practice card: orange top band and text lines
  "practice-card": { paths: [
    ink(rrect(10, 22, 80, 56, 8), "#2A2723"),
    { d: "M14 30A4 4 0 0 1 18 26H82A4 4 0 0 1 86 30V38H14Z", fill: "#FF9040" },
    line("M20 50H72M20 60H64M20 70H50", "#8E877C", 4),
  ] },
  // a journal, open (two pages) and closed (cover with a band)
  "book-open": { paths: [
    ink("M50 28C38 20 20 20 6 26V82C20 76 38 76 50 84Z", "#FFF9E9"),
    ink("M50 28C62 20 80 20 94 26V82C80 76 62 76 50 84Z", "#FFF9E9"),
    line("M14 40C24 37 34 37 42 40M14 50C24 47 34 47 42 50M58 40C66 37 76 37 86 40", "#B9AE9C", 3),
  ] },
  "book-closed": { paths: [
    ink(rrect(20, 14, 62, 76, 7), "#FF7A1A"),
    ink(rrect(20, 14, 12, 76, 5), "#E0601A", 3),
    line("M70 14V90", "#FFD84A", 6),
  ] },
  // a rubber stamp: wooden knob and handle over a red base
  stamp: { paths: [
    ink(circ(50, 18, 13), "#C98A4B"),
    ink("M42 28H58L60 54H40Z", "#C98A4B"),
    ink(rrect(18, 54, 64, 16, 5), "#5A3A22"),
    ink(rrect(22, 70, 56, 10, 3), "#FF2B2B"),
  ] },
  // the stamp's mark: a green seal with a check
  seal: { paths: [
    { d: circ(50, 50, 44), fill: "none", stroke: "#58CC02", sw: 7 },
    { d: circ(50, 50, 34), fill: "#58CC02", opacity: 0.18 },
    line("M30 52L44 66L72 36", "#58CC02", 10),
  ] },
  // a filled green check badge
  "check-badge": { paths: [ink(circ(50, 50, 42), "#58CC02", 5), line("M28 52L44 67L73 36", "#FFF9E9", 11)] },
  // a small droplet
  drop: { paths: [{ d: "M50 10C60 34 74 48 74 64A24 24 0 0 1 26 64C26 48 40 34 50 10Z", fill: "$c" }] },
  // an ember: a small glowing teardrop
  ember: { paths: [{ d: "M50 8C62 34 76 48 76 64A26 26 0 0 1 24 64C24 48 38 34 50 8Z", fill: "$c" }] },
};

// ═════════════ Round 3 props (2026-11-28): the library's sticker look (flat bold pieces, a dark offset sliver, details on top) ═════════════
// Bigger and richer, for the step-skipped and reflection-saved moments. Parts of one object share ONE box (same origin and
// size in the emitter), so they scale and move as one piece.
const SL = "#1B1917", WH = "#FFFFFF", PAPER = "#FFF6E0", PAPER2 = "#F1DDB4", LIME3 = "#DFFF2E", GOLD3 = "#FFC530", SUN3 = "#FFD84A", OR3 = "#FF7A1A", ORD = "#DD560F",
  RED3 = "#FF2B2B", PINK3 = "#FF9BD8", ICE3 = "#BFE3FF", BLUE3 = "#1E7BFF", GREEN3 = "#3DDC64";
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
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${r1(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const heartAt = (cx: number, cy: number, k: number) => {   // a heart about 18k wide, its middle at (cx, cy)
  const q = (x: number, y: number) => `${r1(cx + (x - 50) * k)} ${r1(cy + (y - 48) * k)}`;
  return `M${q(50, 88)}C${q(24, 68)} ${q(8, 52)} ${q(9, 33)}C${q(10, 18)} ${q(21, 9)} ${q(33, 10)}C${q(42, 11)} ${q(47, 16)} ${q(51, 23)}C${q(55, 15)} ${q(62, 9)} ${q(71, 10)}C${q(84, 11)} ${q(93, 21)} ${q(91, 35)}C${q(89, 53)} ${q(76, 68)} ${q(50, 88)}Z`;
};
const star4 = (cx: number, cy: number, R: number) => { const q = R * 0.2; return `M${cx} ${cy - R}Q${cx + q} ${cy - q} ${cx + R} ${cy}Q${cx + q} ${cy + q} ${cx} ${cy + R}Q${cx - q} ${cy + q} ${cx - R} ${cy}Q${cx - q} ${cy - q} ${cx} ${cy - R}Z`; };
const CARD_D = "M19 18H81A9 9 0 0 1 90 27V73A9 9 0 0 1 81 82H19A9 9 0 0 1 10 73V27A9 9 0 0 1 19 18Z";
const NOTE_D = "M28 8H64L80 24V86A6 6 0 0 1 74 92H28A6 6 0 0 1 22 86V14A6 6 0 0 1 28 8Z";
const JAR_D = "M30 28C22 32 18 39 18 48V82C18 89 23 94 30 94H70C77 94 82 89 82 82V48C82 39 78 32 70 28Z";
const BOX_D = "M16 46H84V86A4 4 0 0 1 80 90H20A4 4 0 0 1 16 86Z";
const KRAFT = "#E9B877", KRAFT2 = "#C98F4E", KRAFT3 = "#F6D29C", KRAFT_IN = "#6B4420";
/** A small happy face (closed smiling eyes, a smile, pink cheeks), its middle at (cx, cy), k = size. */
const face = (cx: number, cy: number, k: number): Pth[] => [
  ln(`M${r1(cx - 9 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0M${r1(cx + 3 * k)} ${cy}q${r1(3 * k)} ${r1(-4.5 * k)} ${r1(6 * k)} 0`, SL, r1(2.5 * k)),
  ln(`M${r1(cx - 3.5 * k)} ${r1(cy + 5 * k)}q${r1(3.5 * k)} ${r1(4 * k)} ${r1(7 * k)} 0`, SL, r1(2.3 * k)),
  fl(ell(cx - 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8), fl(ell(cx + 11 * k, cy + 5 * k, r1(2.6 * k), r1(2.2 * k)), "#FF8FA3", 0, 0.8)];
const ENV_FRONT = "M10 36L50 63L90 36V78C90 82 87 85 83 85H17C13 85 10 82 10 78Z";

Object.assign(PROP_SHAPES, {
  // ── step skipped ──
  // a flat skipping stone seen from the side: pale top, darker underside, a highlight and speckles
  "p3-stone": sticker([fl("M8 51C8 39 27 31 51 31C76 31 93 40 92 51C91 63 73 70 49 70C24 70 8 63 8 51Z", "#B4BFCC")], [
    fl("M9 55C16 64 31 70 49 70C73 70 90 63 92 52C87 60 70 64 50 64C31 64 16 61 9 55Z", "#7C8898"),
    ln("M23 43C32 38 45 36 58 37", "#EEF3F8", 5), fl(ell(33, 55, 2.4, 2), "#7C8898"), fl(ell(20, 52, 2, 1.6), "#7C8898"), ...face(62, 46, 0.95)]),
  // a pond seen at an angle: a long blue oval with a deep rim, a lighter middle and glints (drawn wide: size ~0.9 of the screen)
  "p3-pond": { paths: [
    fl(ell(50, 51.6, 48, 9), "#0B3F9E"), fl(ell(50, 50, 48, 9), BLUE3), fl(ell(50, 49.3, 42, 6.8), "#3F97FF"),
    ln("M18 47.5C25 45.6 33 45 41 45", ICE3, 1.3, 0.9), ln("M60 54.5H78", ICE3, 1.1, 0.7), ln("M27 53.5H37", ICE3, 1.1, 0.6), ln("M66 46H72", WH, 1.1, 0.7)] },
  // a crown splash standing on the water: its foot is the box's middle line, so it grows up from the water
  "p3-splash": { paths: [
    fl("M24 50C23 40 17 30 9 23C20 26 28 33 33 41C35 29 35 17 32 7C41 15 46 27 48 39C51 25 57 13 66 5C64 17 62 29 63 40C69 31 79 25 91 22C83 30 78 40 77 50Z", ICE3, 2),
    fl("M35 50C37 43 43 40 50 40C57 40 62 43 64 50Z", WH), fl(ell(13, 12, 4.5, 5), ICE3), fl(ell(83, 9, 3.6, 4), ICE3), fl(ell(72, 14, 2.4, 2.8), WH)] },
  // a ripple on the pond: a flat open ring
  "p3-ripple": { paths: [{ d: ell(50, 50, 44, 13), stroke: "$c", sw: 4 }] },
  // the practice as a card: cream paper, orange top band, text lines and a play button
  "p3-card": sticker([fl(CARD_D, PAPER)], [
    fl("M10 27A9 9 0 0 1 19 18H81A9 9 0 0 1 90 27V40H10Z", OR3), ln("M20 29H46", PAPER, 4.5),
    ...face(50, 57, 1.5), ln("M20 75H38", "#C9BEA9", 4), ln("M62 75H80", "#C9BEA9", 4)]),
  // a sneaker car facing right (skip = on your feet): lime upper, white sole and toe, laces, an orange flash, pink wheels
  "p3-sneaker": sticker([
    fl("M8 68V38C8 34 11 32 15 32H50C51 42 57 49 68 52C82 55 93 60 94 70V72H8Z", LIME3, 2),
    fl("M6 70H94C97 70 97 78 93 78H7C3 78 3 70 6 70Z", WH, 1)], [
    fl("M76 55C86 57 93 62 94 70H71C71 64 73 59 76 55Z", WH), ln("M52 41L61 37M57 47L66 43M64 52L72 48", WH, 3.4),
    ln("M18 62C30 60 38 52 40 40", OR3, 6), ln("M12 66H16M24 67H30", SL, 1.6, 0.25), fl(ell(14, 44, 1.4, 1.4), SL, 0, 0.3), fl(ell(20, 50, 1.4, 1.4), SL, 0, 0.3), fl(ell(60, 60, 1.4, 1.4), SL, 0, 0.3),
    fl(ell(27, 82, 11, 11), PINK3), fl(ell(27, 82, 4.5, 4.5), BLUE3), fl(ell(75, 82, 11, 11), PINK3), fl(ell(75, 82, 4.5, 4.5), BLUE3),
    ln("M20 78.5C23 75.5 29 75 33 77", WH, 1.6, 0.7), ln("M68 78.5C71 75.5 77 75 81 77", WH, 1.6, 0.7)]),
  // a puff of dust behind the car
  "p3-puff": { paths: [fl("M27 76C14 76 6 67 6 57C6 47 13 40 22 39C24 26 35 17 48 17C60 17 70 24 73 35C85 34 94 43 94 55C94 67 85 76 74 76Z", "#FFF9E9"), ln("M28 62C35 67 47 67 54 62", "#E2D8C4", 4), ln("M30 40C33 33 39 29 46 28", WH, 3.5)] },

  // a balloon (top half of the box) with its string, and the practice card it carries (bottom half): two parts, one box
  "p3-loon": sticker([fl("M50 2C64 1 73 12 72 25C71 37 61 46 50 46C39 46 28 37 28 24C28 12 37 3 50 2Z", "$c")], [
    fl("M50 44.5L54.5 52H45.5Z", "$c", 1.5), ln("M38 21C38 15 41 11 46 9", WH, 4.5, 0.8), ln("M50 52C46 57 54 61 50 67", "#EFE7D6", 1.6)], 2, 2.6),
  "p3-loon-card": sticker([fl("M36 66H64A4 4 0 0 1 68 70V90A4 4 0 0 1 64 94H36A4 4 0 0 1 32 90V70A4 4 0 0 1 36 66Z", PAPER)], [
    fl("M32 70A4 4 0 0 1 36 66H64A4 4 0 0 1 68 70V75H32Z", OR3), ...face(50, 82, 0.7)], 2, 2.6),

  // ── reflection saved ──
  // your note: a cream page with a folded corner, four written lines and a small orange heart
  "p3-note": sticker([fl(NOTE_D, PAPER)], [
    fl("M64 8V24H80Z", PAPER2), ln("M32 30H58M32 41H70", "#8E8576", 4.5), ...face(50, 58, 1.35), ln("M32 80H50", "#8E8576", 4.5), fl(heartAt(66, 80, 0.2), "#F76117")]),
  // the note peeking: big round eyes near its top edge
  "p3-note-peek": sticker([fl(NOTE_D, PAPER)], [
    fl("M64 8V24H80Z", PAPER2), fl(ell(39, 31, 9.5, 10), WH), fl(ell(61, 31, 9.5, 10), WH), { d: ell(39, 31, 9.5, 10), stroke: SL, sw: 2.2 }, { d: ell(61, 31, 9.5, 10), stroke: SL, sw: 2.2 },
    fl(ell(41, 30, 4.6, 5.2), SL), fl(ell(63, 30, 4.6, 5.2), SL), fl(ell(42.5, 28, 1.5, 1.5), WH), fl(ell(64.5, 28, 1.5, 1.5), WH),
    ln("M32 54H70M32 66H70M32 78H52", "#8E8576", 4.5)]),
  // a cardboard box. Inside and back flap (drawn first), front with a label (drawn over what drops in), the two top flaps
  // (each in its own box twice the size, hinge at the box's centre, so it folds shut), the tape, the green check badge.
  "p3-box-in": { paths: [fl("M22 38L26 24H74L78 38Z", KRAFT2, 2), fl("M16 47L22 37H78L84 47Z", KRAFT_IN), fl("M24 47L28 40H72L76 47Z", "#4A2C12")] },
  "p3-box-front": sticker([fl(BOX_D, KRAFT)], [
    fl("M16 46H84V51H16Z", KRAFT3), fl("M16 82H84V86A4 4 0 0 1 80 90H20A4 4 0 0 1 16 86Z", KRAFT2),
    fl(rrect(22, 60, 24, 17, 2.5), PAPER), ln("M26 65H38M26 70H42", "#8E8576", 2), fl(heartAt(41, 65, 0.07), "#F76117"),
    fl(ell(58, 60, 1.2, 1.2), KRAFT2), fl(ell(66, 72, 1.2, 1.2), KRAFT2), fl(ell(76, 62, 1.2, 1.2), KRAFT2), fl(ell(52, 76, 1.2, 1.2), KRAFT2), ln("M70 56L74 54M72 78H78", KRAFT2, 1.4)]),
  "p3-flap-l": sticker([fl("M50 50H67.4V44.6H53Z", KRAFT3, 1)], [ln("M54 48.2H65", KRAFT2, 0.8, 0.8)], 0.5, 0.7),
  "p3-flap-r": sticker([fl("M50 50H32.6V44.6H47Z", KRAFT3, 1)], [ln("M46 48.2H35", KRAFT2, 0.8, 0.8)], -0.5, 0.7),
  "p3-box-tape": { paths: [fl("M43.5 35H56.5V62L53.2 59.5L50 62L46.8 59.5L43.5 62Z", LIME3), ln("M46 38V56", WH, 1.6, 0.6)] },
  "p3-badge": sticker([fl(ell(72, 74, 14, 14), GREEN3)], [ln("M65 74.5L70.2 79.5L79 69.5", WH, 4.2)], 1.5, 2),

  // a glass jar of kept notes. Body with the folded notes already in it; shine and rim (drawn over what drops in);
  // lid in its closed place; the new heart at rest (swapped in once it has landed). All in the jar's box.
  "p3-jar": { paths: [
    fl(move(JAR_D, 2.5, 3.2), SL, 0, 0.9), fl("M32 20H68V30H32Z", "#3E5F7E"), fl(JAR_D, "#2F4D69"), fl("M18 62H82V82C82 89 77 94 70 94H30C23 94 18 89 18 82Z", "#28435C"),
    fl(star4(34, 82, 9), GOLD3), fl(heartAt(66, 82, 0.2), PINK3), fl(star4(51, 86, 7), LIME3), fl(heartAt(40, 70, 0.14), "#FF7A1A"), fl(star4(70, 68, 6), WH),
    { d: JAR_D, stroke: ICE3, sw: 3.5 }] },
  "p3-jar-shine": { paths: [fl(rrect(27, 17, 46, 9, 4.5), "#E8F5FF"), ln("M27 46V70", WH, 4.5, 0.75), ln("M27 79V81", WH, 4.5, 0.75), ln("M74 50V58", WH, 3, 0.4)] },
  "p3-jar-lid": sticker([fl(rrect(24, 7, 52, 15, 5), GOLD3)], [fl(rrect(24, 16, 52, 6, 3), "#E0A21A"), ln("M33 11V18M41.5 11V18M50 11V18M58.5 11V18M67 11V18", "#B77F00", 2.4, 0.8)], 2, 2.6),
  "p3-jar-heart": { paths: [fl(heartAt(52, 58, 0.27), RED3)] },
  "p3-heart": sticker([fl(heartAt(50, 50, 1), RED3)], [ln("M27 34C28 27 33 23 39 23", WH, 6, 0.7)]),
  // an envelope: back with the dark inside, the raised flap, the front pocket (drawn over the note), the closed flap, the wax seal
  "p3-env-back": { paths: [fl("M10 36H90V80H10Z", OR3), ln("M22 36L50 58M36 36L57 52M50 36L64 47M64 36L71 41.5", SUN3, 3.2), fl("M10 36L50 63L10 70Z", ORD, 0, 0.35)] },
  "p3-env-flap-up": sticker([fl("M10 37L50 7L90 37Z", "#FFE7C2", 3)], [ln("M16 35L50 10L84 35", WH, 1.5, 0.6)]),
  "p3-env-front": sticker([fl(ENV_FRONT, PAPER, 2)], [ln("M12 83L40 57M88 83L60 57", PAPER2, 2), ln("M10 36L50 63L90 36", PAPER2, 2)]),
  "p3-env-flap": { paths: [fl("M10 36L50 66L90 36Z", SL, 2, 0.35), fl("M10 35L50 63L90 35Z", "#FFE7C2", 2), ln("M10 35L50 63L90 35", "#E2BE86", 1.6)] },
  "p3-env-seal": sticker([fl("M50 47C56 46 60 49 63 53C67 55 67 61 65 65C65 70 61 74 56 74C52 77 46 76 43 73C38 72 35 68 36 63C33 58 36 52 41 51C43 48 46 47 50 47Z", RED3)], [
    fl(ell(50.5, 61.5, 9.5, 9.5), "#D81818"), ln("M45.5 61.5L49.5 65.5L56.5 57.5", WH, 3.2)], 1.5, 2),
});
