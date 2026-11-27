// One frame of a kit hand moment (beatWave + handFrame, the kit's hand maths as
// sw-characters web/scripts/export_hands.mjs exports it: tools/hands-core.generated.ts)
// for a figure's hand rig (inputs/hands/<name>.json). Writes the frame as JSON.
// Usage: node tools/hand-frame.mjs inputs/hands/braids.json wave 1170 inputs/hands/braids-wave-1170.json
import { beatWave, beatHeart, beatChin, handFrame } from './hands-core.generated.ts';
import fs from 'node:fs';
const [rigFile, moment, t, out] = process.argv.slice(2);
const H = JSON.parse(fs.readFileSync(rigFile, 'utf8'));
const M = H[moment], beat = { wave: beatWave, heart: beatHeart, chin: beatChin }[moment](+t);
fs.writeFileSync(out, JSON.stringify(handFrame(M.hands[0], M.variantA, beat, true, H.shoulder, M.shadow)));
console.log('wrote', out);
