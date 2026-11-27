// Stress scene (phone prototype only): Palms up and Wave hello back to back, hair swish (head kicks every 0.6 s) and a hop of the whole avatar.
// The hair springs run once in prepareIdle() with the moment's head, the kicks and the hop as input, so the hair follows the moment's head too.
                                                   
import { eyeFrame, headMatrix, idleValues, prepareIdle } from './idle.js';
                                       
import { solveFrame } from './solve.js';
import { armShadowM } from './shadow.js';
                                           

                                                                                                
export const KICK_MS = 600, HOP_EVERY = 1800, HOP_H = 35;
const out = (t        ) => { 'worklet'; const u = 1 - t; return 1 - u * u * u; };
/** fx.js hop(): 130 ms squash (no move), up 55% of 620 ms with softOut, down 50% with t*t, 140 ms landing. Translate only: stage units, up is negative. */
export function hopY(tMs        )         {
  'worklet';
  const m = tMs % HOP_EVERY - 130; if (m < 0) return 0;
  const up = 620 * .55, dn = 620 * .5;
  if (m < up) { const t = m / up; return -HOP_H * out(t * (.75 + .25 * t)); }
  if (m < up + dn) { const t = (m - up) / dn; return -HOP_H * (1 - t * t); }
  return 0;
}
function momentAt(S                                           , tMs        )             {
  'worklet';
  const m = tMs % S.cyc; return m < S.a.totalMs ? solveFrame(S.a, m) : solveFrame(S.b, m - S.a.totalMs);
}
export function prepareStress(look      , a          , b          , seconds = 60)          {
  const cyc = a.totalMs + b.totalMs, S = { a, b, cyc };
  const idle = prepareIdle(look, { seconds, seed: 11, drive: (t, i) => { const f = momentAt(S, t); return { tilt: f.headTilt, nod: f.nod, hop: hopY(t), kick: i % 36 === 0 }; } });
  return { idle, a, b, cyc, totalMs: seconds * 1000 };
}
/** One frame: the moment (hands, face, head) + the idle (blink, breath, head springs with kicks, hair) + hop (extra field, stage units). */
export function solveStress(S         , tMs        )             {
  'worklet';
  const f = momentAt(S, tMs), v = idleValues(S.idle, tMs), tilt = f.headTilt + v.tilt, nod = f.nod + v.nod;
  const o      = { ...f, headTilt: tilt, nod, headMatrix: headMatrix(tilt, nod), browDip: 2 * v.brow, breathBody: v.breathBody, breathCollar: v.breathCollar, blink: v.blink, eyes: eyeFrame(S.idle.eg, v.blink, v.blinkLow, f.gazeX, f.gazeY), hair: v.hair, hop: hopY(tMs) };
  if (f.shadowM) o.shadowM = armShadowM(S.idle.sh, { shoulderLift: f.shoulderLift, breathBody: v.breathBody, breathCollar: v.breathCollar, headMatrix: o.headMatrix });
  return o;
}
