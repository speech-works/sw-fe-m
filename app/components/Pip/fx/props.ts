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
