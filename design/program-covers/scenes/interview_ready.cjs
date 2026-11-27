// Interview Ready: a video call on a desktop monitor, prep notes stuck round
// the screen (some crossed out, one ticked). The banker (kit cast) on the call,
// no blob: the screen's bottom edge ends his body under the collar.
// Reference: references/interview_ready-01.webp.
const { figure } = require('../lib/fig.cjs');
// (references/interview_ready-01.webp). A candidate in a suit and tie on a
// video call, framed by a desktop monitor, with prep notes stuck around the
// screen. The notes carry scribbles, never letters; some answers are crossed
// out and one is ticked.
const k = require('../lib/draw.cjs');
const { INK, line, rng, cover } = k;

const NOTE = '#FFE45C';
const PEN = '#2C6FB0';

// A line of handwriting: a wobbly wave, no letters.
function scribble(x, y, w, r) {
  let d = `M${x} ${y}`;
  const steps = Math.round(w / 9);
  for (let i = 1; i <= steps; i++) {
    const px = x + (w * i) / steps;
    const py = y + (i % 2 ? -1 : 1) * (4 + r() * 5);
    d += ` Q${(px - w / steps / 2).toFixed(1)} ${(py + (r() - 0.5) * 6).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return line(d, PEN, 3.2);
}

// A square sticky note with a soft shadow, centred on (cx, cy).
function note(cx, cy, rot, seed, mark, shadow) {
  const r = rng(seed);
  const s = 150;
  let g = `<rect x="${-s / 2 + 8}" y="${-s / 2 + 10}" width="${s}" height="${s}" fill="${shadow}"/>`;
  g += `<path d="M${-s / 2} ${-s / 2} L${s / 2} ${-s / 2} L${s / 2} ${s / 2 - 14} L${s / 2 - 14} ${s / 2} L${-s / 2} ${s / 2} Z" fill="${NOTE}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  g += `<path d="M${s / 2} ${s / 2 - 14} L${s / 2 - 14} ${s / 2 - 14} L${s / 2 - 14} ${s / 2} Z" fill="#E9C93E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  const rows = mark === 'tick' ? [-28, 2] : [-34, -6, 22];
  rows.forEach((dy, i) => { g += scribble(-52, dy, i === rows.length - 1 ? 70 : 100, r); });
  if (mark === 'cross') g += line(`M-60 ${-30 + r() * 8} L60 ${-10 + r() * 8}`, PEN, 4);
  if (mark === 'tick') g += line('M18 40 L32 54 L58 22', '#2E9B5B', 6);
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">${g}</g>`;
}

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const BG = '#F2A097';
  const SHADE = '#D9776F';
  const SCREEN = '#2F8FD8';
  const BEZEL = '#1E1D23';
  const SHELL = '#F7F3EC';
  const defs = `<clipPath id="ir3-screen"><rect x="138" y="448" width="624" height="400" rx="14"/></clipPath>`;

  let body = `<rect width="900" height="1200" fill="${BG}"/>`;

  // no blob: the whole monitor sits 78 up, so its screen's bottom edge (which
  // ends his body under the collar) is inside the Home card's band
  if (NB) body += `<g transform="translate(0 -78)">`;
  // stand, base and its shadow
  body += `<ellipse cx="450" cy="1134" rx="230" ry="14" fill="${SHADE}"/>`;
  body += `<path d="M392 960 L508 960 L540 1108 L360 1108 Z" fill="${SHELL}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
  body += line('M420 980 L404 1100', '#E7DFD2', 8);
  body += `<rect x="296" y="1098" width="308" height="30" rx="15" fill="${SHELL}" stroke="${INK}" stroke-width="4.5"/>`;

  // the monitor: black bezel, then the screen, then the white chin
  body += `<rect x="110" y="420" width="680" height="470" rx="36" fill="${BEZEL}" stroke="${INK}" stroke-width="5"/>`;
  body += `<rect x="138" y="448" width="624" height="400" rx="14" fill="${SCREEN}"/>`;

  // chalky brush texture on the screen, as in the reference
  const tex = rng(311);
  let strokes = '';
  for (let i = 0; i < 90; i++) {
    const x = 120 + tex() * 680, y = 440 + tex() * 420, len = 26 + tex() * 50;
    strokes += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${(len * 0.8).toFixed(0)} ${(-len * 0.58).toFixed(0)}" stroke="${tex() > 0.5 ? '#55A9EA' : '#2680C8'}" stroke-width="${(2 + tex() * 2.5).toFixed(1)}" stroke-linecap="round" opacity="0.55"/>`;
  }
  body += `<g clip-path="url(#ir3-screen)">${strokes}</g>`;

  // the candidate on the call, seated on the screen's bottom edge
  body += `<g clip-path="url(#ir3-screen)">${NB ? figure('banker', 450, 839, 370, 'ir4', { blob: false }) : figure('banker', 450, 784, 370, 'ir4')}</g>`;

  body += `<path d="M110 862 L790 862 L790 934 C790 954 774 970 754 970 L146 970 C126 970 110 954 110 934 Z" fill="${SHELL}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  // camera, with its light on
  body += `<circle cx="450" cy="434" r="5" fill="#4A4950"/><circle cx="466" cy="434" r="3" fill="#7DE6A3"/>`;

  // the prep notes, stuck around the screen and on the chin
  body += note(196, 474, -7, 11, 'cross', SHADE);
  body += note(714, 470, 8, 23, 'plain', SHADE);
  body += note(146, 660, 9, 37, 'cross', SHADE);
  body += note(770, 668, -9, 41, 'cross', SHADE);
  body += note(152, 846, -5, 53, 'plain', SHADE);
  body += note(318, 948, 4, 67, 'cross', SHADE);
  body += note(706, 930, -4, 79, 'tick', SHADE);
  if (NB) body += `</g>`;
  return cover(defs, body);
};
