// A still of a kit figure's face rig (sw-characters web/out/face-rig/<name>.json,
// made by sw-characters web/scripts/export_face_rig.mjs) with one of the kit's
// faces and a gaze, written the way the site's RigFace paints a face (the rest
// face's attributes + the pupils' gaze offset). Makes inputs/faces/*.svg.
// Faces: calm smile laugh proud curious listening thinking warm.
// Usage: node tools/rig-still.cjs <name> <face> <gx> <gy> <out.svg>
// SW_CHARACTERS: the sw-characters checkout (default: next to this repo).
const fs = require('fs');
const path = require('path');
const SW_CHARACTERS = process.env.SW_CHARACTERS || path.resolve(__dirname, '../../../../sw-characters');

function loadRig(name) {
  return JSON.parse(fs.readFileSync(path.join(SW_CHARACTERS, 'web/out/face-rig', `${name}.json`), 'utf8'));
}

function still(name, face, gx = 0, gy = 0) {
  const rig = loadRig(name);
  const keys = {};
  const add = (set) => { for (const i in set) keys[i] = Array.from(new Set([...(keys[i] || []), ...Object.keys(set[i])])); };
  Object.values(rig.rest).forEach(add); rig.eyes.lid1.forEach(add); rig.eyes.lid0.forEach(add);
  const state = { ...rig.rest[face] };
  const pupils = rig.eyeIdx.filter((i) => /^translate\(/.test((rig.eyes.lid1[0][i] || {}).transform || ''));
  for (const i of pupils) {
    const n = (rig.eyes.lid1[0][i].transform.match(/-?[\d.]+/g) || [0, 0]).map(Number);
    state[i] = { ...(state[i] || {}), transform: `translate(${(n[0] + gx).toFixed(2)} ${((n[1] || 0) + gy).toFixed(2)})` };
    keys[i] = Array.from(new Set([...(keys[i] || []), 'transform']));
  }
  let html = rig.svg;
  for (const i in state) {
    html = html.replace(new RegExp(`<(\\w+)([^>]*?) data-i="${i}"(/?)>`), (_m, tag, attrs, close) => {
      let s = attrs;
      for (const k of keys[i] || []) {
        s = s.replace(new RegExp(` ${k}="[^"]*"`), '');
        const v = state[i][k];
        if (v !== undefined) s += ` ${k}="${v}"`;
      }
      return `<${tag}${s} data-i="${i}"${close}>`;
    });
  }
  return { svg: html, faces: Object.keys(rig.rest), pupils };
}
module.exports = { still, loadRig };
if (require.main === module) {
  const [name, face, gx, gy, out] = process.argv.slice(2);
  fs.writeFileSync(out, still(name, face, +gx || 0, +gy || 0).svg);
}
