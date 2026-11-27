// Drawing helpers for the program covers: flat shapes with the kit's ink outline.

const W = 900;
const H = 1200;
const INK = '#242329';
const CREAM = '#F3EDE2';
const ORANGE = '#FF9040';

// Outline attributes. Foreground 4.5, midground 3.5, far 2.5.
const o = (w = 4.5, extra = '') => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}`;
const line = (d, color = INK, w = 4.5, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const shape = (d, fill, w = 4.5, extra = '') => `<path d="${d}" fill="${fill}" ${w ? o(w) : ''} ${extra}/>`;

// A blob made of circles (and optional rects) with an outline on the outer edge only:
// stroked pass first, fill pass on top.
function blob(parts, fill, w = 4.5, color = INK) {
  const el = (p, stroke) => {
    const s = stroke ? `stroke="${color}" stroke-width="${w * 2}"` : '';
    if (p.length === 3) return `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${fill}" ${s}/>`;
    return `<rect x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}" rx="${p[4] || 0}" fill="${fill}" ${s}/>`;
  };
  return `<g>${w ? parts.map(p => el(p, true)).join('') : ''}${parts.map(p => el(p, false)).join('')}</g>`;
}

// Puffy cloud with a flat base, width w, base line at y.
function cloud(x, y, w, fill = CREAM, sw = 4, shade = null) {
  const r = w / 5;
  const parts = [
    [x + r * 1.1, y - r * 0.75, r * 0.9],
    [x + r * 2.3, y - r * 1.35, r * 1.3],
    [x + r * 3.6, y - r * 0.95, r * 1.0],
    [x + r * 4.2, y - r * 0.5, r * 0.7],
    [x + r * 0.6, y - r * 0.45, r * 0.6],
    [x + r * 0.4, y - r * 0.9, w - r * 0.8, r * 0.9, r * 0.45],
  ];
  let out = blob(parts, fill, sw);
  if (shade) out += `<path d="M${x + r * 0.5} ${y - r * 0.3} Q${x + w / 2} ${y - r * 0.05} ${x + w - r * 0.6} ${y - r * 0.3}" fill="none" stroke="${shade}" stroke-width="${r * 0.28}" stroke-linecap="round"/>`;
  return out;
}

// Four-point sparkle.
const sparkle = (x, y, r, fill = CREAM, extra = '') =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}" ${extra}/>`;

const dots = (pts, fill = CREAM, op = 1) => `<g fill="${fill}" opacity="${op}">${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;

// Flying bird, a soft "m" stroke.
const bird = (x, y, s, color = INK, w = 4) =>
  line(`M${x - s} ${y} Q${x - s * 0.5} ${y - s * 0.7} ${x} ${y} Q${x + s * 0.5} ${y - s * 0.7} ${x + s} ${y}`, color, w);

// Simple deterministic random for scatter.
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function scatter(seed, n, x0, y0, x1, y1, rMin, rMax) {
  const r = rng(seed);
  return Array.from({ length: n }, () => [Math.round(x0 + r() * (x1 - x0)), Math.round(y0 + r() * (y1 - y0)), +(rMin + r() * (rMax - rMin)).toFixed(1)]);
}

const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o2, c]) => `<stop offset="${o2}" stop-color="${c}"/>`).join('')}</linearGradient>`;

function cover(defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${defs}<clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath></defs>
<g clip-path="url(#frame)">
${body}
</g>
</svg>`;
}

// Pine tree: stacked triangles.
function pine(x, base, h, fill, sw = 0, trunk = null) {
  const w = h * 0.5;
  const t = trunk ? `<rect x="${x - w * 0.07}" y="${base - h * 0.12}" width="${w * 0.14}" height="${h * 0.14}" fill="${trunk}"/>` : '';
  const tier = (top, bot, half) => `M${x} ${top} L${x + half} ${bot} L${x - half} ${bot}Z`;
  const d = tier(base - h, base - h * 0.45, w * 0.3) + tier(base - h * 0.75, base - h * 0.2, w * 0.4) + tier(base - h * 0.5, base - h * 0.08, w * 0.5);
  return t + `<path d="${d}" fill="${fill}" ${sw ? o(sw) : ''}/>`;
}

// Round tree: lollipop canopy blob on a trunk.
function roundTree(x, base, h, fill, trunk, sw = 3.5) {
  const r = h * 0.3;
  return `<rect x="${x - h * 0.04}" y="${base - h * 0.45}" width="${h * 0.08}" height="${h * 0.45}" fill="${trunk}" ${sw ? o(sw) : ''}/>` +
    blob([[x, base - h * 0.7, r], [x - r * 0.7, base - h * 0.55, r * 0.75], [x + r * 0.7, base - h * 0.56, r * 0.8]], fill, sw);
}

module.exports = { W, H, INK, CREAM, ORANGE, o, line, shape, blob, cloud, sparkle, dots, bird, rng, scatter, grad, cover, pine, roundTree };

// Point on a quadratic bezier.
function qpt(p0, c, p1, t) {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
  return [a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]];
}
// A hanging wire between two points with sag.
function wire(p0, p1, sag, color = '#14151C', w = 3) {
  const c = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + sag];
  return { d: `<path d="M${p0[0]} ${p0[1]} Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}" fill="none" stroke="${color}" stroke-width="${w}"/>`, at: t => qpt(p0, c, p1, t) };
}
// Perched bird silhouette; dir 1 faces right.
function perched(x, y, s, dir = 1, fill = '#14151C') {
  const f = dir;
  return `<g transform="translate(${x} ${y}) scale(${f * s} ${s})" fill="${fill}">` +
    `<ellipse cx="0" cy="-12" rx="15" ry="11"/><circle cx="11" cy="-24" r="8"/><path d="M18 -26 L27 -23 L18 -21Z"/><path d="M-12 -10 L-28 -2 L-24 -12Z"/>` +
    `<path d="M-2 -2 L-2 2 M4 -2 L4 2" stroke="${fill}" stroke-width="2.5"/></g>`;
}
module.exports.qpt = qpt;
module.exports.wire = wire;
module.exports.perched = perched;
