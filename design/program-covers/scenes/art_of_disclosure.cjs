// The Art of Disclosure: looking over a brick wall, fingers curled over its top.
// The hijab figure (kit cast), no blob: the wall ends her body.
// Reference: references/art_of_disclosure-01.png.
const { figure } = require('../lib/fig.cjs');
// reference (references/art_of_disclosure-01.png). The curly character in the
// kit's cowboy hat (hair above the brim hidden under it), fingers on the top
// of a brick wall, coming up over it with the whole face showing and a
// welcoming smile: the moment just before saying it.
// The wall's top edge hides the collar, as a sill does on the other covers.
const k = require('../lib/draw.cjs');
const { INK, cover } = k;

// A small hand gripping the wall top at (x, y): only the four fingers show,
// curled over the edge, each fully outlined, the middle one longest.
// `flip` mirrors it.
function hand(x, y, flip, skin, sc = 1) {
  let g = '';
  [[-21, 30], [-7, 36], [7, 35], [21, 28]].forEach(([fx, len]) => {
    g += `<rect x="${fx - 7.5}" y="-12" width="15" height="${len}" rx="7.5" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
  });
  return `<g transform="translate(${x} ${y}) scale(${(flip ? -1 : 1) * sc} ${sc}) rotate(-6)">${g}</g>`;
}

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const SKY = '#8FB9D9';
  const WALL = '#E8665F';
  const MORTAR = '#F3A29C';
  const TOP = NB ? 770 : 786;

  let body = `<rect width="900" height="1200" fill="${SKY}"/>`;
  // two soft clouds high up, low detail under the title
  body += k.cloud(560, 300, 200, '#B7D3E8', 0) + k.cloud(90, 420, 150, '#A6C8E2', 0);

  // no blob: she looks over the wall, which hides everything below her chin's drape
  if (NB) body += figure('hijab', 450, TOP + 60, 400, 'ad4', { blob: false });
  // the wall: bricks, mortar, a dark top edge
  body += `<rect x="-10" y="${TOP}" width="920" height="450" fill="${WALL}"/>`;
  let mortar = '';
  for (let r = 0, y = TOP + 96; y < 1210; r++, y += 96) mortar += `M20 ${y} L880 ${y} `;
  for (let r = 0; r < 4; r++) {
    const y0 = TOP + r * 96, off = r % 2 ? 90 : 0;
    for (let x = 180 + off; x < 900; x += 300) mortar += `M${x} ${y0 + 12} L${x} ${y0 + 84} `;
  }
  body += `<path d="${mortar}" fill="none" stroke="${MORTAR}" stroke-width="7" stroke-linecap="round"/>`;
  body += `<path d="M-10 ${TOP} L910 ${TOP}" stroke="${INK}" stroke-width="7"/>`;

  // the character on her kit blob, resting on the top of the wall
  if (!NB) body += figure('hijab', 450, TOP - 3, 390, 'ad4', { a: '#FFC83D' });
  // her hands on the top of the wall, as on the old cover: four fingers
  // each side curled over the edge, in her kit skin colour
  if (NB) body += hand(318, TOP, false, '#C48650', 1.15) + hand(582, TOP, true, '#C48650', 1.15);
  return cover('', body);
};
