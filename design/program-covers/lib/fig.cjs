// A kit figure for a cover: one of the cast's SVGs (inputs/avatars, or a face
// still from inputs/faces), optionally on its kit blob (inputs/blobs.json).
// The kit cuts each body to its blob's curve; `blob: false` lifts that cut so
// the body runs on below its box and a scene edge ends it under the collar.
const fs = require('fs');
const path = require('path');

const INPUTS = path.join(__dirname, '../inputs');
const BLOBS = JSON.parse(fs.readFileSync(path.join(INPUTS, 'blobs.json'), 'utf8'));

// The avatar's own markup, ids made unique with `id`.
function avatarInner(name, id, uncut = false, file = null) {
  let svg = fs.readFileSync(file || path.join(INPUTS, 'avatars', `${name}.svg`), 'utf8');
  // uncut: the kit's own body, not cut to the blob, so it runs on below the
  // box (to about y 345) and an edge in the scene can end it under the collar.
  if (uncut) svg = svg.replace(/<clipPath id="([a-z0-9]+cr)">[\s\S]*?<\/clipPath>/g, (m, cid) => `<clipPath id="${cid}"><rect x="-4000" y="-4000" width="9000" height="9000"/></clipPath>`);
  svg = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  svg = svg.replace(/\bid="([^"]+)"/g, `id="${id}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${id}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${id}-$1"`);
  return svg;
}

function blobFill(b, id, a, bb, kind, cell) {
  const k = kind ?? b.kind, A = a ?? b.a, B = bb ?? b.b ?? A, c = (cell ?? b.cell) || 44;
  if (k === 'flat') return { defs: '', fill: A };
  let p;
  if (k === 'vstripe') p = `<rect width="${c}" height="${c}" fill="${A}"/><rect width="${c / 2}" height="${c}" x="${c / 2}" fill="${B}"/>`;
  else if (k === 'hstripe') p = `<rect width="${c}" height="${c}" fill="${A}"/><rect width="${c}" height="${c / 2}" y="${c / 2}" fill="${B}"/>`;
  else if (k === 'check') p = `<rect width="${c}" height="${c}" fill="${A}"/><rect width="${c / 2}" height="${c / 2}" fill="${B}"/><rect x="${c / 2}" y="${c / 2}" width="${c / 2}" height="${c / 2}" fill="${B}"/>`;
  else if (k === 'dots') p = `<rect width="${c}" height="${c}" fill="${A}"/><circle cx="${c / 2}" cy="${c / 2}" r="${c * 0.27}" fill="${B}"/>`;
  else p = `<rect width="${c}" height="${c}" fill="${A}"/><path d="M0 0H${c}M0 0V${c}" stroke="${B}" stroke-width="4"/>`;
  return { defs: `<pattern id="${id}-pat" width="${c}" height="${c}" patternUnits="userSpaceOnUse">${p}</pattern>`, fill: `url(#${id}-pat)` };
}

/**
 * The figure on its blob. (cx, by) = where the blob's centre-bottom of the
 * 320 x 310 avatar box lands; w = width of that box on the cover.
 * opts: { a, b, kind, cell } blob colours; { blob: false } skips the blob;
 * { flip: true } mirrors the whole figure.
 */
function figure(name, cx, by, w, id, opts = {}) {
  const s = w / 320;
  const b = BLOBS[opts.blobName || name];
  let out = '';
  if (b && opts.blob !== false) {
    const f = blobFill(b, id, opts.a, opts.b, opts.kind, opts.cell);
    const shapes = `<path d="${b.d}"/>${b.top ? `<path d="${b.top}"/>` : ''}${b.dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}`;
    out += `<defs>${f.defs}</defs><g fill="${f.fill}">${shapes}</g>`;
  }
  out += `<svg x="0" y="0" width="320" height="310" viewBox="0 0 320 310" overflow="visible">${avatarInner(name, id, opts.uncut ?? opts.blob === false, opts.file)}</svg>`;
  const flip = opts.flip ? ` translate(320 0) scale(-1 1)` : '';
  const rot = opts.tilt ? ` rotate(${opts.tilt} 160 200)` : '';
  return `<g transform="translate(${cx - w / 2} ${by - 310 * s}) scale(${s})${flip}${rot}">${out}</g>`;
}

module.exports = { figure, BLOBS, avatarInner };
