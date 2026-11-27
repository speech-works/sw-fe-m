// A kit figure with its kit hands at one frame of a moment, as a still SVG
// (inputs/faces/braids-laugh-wave2.svg): the hand layer of the figure's hand
// rig (sw-characters web/scripts/export_hands.mjs, saved as inputs/hands/<name>.json)
// set the way the site's MailmanHands.ts sets a frame: the hand's transform and
// clip, the sleeve and its cuff, the seam and shade where the arm meets the body,
// and the arm's shadow. The frame comes from tools/hand-frame.mjs.
//   mirror 1: the same arm again, mirrored, on the other side (two waving hands)
//   extend N: the sleeve runs N kit units further down, so its rounded end sits
//             behind whatever ends the body in the scene
// Usage: node tools/hands-still.cjs <figure.svg> <hands.json> <moment> <frame.json> <mirror 0|1> <extend> <out.svg>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const [figFile, handsFile, moment, frameFile, mirror, extend, out] = process.argv.slice(2);
const H = JSON.parse(fs.readFileSync(handsFile, 'utf8'));
const F = JSON.parse(fs.readFileSync(frameFile, 'utf8'));
const E = +extend || 0;
// the sleeve's last side and its rounded end, moved down by E
F.sleeve = F.sleeve.replace(/L(-?[\d.]+) (-?[\d.]+)C(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)Z$/,
  (m, a, b, c, d, e, f, g, h) => `L${a} ${+b + E}C${c} ${+d + E} ${e} ${+f + E} ${g} ${+h + E}Z`);

function apply(H, F, moment, mirror) {
  const svg = document.querySelector('svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-hands', '1'); g.setAttribute('transform', H.stageT);
  g.innerHTML = H.layer.replace(/(id="|url\(#|href="#)cd\d+/g, (_m, a) => `${a}mhx`);
  svg.appendChild(g);
  const i = ['wave', 'heart', 'chin'].indexOf(moment), art = { wave: 'wave', heart: 'heart3', chin: 'chin' }[moment];
  const q = (s) => g.querySelector(s);
  const hand = q(`[data-hand="${art}"]`), sleeve = g.querySelectorAll('[data-arm]')[i], cuff = g.querySelectorAll('[data-cuff]')[i];
  [hand, sleeve, cuff].forEach((e) => e && e.setAttribute('display', 'inline'));
  hand.setAttribute('transform', F.transform);
  const clip = q(`#mhxh${i} path`); if (clip) clip.setAttribute('d', F.clip);
  sleeve.setAttribute('d', F.sleeve);
  const cc = q(`#mhxc${i} path`); if (cc) cc.setAttribute('d', F.sleeve);
  cuff.setAttribute('d', F.cuff);
  const strip = (el, gr, st) => { if (!el) return; el.setAttribute('display', st.on ? 'inline' : 'none'); if (!st.on) return; el.setAttribute('d', st.d); if (gr) ['x1', 'y1', 'x2', 'y2'].forEach((k) => gr.setAttribute(k, String(st[k]))); };
  strip(q(`path[fill="url(#mhxsg${i})"]`), q(`#mhxsg${i}`), F.shadow);
  strip(q(`path[stroke="url(#mhxmg${i})"]`), q(`#mhxmg${i}`), F.seam);
  if (moment === 'wave' && F.armShadow && F.armShadow.on) {
    const as = q('[data-armshadow]'); if (as) as.setAttribute('display', 'inline');
    const n = Math.max(1, g.querySelectorAll('[data-hand]').length);
    Array.from(g.querySelectorAll('[data-shadow-hand]')).filter((_e, k) => k % n === 0).forEach((hg) => { hg.setAttribute('display', 'inline'); hg.setAttribute('transform', `matrix(${F.armShadow.matrix.join(' ')})`); });
  }
  if (mirror === '1') {
    const w = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    w.setAttribute('transform', 'translate(320 0) scale(-1 1)');
    w.appendChild(g.cloneNode(true)); svg.appendChild(w);
  }
  document.getElementById('out').textContent = new XMLSerializer().serializeToString(svg);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hands-'));
const html = path.join(dir, 'page.html');
fs.writeFileSync(html, `<!doctype html><body>${fs.readFileSync(figFile, 'utf8')}<pre id="out"></pre><script>(${apply.toString()})(${JSON.stringify(H)}, ${JSON.stringify(F)}, ${JSON.stringify(moment)}, ${JSON.stringify(mirror)});</script></body>`);
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${path.join(dir, 'profile')}`, '--dump-dom', `file://${html}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
fs.rmSync(dir, { recursive: true, force: true });
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m || !m[1].trim()) throw new Error('no output from the page');
fs.writeFileSync(out, m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
console.log('wrote', out);
