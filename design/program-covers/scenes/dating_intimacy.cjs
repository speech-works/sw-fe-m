// Dating, Intimacy & Vulnerability: two profile cards leaning in, hearts and two
// speech bubbles between them. Flower and cap (kit cast) with warm, blushing
// faces, eyes on each other (inputs/faces/*-warm-look.svg), no blob: each photo's
// edge ends the body under the collar.
const { figure } = require('../lib/fig.cjs');
// reference. Two profile cards lean in from either side; in their photos the
// flower character (laughing) and the cap character (pleased, glancing across)
// face each other. Between them a heart and two speech bubbles meeting. The
// reference's words and social-network marks are left out, and its hands
// became the bubbles: our characters are head and collar only.
const k = require('../lib/draw.cjs');
const { INK, CREAM, line, rng, sparkle, cover } = k;

const BG = '#F6A63A';
const PAPER = '#FFFDF8';
const PHOTO = '#F8B54F';

// A profile card hanging from its inner top corner, tilted by `rot`. `side`
// -1 is the left card (it extends left of the corner), 1 the right.
function card(cornerX, cornerY, rot, side, who, NB) {
  const s = side;
  let g = `<rect x="${s < 0 ? -460 : 0}" y="0" width="460" height="1100" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>`;
  // photo
  const fx = s < 0 ? -340 : 60, fy = 70, fs = 280;
  g += `<clipPath id="dt3-photo-${who.id}"><rect x="${fx}" y="${fy}" width="${fs}" height="${fs}"/></clipPath>`;
  g += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" fill="${PHOTO}"/>`;
  g += `<g clip-path="url(#dt3-photo-${who.id})">${(NB ? figure(who.name, fx + fs / 2, fy + fs - 6, 236, who.id, { blob: false, flip: who.flip, file: require('path').join(__dirname, `../inputs/faces/${who.name}-warm-look.svg`) }) : figure(who.name, fx + fs / 2, fy + fs - 16, 204, who.id, { ...(who.blob || {}), flip: who.flip }))}</g>`;
  g += `<rect x="${fx}" y="${fy}" width="${fs}" height="${fs}" fill="none" stroke="${INK}" stroke-width="7"/>`;
  // a menu mark by the photo, and text lines (no letters) below it
  const mx = s < 0 ? fx + fs - 40 : fx + 18;
  g += line(`M${mx} ${fy - 30} h28 M${mx} ${fy - 20} h28 M${mx} ${fy - 10} h28`, INK, 4);
  const lx = fx;
  g += line(`M${lx} ${fy + fs + 46} h${fs - 40} M${lx} ${fy + fs + 76} h${fs - 90} M${lx} ${fy + fs + 106} h${fs - 130}`, INK, 9);
  // a post below, in halftone grey
  g += `<rect x="${fx}" y="${fy + fs + 150}" width="${fs + 40 * -s}" height="260" fill="url(#dt3-tone)" stroke="none"/>`;
  return `<g transform="translate(${cornerX} ${cornerY}) rotate(${rot})">${g}</g>`;
}

// One speech bubble with its tail as a single silhouette.
function chat(x, y, w, h, fill, t) {
  const hw = w / 2, hh = h / 2, r = hh;
  const body = `<path d="M${-hw + r} ${-hh} H${hw - r} A${r} ${r} 0 0 1 ${hw - r} ${hh} H${-hw + r} A${r} ${r} 0 0 1 ${-hw + r} ${-hh}Z"/>` +
    `<path d="M${t * hw * 0.1} ${hh - 8} Q${t * hw * 0.2} ${hh + 14} ${t * hw * 0.62} ${hh + 26} Q${t * hw * 0.42} ${hh + 6} ${t * hw * 0.5} ${hh - 8} Z"/>`;
  const dots = [-1, 0, 1].map(i => `<circle cx="${i * 15}" cy="1" r="5" fill="${INK}"/>`).join('');
  return `<g transform="translate(${x} ${y})"><g fill="${fill}" stroke="${INK}" stroke-width="9" stroke-linejoin="round">${body}</g><g fill="${fill}">${body}</g>${dots}</g>`;
}

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const defs = `<pattern id="dt3-tone" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#ECE8E2"/><circle cx="4.5" cy="4.5" r="1.6" fill="#BDB7AE"/></pattern>` +
    `<pattern id="dt3-heart" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#E2493F"/><circle cx="3.5" cy="3.5" r="1.4" fill="#B8352E"/></pattern>`;
  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // paper grain on the orange ground
  const g = rng(51);
  for (let i = 0; i < 420; i++) body += `<circle cx="${(g() * 900).toFixed(0)}" cy="${(g() * 1200).toFixed(0)}" r="${(0.8 + g() * 1.4).toFixed(1)}" fill="${g() > 0.5 ? '#E8962B' : '#FBBE5E'}"/>`;

  body += card(428, 400, 14, -1, { name: 'flower', id: 'dt4a', blob: { a: '#E2493F', b: '#FFF4E6', kind: 'check', cell: 60 } }, NB);
  body += card(472, 400, -14, 1, { name: 'cap', id: 'dt4b', blob: { a: '#3B5BA9', b: '#FFF4E6', kind: 'check', cell: 60 }, flip: true }, NB);

  // between them: a heart, then a conversation starting
  body += `<path d="M450 640 C404 606 392 572 410 552 C426 534 446 542 450 560 C454 542 474 534 490 552 C508 572 496 606 450 640 Z" fill="url(#dt3-heart)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  if (NB) body += [[404, 500, 0.45, -12], [500, 470, 0.35, 14]].map(([x, y, s, r]) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-450 -590)" d="M450 640 C404 606 392 572 410 552 C426 534 446 542 450 560 C454 542 474 534 490 552 C508 572 496 606 450 640 Z" fill="#F26A7E" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`).join('');
  body += chat(418, 760, 112, 62, '#FFD6DE', -1);
  body += chat(486, 860, 112, 62, '#C7E3F8', 1);
  body += sparkle(450, 980, 18, CREAM) + sparkle(402, 1060, 10, CREAM) + sparkle(500, 1110, 12, CREAM);
  return cover(defs, body);
};
