// The Word Swap: up to the shoulders in a heap of speech bubbles, one orange
// bubble beside him. The turban figure (kit cast), no blob: the front of the heap
// ends his body under the collar. Reference: references/word_swap-01.png.
const { figure } = require('../lib/fig.cjs');
// (references/word_swap-01.png). The blonde pigtails character up to the shoulders in a
// heap of speech bubbles of every shape, each one a word swapped for another.
// One orange bubble beside them is the word they choose to keep. Dots and
// scribbles only, never letters.
const k = require('../lib/draw.cjs');
const { INK, CREAM, ORANGE, line, rng, sparkle, cover } = k;

const FILLS = ['#FFFDF8', '#FFD6DE', '#C7E3F8', '#CFF0DC', '#FFEFB0', '#E4DAFA', '#FFD9BF'];

const st = (w = 4.5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Rounded rectangle as a path, so it can share one outline with a tail.
const rrect = (x, y, w, h, r) =>
  `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

// One bubble, centred on (0,0), w x h, tail on side `t` (-1 left, 1 right).
// Body and tail are one silhouette: every piece is stroked at double width
// first, then filled on top, so the outline runs round the outside only and
// no line separates the tail from the bubble.
function bubble(kind, w, h, fill, t, inner, seed, sw = 4.5) {
  const r = rng(seed);
  const hw = w / 2, hh = h / 2;
  const pieces = [];
  const tail = (baseY) => {
    const x1 = t * hw * 0.12, x2 = t * hw * 0.48, tip = [t * hw * 0.66, hh + 30];
    return `<path d="M${x1} ${baseY} Q${x1 + t * 6} ${hh + 16} ${tip[0]} ${tip[1]} Q${x2 - t * 2} ${hh + 8} ${x2} ${baseY} Z"/>`;
  };
  if (kind === 'pill' || kind === 'box') {
    pieces.push(`<path d="${rrect(-hw, -hh, w, h, kind === 'pill' ? hh : 18)}"/>`, tail(hh - 12));
  } else if (kind === 'oval') {
    pieces.push(`<ellipse cx="0" cy="0" rx="${hw}" ry="${hh}"/>`, tail(hh * 0.6));
  } else if (kind === 'cloud') {
    [[-hw * 0.52, hh * 0.05, hh * 0.72], [-hw * 0.14, -hh * 0.3, hh * 0.82], [hw * 0.3, -hh * 0.18, hh * 0.78], [hw * 0.58, hh * 0.16, hh * 0.6], [0, hh * 0.28, hh * 0.68]]
      .forEach(([x, y, rr]) => pieces.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}"/>`));
  } else {
    const n = 18;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n;
      const f = i % 2 ? 0.76 : 1;
      return `${(Math.cos(a) * hw * f).toFixed(1)} ${(Math.sin(a) * hh * f).toFixed(1)}`;
    });
    pieces.push(`<path d="M${pts.join(' L')} Z"/>`);
  }
  const body = pieces.join('');
  let out = `<g fill="${fill}" stroke="${INK}" stroke-width="${sw * 2}" stroke-linejoin="round">${body}</g><g fill="${fill}">${body}</g>`;
  // a thought-bubble trail for the cloud, as two small outlined puffs
  if (kind === 'cloud') out += `<circle cx="${t * hw * 0.62}" cy="${hh + 18}" r="${hh * 0.16}" fill="${fill}" ${st(sw)}/><circle cx="${t * hw * 0.8}" cy="${hh + 40}" r="${hh * 0.1}" fill="${fill}" ${st(sw - 1)}/>`;
  // shine
  if (kind !== 'spiky') out += `<path d="M${-hw * 0.62} ${-hh * 0.18} Q${-hw * 0.58} ${-hh * 0.58} ${-hw * 0.3} ${-hh * 0.66}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`;
  if (inner === 'dots') {
    out += [-1, 0, 1].map(i => `<circle cx="${(i * Math.min(17, hw * 0.26)).toFixed(1)}" cy="2" r="${Math.min(6, hh * 0.12).toFixed(1)}" fill="${INK}"/>`).join('');
  } else {
    const y0 = -hh * 0.16;
    out += [0, 1].map(i => {
      const len = (i ? 0.5 : 0.78) * w * 0.66;
      let d = `M${(-w * 0.26).toFixed(1)} ${(y0 + i * hh * 0.42).toFixed(1)}`;
      for (let s2 = 1; s2 <= 6; s2++) d += ` q${(len / 12).toFixed(1)} ${(s2 % 2 ? -1 : 1) * (3 + r() * 2.5)} ${(len / 6).toFixed(1)} 0`;
      return line(d, '#4E4A5E', 3.2);
    }).join('');
  }
  return out;
}

const place = (x, y, rot, body) => `<g transform="translate(${x} ${y}) rotate(${rot})">${body}</g>`;

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const BG = '#5D63B8';
  const r = rng(907);
  const kinds = ['pill', 'box', 'oval', 'cloud', 'spiky', 'pill', 'box', 'oval'];
  const one = (x, y, scale = 1) => {
    const kind = kinds[Math.floor(r() * kinds.length)];
    const w = (kind === 'spiky' ? 130 : 150 + r() * 70) * scale;
    const h = (kind === 'pill' ? 70 + r() * 16 : 90 + r() * 26) * scale;
    const fill = FILLS[Math.floor(r() * FILLS.length)];
    const rot = (r() - 0.5) * 36;
    return place(x.toFixed(0), y.toFixed(0), rot.toFixed(1), bubble(kind, w, h, fill, r() > 0.5 ? 1 : -1, r() > 0.45 ? 'dots' : 'lines', Math.floor(r() * 1e6)));
  };

  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // faint dots of chatter drifting in the sky
  const sky = rng(71);
  for (let i = 0; i < 22; i++) body += `<circle cx="${(sky() * 900).toFixed(0)}" cy="${(60 + sky() * 520).toFixed(0)}" r="${(3 + sky() * 4).toFixed(1)}" fill="#7C82CE"/>`;
  body += sparkle(140, 300, 16, '#9AA0E0') + sparkle(780, 230, 12, '#9AA0E0') + sparkle(690, 420, 9, '#9AA0E0');

  // the heap behind the character: a few bubbles peeking above the shoulders
  [[210, 670], [700, 680], [240, 590], [680, 602], [110, 720], [800, 730], [150, 650], [770, 658]].forEach(([x, y]) => { body += one(x, y, 0.95); });


  // no blob: he is up to the shoulders in the heap, as on the old cover;
  // the front edge of the heap sits just under his collar
  let edge = '';
  if (NB) {
    edge += place(318, 806, -3, bubble('pill', 210, 86, '#FFFDF8', -1, 'dots', 5));
    edge += place(530, 808, 4, bubble('box', 200, 92, '#BFDDF2', 1, 'lines', 6));
    edge += place(424, 828, 0, bubble('oval', 190, 90, '#FBE7A6', 1, 'dots', 7));
    body += figure('turban', 420, 784, 370, 'ws4', { blob: false });
  }
  // the heap in front, back rows first so the lower ones overlap the higher
  const rows = [
    { y: 770, xs: [40, 170, 730, 860], s: 1 },
    { y: 840, xs: [-10, 120, 250, 380, 510, 640, 770, 900], s: 1.05 },
    { y: 920, xs: [50, 190, 330, 470, 610, 750, 880], s: 1.1 },
    { y: 1000, xs: [-20, 120, 260, 400, 540, 680, 820], s: 1.15 },
    { y: 1080, xs: [40, 180, 320, 460, 600, 740, 880], s: 1.2 },
    { y: 1170, xs: [-10, 130, 270, 410, 550, 690, 830], s: 1.25 },
  ];
  rows.forEach(({ y, xs, s }) => xs.forEach(x => { body += one(x + (r() - 0.5) * 40, y + (r() - 0.5) * 24, s); }));

  // the character on his kit blob, sitting on top of the heap
  if (!NB) body += figure('turban', 420, 784, 370, 'ws4', { a: '#C8F750', b: '#FFF4E6' });
  else body += edge;

  // the word they keep: orange, beside them, its tail toward their mouth
  const keep = `<path d="${rrect(630, 420, 220, 116, 58)}"/><path d="M658 522 Q640 564 592 602 Q668 574 706 532 Z"/>`;
  body += `<g fill="${ORANGE}" stroke="${INK}" stroke-width="10" stroke-linejoin="round">${keep}</g><g fill="${ORANGE}">${keep}</g>`;
  body += `<path d="M660 456 Q666 440 690 434" fill="none" stroke="#FFD2AE" stroke-width="6" stroke-linecap="round"/>`;
  body += line('M672 478 q12 -10 24 0 q12 10 24 0 q12 -10 24 0 q12 10 24 0 q12 -10 24 0', CREAM, 6);
  body += sparkle(864, 404, 16, CREAM) + sparkle(618, 396, 10, CREAM) + sparkle(866, 546, 9, CREAM);
  return cover('', body);
};
