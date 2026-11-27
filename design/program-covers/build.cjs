// Builds the app's program covers (app/assets/program-covers/<program>.png,
// 900 x 1200) from the scenes in scenes/, with the picks the founder approved
// on 2026-11-27. See README.md.
// Usage: node design/program-covers/build.cjs [program ...] [--out <dir>]
const fs = require('fs');
const path = require('path');
const { renderSvg } = require('./lib/render.cjs');

/** Each program and the scene variant that ships (see README.md). */
const COVERS = {
  interview_ready: 'noblob',
  hard_conversations: 'blob',
  panic_button: 'high',
  understanding_your_voice: 'noblob',
  breaking_thought_traps: 'break',
  bouncing_back: 'noblob',
  dating_intimacy: 'noblob',
  speech_toolkit: 'noblob',
  art_of_disclosure: 'noblob',
  word_swap: 'noblob',
};

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? path.resolve(args[oi + 1]) : path.join(__dirname, '../../app/assets/program-covers');
const want = args.filter((a, i) => !a.startsWith('--') && (oi < 0 || i !== oi + 1));
fs.mkdirSync(out, { recursive: true });
for (const program of want.length ? want : Object.keys(COVERS)) {
  if (!COVERS[program]) throw new Error(`No cover called ${program}`);
  const svg = require(`./scenes/${program}.cjs`)(COVERS[program]);
  renderSvg(svg, path.join(out, `${program}.png`), 900, 1200);
  console.log('built', program);
}
