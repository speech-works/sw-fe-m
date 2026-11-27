// Bouncing Back: springing up out of a jack-in-the-box with confetti. The braids
// figure laughing and waving both hands (inputs/faces/braids-laugh-wave2.svg: the
// kit's wave hand and its mirror), no blob: the yellow ruff on the spring ends
// her body and both sleeves under the collar.
// Reference: references/bouncing_back-01.png.
const { figure } = require('../lib/fig.cjs');
// reference (references/bouncing_back-01.png). The braids character springs up
// out of a jack-in-the-box, arms high, confetti all round. The reference's
// "#1" trophy became the box and spring: bouncing back, not winning, since
// the covers carry no trophies or rankings.
const k = require('../lib/draw.cjs');
const { INK, CREAM, ORANGE, line, rng, blob, cover } = k;

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const BG = '#7A8FE0';
  const BOX = '#46B3C0', BOX_D = '#2E8B97';
  const STEEL = '#C3CCD4';
  const o = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // confetti, sparse in the title band
  const c = rng(812);
  const colours = ['#F2A7BD', '#F5C33B', '#C8F750', CREAM, ORANGE];
  for (let i = 0; i < 46; i++) {
    const x = c() * 900, y = 120 + c() * 1000, r = c() * 180;
    body += `<rect x="${(x - 9).toFixed(0)}" y="${(y - 5).toFixed(0)}" width="18" height="10" rx="4" fill="${colours[i % colours.length]}" transform="rotate(${r.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }

  // ── the box in 3D: front face, a darker right side, the open top ──
  // Depth runs up and to the right by (70, -40). The lid is hinged on the
  // top's back edge and has swung back past upright, so we see its inside.
  const F = { l: 260, r: 570, t: 940 }, DX = 70, DY = -40;
  const back = { l: F.l + DX, r: F.r + DX, y: F.t + DY };
  body += `<path d="M${back.l} ${back.y} L${back.r} ${back.y} L${back.r + 22} ${back.y - 156} L${back.l + 22} ${back.y - 156} Z" fill="#5CC4D0" ${o()}/>`;
  body += `<path d="M${back.l + 16} ${back.y - 12} L${back.r - 12} ${back.y - 12} L${back.r + 6} ${back.y - 142} L${back.l + 34} ${back.y - 142} Z" fill="none" stroke="#86D6DE" stroke-width="5" stroke-linejoin="round"/>`;
  body += `<path d="M${F.r} ${F.t} L${back.r} ${back.y} L${back.r} 1214 L${F.r} 1214 Z" fill="${BOX_D}" ${o()}/>`;
  body += `<path d="M${F.l} ${F.t} L${F.r} ${F.t} L${back.r} ${back.y} L${back.l} ${back.y} Z" fill="#5CC4D0" ${o()}/>`;
  body += `<path d="M${F.l + 22} ${F.t - 6} L${F.r - 14} ${F.t - 6} L${back.r - 16} ${back.y + 6} L${back.l + 18} ${back.y + 6} Z" fill="#1F4E55" ${o(3.5)}/>`;

  // the spring, rising out of the opening to the ruff
  let spring = '';
  for (let i = 0; i < 10; i++) {
    const y = 924 - i * 18;
    spring += `<ellipse cx="450" cy="${y}" rx="${50 - i * 1.5}" ry="11" fill="none" stroke="${INK}" stroke-width="14"/><ellipse cx="450" cy="${y}" rx="${50 - i * 1.5}" ry="11" fill="none" stroke="${STEEL}" stroke-width="8"/>`;
  }
  body += spring;

  // the character on her kit blob, riding the top of the spring
  if (NB) {
    // no blob: she rides the frilled yellow ruff on top of the spring, as on
    // the round 3 cover; the ruff ends her body just under the collar
    body += figure('braids', 450, 774, 350, 'bb4', { blob: false, file: require('path').join(__dirname, '../inputs/faces/braids-laugh-wave2.svg') });
    const ruff = [];
    for (let i = 0; i < 13; i++) { const a = Math.PI * (i / 12); ruff.push([450 - Math.cos(a) * 152, 788 + Math.sin(a) * 18, 32]); }
    body += blob(ruff, '#F5C33B', 4.5);
    body += [0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${336 + i * 38}" cy="${800 + (i % 2 ? 6 : 0)}" r="5" fill="${ORANGE}"/>`).join('');
  } else {
    body += figure('braids', 450, 782, 350, 'bb4', { a: '#FF6F91', b: '#FFE94A', tilt: 5 });
  }

  // bounce marks either side
  body += line('M226 720 Q204 752 214 790 M194 760 Q182 782 190 808', INK, 5) + line('M674 720 Q696 752 686 790 M706 760 Q718 782 710 808', INK, 5);

  // the front face, with its diamonds, and a crank on the side face
  body += `<path d="M${F.l} ${F.t} L${F.r} ${F.t} L${F.r} 1214 L${F.l} 1214 Z" fill="${BOX}" ${o()}/>`;
  body += line(`M${F.l + 4} ${F.t + 14} L${F.r - 4} ${F.t + 14}`, '#7AD2DB', 5);
  body += [[320, 1010], [415, 1062], [510, 1010], [320, 1120], [510, 1120], [415, 1170]].map(([x, y]) => `<path d="M${x} ${y - 22} L${x + 18} ${y} L${x} ${y + 22} L${x - 18} ${y} Z" fill="#F5C33B" ${o(3.5)}/>`).join('');
  body += `<path d="M598 1050 L620 1038 L620 1052 L598 1064 Z" fill="${STEEL}" ${o(3.5)}/>` + line('M620 1045 L652 1028 L652 990', INK, 13) + line('M620 1045 L652 1028 L652 990', STEEL, 7) + `<rect x="640" y="964" width="24" height="34" rx="10" fill="${ORANGE}" ${o(4)}/>`;
  return cover('', body);
};
