// Doodle-sheet tools for The Speech Toolkit cover, after the founder's reference
// (design/program-covers/references/speech_toolkit-01.webp). Each tool is drawn in local units around
// its own centre and placed with `at(x, y, rotation, scale)`.
const { INK, CREAM } = require('./draw.cjs');

const C = {
  red: '#E2493F', redD: '#B8352E', teal: '#46B3C0', tealD: '#2E8B97', orange: '#FF9040',
  yel: '#F5C33B', yelL: '#F8DF7C', wood: '#D9A066', woodD: '#B47B43', steel: '#C3CCD4', steelD: '#8994A1',
  lens: '#BFE6F0', lime: '#E9F27A', dark: '#3A3F47',
};

const sh = (d, fill, w = 4.5) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ln = (d, color = INK, w = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rr = (x, y, w, h, r, fill, sw = 4.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const ci = (cx, cy, r, fill, sw = 4) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const at = (x, y, rot, s, body) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${body}</g>`;

const hammer = () =>
  rr(-11, -12, 22, 196, 10, C.wood) + ln('M-2 20 L-3 110', C.woodD, 3) +
  rr(-14, 116, 28, 72, 12, C.red) + ln('M-8 136 L8 136 M-8 152 L8 152 M-8 168 L8 168', C.redD, 3) +
  sh('M-58 -44 L38 -44 L38 -8 L-58 -8 Z', C.steelD) +
  sh('M38 -44 C66 -48 84 -64 92 -84 C86 -56 68 -30 38 -10 Z', C.steelD) +
  rr(-74, -50, 18, 48, 4, C.steel);

const wrench = () =>
  sh('M-15 4 L15 4 L12 196 C12 210 -12 210 -12 196 Z', C.steel) + ci(0, 182, 8, C.steelD, 3) +
  sh('M-17 10 C-48 4 -58 -32 -42 -62 L-20 -44 L20 -44 L42 -62 C58 -32 48 4 17 10 Z', C.steel) +
  rr(-15, -14, 30, 14, 4, C.steelD, 3) + ln('M-8 -14 L-8 0 M0 -14 L0 0 M8 -14 L8 0', INK, 2);

const pliers = () =>
  sh('M-6 24 C-20 84 -30 144 -40 204 C-42 218 -26 220 -22 208 C-12 154 -2 94 8 34 Z', C.red) +
  sh('M6 24 C20 84 30 144 40 204 C42 218 26 220 22 208 C12 154 2 94 -8 34 Z', C.red) +
  sh('M-15 32 C-22 -8 -13 -50 -4 -84 L4 -84 C13 -50 22 -8 15 32 Z', C.steel) +
  ln('M0 -82 L0 18', INK, 3) + ln('M-6 -50 L6 -50 M-7 -34 L7 -34', C.steelD, 2.5) + ci(0, 26, 9, C.steelD, 3.5);

const screwdriver = () =>
  sh('M-5 -92 L5 -92 L6 44 L-6 44 Z', C.steel) + sh('M-5 -92 L5 -92 L3 -110 L-3 -110 Z', C.steelD, 3) +
  rr(-17, 40, 34, 112, 15, C.orange) + ln('M-7 62 L-7 136 M7 62 L7 136', '#D96F25', 3) + rr(-13, 146, 26, 14, 6, C.redD, 3.5);

const saw = (bg) => {
  let teeth = 'M-26 -128';
  for (let i = 0; i < 14; i++) teeth += ` L${-26 - (i % 2 ? 0 : 9) - i * 0.5} ${-128 + i * 14 + 7} L${-26 - i * 0.55} ${-128 + (i + 1) * 14}`;
  return sh(`M-26 -128 L26 -118 L26 72 L-34 72 Z`, C.steel) + ln(teeth, INK, 3.5) + ln('M14 -96 L14 50', '#E4E9EE', 4) +
    sh('M-42 64 L34 64 C54 66 56 152 36 160 L-30 160 C-52 152 -54 72 -42 64 Z', C.red) + rr(-18, 92, 36, 44, 16, bg, 4) +
    ci(-30, 80, 4, C.steelD, 2.5) + ci(22, 80, 4, C.steelD, 2.5);
};

const drill = () =>
  sh('M-28 6 L14 6 L24 112 L-22 112 Z', C.redD) + ln('M-14 24 L-10 98', '#8F2621', 3) +
  rr(-38, 104, 76, 34, 8, C.dark) + rr(-28, 112, 22, 10, 3, C.lime, 2.5) +
  sh('M-70 -40 L52 -40 C74 -40 82 -2 62 10 L-70 10 C-84 10 -84 -40 -70 -40 Z', C.red) +
  ln('M-56 -28 L-56 -2 M-46 -28 L-46 -2 M-36 -28 L-36 -2', C.redD, 3.5) +
  rr(16, 8, 14, 22, 4, C.dark, 3) +
  rr(62, -30, 34, 30, 6, C.steelD) + sh('M96 -20 L150 -15 L96 -10 Z', C.steel, 3.5) + ln('M108 -18 L112 -12 M122 -17 L126 -12', INK, 2);

const tape = () => {
  let ticks = '';
  for (let i = 0; i < 11; i++) ticks += `M${62 + i * 13} 22 L${62 + i * 13} ${i % 2 ? 30 : 36}`;
  return sh('M46 16 L190 16 L190 40 L46 40 Z', C.yelL) + ln(ticks, INK, 2.5) + sh('M190 12 L200 12 L200 46 L190 46 Z', C.steelD, 3.5) +
    rr(-52, -52, 104, 104, 28, C.yel) + ci(0, 0, 26, C.dark, 4) + ci(0, 0, 9, C.steel, 3) +
    sh('M30 -52 L52 -52 L52 -24', 'none', 4) + rr(-18, -62, 36, 14, 5, C.redD, 3.5);
};

const level = () =>
  rr(-160, -20, 320, 40, 8, C.teal) + rr(-34, -12, 68, 24, 12, C.lime, 3.5) + ci(4, 0, 6, CREAM, 2.5) +
  ln('M-20 -12 L-20 12 M20 -12 L20 12', INK, 2.5) + rr(-148, -10, 30, 20, 8, C.lime, 3) + rr(118, -10, 30, 20, 8, C.lime, 3) +
  ln('M-100 -20 L-100 -8 M-70 -20 L-70 -10 M60 -20 L60 -10 M90 -20 L90 -8', C.tealD, 3);

const brush = () =>
  sh('M-9 42 L9 42 L7 196 C7 208 -7 208 -7 196 Z', C.woodD) + ci(0, 184, 5, C.wood, 2.5) +
  rr(-24, 2, 48, 44, 5, C.steel) + ln('M-24 20 L24 20', C.steelD, 3) +
  sh('M-26 2 L26 2 L28 -60 C16 -74 -16 -74 -28 -60 Z', '#E8C27A') +
  sh('M-28 -60 C-16 -74 16 -74 28 -60 L28 -44 C14 -50 -14 -50 -28 -44 Z', C.orange, 3.5) +
  ln('M-12 -30 L-12 -4 M0 -36 L0 -6 M12 -30 L12 -4', '#C9A25B', 2.5);

const trowel = () =>
  sh('M0 -124 C52 -62 78 -2 66 30 L-66 30 C-78 -2 -52 -62 0 -124 Z', C.steel) + ln('M0 -108 L0 22', '#E4E9EE', 4) +
  sh('M-7 30 L7 30 L9 64 L-9 64 Z', C.steelD, 3.5) + rr(-15, 60, 30, 94, 13, C.wood) + ln('M-4 80 L-4 136', C.woodD, 3);

const square = () => {
  let ticks = '';
  for (let i = 0; i < 9; i++) ticks += `M-18 ${-118 + i * 22} L${i % 2 ? -8 : -2} ${-118 + i * 22}`;
  for (let i = 0; i < 5; i++) ticks += `M${34 + i * 22} 108 L${34 + i * 22} ${i % 2 ? 98 : 92}`;
  return sh('M-22 -140 L12 -140 L12 78 L150 78 L150 112 L-22 112 Z', C.yel) + ln(ticks, INK, 2.5) + ci(-5, 95, 5, C.dark, 2.5);
};

const goggles = () =>
  ln('M-100 6 C-120 4 -128 22 -112 30 M100 6 C120 4 128 22 112 30', C.dark, 10) +
  rr(-104, -30, 208, 64, 30, C.red) +
  sh('M-90 -16 C-90 -24 -10 -24 -8 -12 L-8 14 C-12 26 -90 26 -90 14 Z', C.lens, 3.5) +
  sh('M90 -16 C90 -24 10 -24 8 -12 L8 14 C12 26 90 26 90 14 Z', C.lens, 3.5) +
  ln('M-74 -8 L-56 -8 M22 -8 L40 -8', '#FFFFFF', 4) + sh('M-12 -24 L12 -24 L8 -8 L-8 -8 Z', C.redD, 3);

const nut = (bg) => {
  const pts = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i; return `${(16 * Math.cos(a)).toFixed(1)} ${(16 * Math.sin(a)).toFixed(1)}`; });
  return sh(`M${pts.join(' L')} Z`, C.steel, 3.5) + ci(0, 0, 6, bg, 3);
};
const bolt = () => {
  const pts = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return `${(15 * Math.cos(a)).toFixed(1)} ${(15 * Math.sin(a) - 22).toFixed(1)}`; });
  return sh('M-7 -12 L7 -12 L7 34 L-7 34 Z', C.steel, 3.5) + ln('M-7 -2 L7 2 M-7 8 L7 12 M-7 18 L7 22', INK, 2) + sh(`M${pts.join(' L')} Z`, C.steelD, 3.5);
};
const screw = () => sh('M-4 -18 L4 -18 L3 24 L0 32 L-3 24 Z', C.steel, 3) + ln('M-4 -6 L4 -2 M-4 4 L4 8 M-4 14 L3 18', INK, 1.8) + sh('M-12 -24 C-12 -32 12 -32 12 -24 L12 -18 L-12 -18 Z', C.steel, 3) + ln('M-6 -24 L6 -24', INK, 2.5);
const nail = () => ln('M0 -22 L0 26', INK, 6) + ln('M0 -22 L0 26', C.steel, 3) + sh('M-9 -26 L9 -26 L9 -20 L-9 -20 Z', C.steelD, 2.5);

module.exports = { C, at, hammer, wrench, pliers, screwdriver, saw, drill, tape, level, brush, trowel, square, goggles, nut, bolt, screw, nail, sh, ln, rr, ci };
