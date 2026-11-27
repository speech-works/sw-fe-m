// Breaking Thought Traps: the site's own cage scene (sw-landing CageAvatar.tsx),
// captured as a still (inputs/scenes/cage-4800.svg): the cage bursting open, she
// laughs, the rain cloud lifted away, the sun out. On her kit blob, as on the site.
const fs = require('fs');
const path = require('path');
const { BLOBS } = require('../lib/fig.cjs');
const { cover, INK } = require('../lib/draw.cjs');

module.exports = (v = 'break') => {
  const file = v === 'free' ? 'cage-7600.svg' : 'cage-4800.svg';
  let svg = fs.readFileSync(path.join(__dirname, '../inputs/scenes', file), 'utf8');
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  let scene = inner;
  if (v !== 'free') {
    // the bursting frame, cleaned for a still: every piece at full strength,
    // no fading echo ring, the rain cloud lifted away from the cage top (it
    // read as stuck to the hook), and the sun just coming out
    const set = (id, attrs) => { scene = scene.replace(new RegExp(`<g id="${id}"([^>]*)>`), (m, a) => { let t = a; for (const [k, val] of Object.entries(attrs)) { t = t.replace(new RegExp(` ${k}="[^"]*"`), ''); t += ` ${k}="${val}"`; } return `<g id="${id}"${t}>`; }); };
    ['cg-fL', 'cg-fR', 'cg-lL', 'cg-lR', 'cg-pT', 'cg-pL', 'cg-pR', 'cg-pB'].forEach((id) => set(id, { opacity: '1' }));
    set('cg-pop', { opacity: '0' });
    set('cg-cloud', { transform: 'translate(-120 -296) scale(0.8)', opacity: '1' });
    scene = scene.replace(/<circle id="cg-ring"([^>]*?) opacity="[^"]*"/, '<circle id="cg-ring"$1 opacity="0"');
    // the cage's bottom stubs pass behind her shoulders, never over her collar:
    // a mask with her body's shape cut out of it
    scene = scene.replace('<g id="cg-pB"', '<mask id="cg-behind" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200"><rect x="-400" y="-400" width="1200" height="1200" fill="#fff"/><path d="M118 218 L202 218 C240 236 270 258 292 300 L28 300 C50 258 80 236 118 218 Z" fill="#000"/></mask><g mask="url(#cg-behind)"><g id="cg-pB"');
    scene = scene.replace(/(<g id="cg-pB"[\s\S]*?)(<g id="cg-flakes")/, '$1</g>$2');
    set('cg-sun', { opacity: '1', transform: 'translate(400 -150) scale(0.8)' });
  }
  // scene box -240 -300 800 760, scaled to the cover's width
  const k = 900 / 800, top = 776 - (298 + 300) * k;
  let body = `<rect width="900" height="1200" fill="#8EC3F0"/>`;
  // soft green ground from just under her
  body += `<path d="M-10 ${top + 610 * k} C250 ${top + 596 * k} 650 ${top + 596 * k} 910 ${top + 610 * k} L910 1210 L-10 1210 Z" fill="#A7DC8C"/>`;
  const tuft = (x, y, s) => `<path d="M${x - 14 * s} ${y} Q${x - 10 * s} ${y - 22 * s} ${x - 18 * s} ${y - 34 * s} M${x} ${y} Q${x} ${y - 28 * s} ${x + 4 * s} ${y - 44 * s} M${x + 14 * s} ${y} Q${x + 12 * s} ${y - 20 * s} ${x + 22 * s} ${y - 30 * s}" fill="none" stroke="#7FC266" stroke-width="${6 * s}" stroke-linecap="round"/>`;
  [[120, 930, 1], [760, 900, 0.9], [300, 1060, 1.1], [640, 1120, 1], [460, 990, 0.8], [90, 1150, 0.9], [830, 1060, 1]].forEach(([x, y, s]) => { body += tuft(x, y, s); });
  const b = BLOBS.curly;
  const blob = `<path d="${b.d}" fill="#FFE14D"/>`;
  // 'bg': the cover without the scene (sky, ground, grass, her blob): the app's
  // animated cover (app-scene-thought-traps.py) draws the scene's parts on it
  body += `<g transform="translate(0 ${top}) scale(${k}) translate(240 300)">${blob}${v === 'bg' ? '' : scene}</g>`;
  return cover('', body);
};
