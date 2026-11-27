// The Speech Toolkit: an open toolbox with tools all round (lib/tools.cjs). The
// coils figure (kit cast), no blob: the toolbox rim ends her body under the collar.
// Reference: references/speech_toolkit-01.webp.
const { figure } = require('../lib/fig.cjs');
// coils character in a hard hat and hi-vis collar, tools all around, an open
// toolbox in front hiding the collar's cut edge. Small hardware only in the top
// band, where the title sits.
const k = require('../lib/draw.cjs');
const { INK, cover } = k;
const T = require('../lib/tools.cjs');

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const BG = '#4E7DAE';
  const { at, C } = T;
  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // a faint grid, like a workshop pegboard
  for (let y = 40; y < 1200; y += 60) for (let x = 30; x < 900; x += 60) body += `<circle cx="${x}" cy="${y}" r="4" fill="#45709D"/>`;

  // hardware scattered across the sheet, lightest in the title band
  const bits = [
    ['nut', 70, 90, 0, 0.9], ['screw', 300, 70, 30, 0.9], ['bolt', 520, 130, -40, 0.9], ['nail', 760, 80, 60, 1],
    ['nail', 180, 260, -20, 1], ['nut', 640, 290, 0, 0.8], ['screw', 840, 230, -15, 0.9], ['bolt', 380, 330, 70, 0.85],
    ['nail', 60, 400, 40, 1], ['nut', 470, 440, 0, 0.9], ['screw', 260, 450, 120, 0.9], ['nut', 600, 1150, 0, 0.9],
    ['bolt', 40, 640, 20, 1], ['nail', 880, 470, -30, 1], ['screw', 870, 930, 40, 1], ['nut', 30, 1170, 0, 1],
  ];
  bits.forEach(([kind, x, y, r, s]) => { body += at(x, y, r, s, T[kind](BG)); });

  // the tools, drawn behind the character
  body += at(450, 330, -5, 0.95, T.level());
  body += at(140, 560, 55, 0.95, T.wrench());
  body += at(92, 840, 8, 1.0, T.saw(BG));
  body += at(96, 1110, -16, 0.95, T.hammer());
  body += at(748, 600, -28, 0.95, T.drill());
  body += at(812, 872, 180, 0.8, T.tape());
  body += at(846, 1096, 22, 0.92, T.brush());
  body += at(712, 420, 8, 0.62, T.goggles());

  // the box runs on below the raised part, to the bottom edge
  body += `<rect x="170" y="900" width="560" height="340" fill="${C.teal}" stroke="${INK}" stroke-width="5"/>`;
  // the character and the open toolbox, raised so the Home card's middle band shows her whole
  body += `<g transform="translate(0 ${NB ? -202 : -188})">`;
  // the character
  body += (NB ? figure('coils', 450, 972, 340, 'st4', { blob: false }) : figure('coils', 450, 972, 360, 'st4', { a: '#FFC83D' }));

  // a square, a screwdriver and pliers standing in the box, clear of the collar
  body += at(196, 950, -12, 0.78, T.square());
  body += at(668, 934, 12, 0.82, T.screwdriver());
  body += at(724, 950, 26, 0.62, T.pliers());

  // the open toolbox in front: its rim is the edge the shoulders sit behind
  body += `<rect x="170" y="1004" width="560" height="230" rx="10" fill="${C.teal}" stroke="${INK}" stroke-width="5"/>`;
  body += `<path d="M190 1060 L710 1060" stroke="${C.tealD}" stroke-width="4" stroke-linecap="round"/>`;
  body += `<rect x="150" y="978" width="600" height="38" rx="10" fill="${C.red}" stroke="${INK}" stroke-width="5"/>`;
  body += `<rect x="232" y="1010" width="40" height="44" rx="6" fill="${C.steel}" stroke="${INK}" stroke-width="4"/><rect x="628" y="1010" width="40" height="44" rx="6" fill="${C.steel}" stroke="${INK}" stroke-width="4"/>`;
  body += `<rect x="380" y="1094" width="140" height="62" rx="10" fill="${C.yelL}" stroke="${INK}" stroke-width="4"/>`;
  body += `</g>`;
  return cover('', body);
};
