// Face morph: one face rig for all expressions. Port of web/scripts/live.js (faceData, faceModel, faceTarget, faceAt, setExp, applyFace).
// A face is numbers (brow 12, mouth 24 + stroke width, teeth 16 + how open, tongue, cheek, blush, eyes open or closed arc). faceAt() mixes two faces for a time since the change started.
// Nothing cross-fades: a part that is in two faces is one element whose numbers move. All functions are pure (no state), safe on the phone's UI thread.
// To add an expression: add its face parts to the kit and its name to FX in core/scripts/gen-look.mjs, then run it. No code changes (see README).
import { sio } from './ease.js';
import { FACE_MS } from './data/moments.js';

/** The numbers of one expression (faceTarget in live.js). */
                                                                                                                                                                
/** The face rig of a look (made by core/scripts/gen-look.mjs from the kit): the numbers of each expression and the parts that do not change (as SVG text). */
                          
                                            
                                                                                                                                                                                      
                                                                                                  
 
/** A face between two expressions. lid: 0 open .. 1 closed (the lid of the face change). line: null = open eye, 0..1 = the closed eye (0 = flat lid line, 1 = the arc). still = a settled expression. */
                                                                                                    
/** What a drawer draws for one frame: path text, matrices and 0/1 switches. */
                            
                                                 
                                                                                                                                                             
 
/** The rig plus every settled expression, made once (JS thread). */
                                                                                           
/** The state of the face over time: from (the face when the last change started), to (a name), t0 (ms, when it started). */
                                                                   

const f1 = (v        ) => { 'worklet'; return v.toFixed(1); };
const cl01 = (v        ) => { 'worklet'; return v < 0 ? 0 : v > 1 ? 1 : v; };
const eio = (t        ) => { 'worklet'; return t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function lerpA(a          , b          , t        )           { 'worklet'; const o           = []; for (let i = 0; i < a.length; i++) o.push(a[i] + (b[i] - a[i]) * t); return o; }

/** live.js faceAt(from, to, ms): the face `ms` after a change started.
 *  brow 0-200 (leads; 8% past at 150, then settles) | mouth, teeth, tongue 40-240 | cheek, blush 30-330 | eyes: open -> arc: lid closes 40-130, then the lid line bends into the arc 130-250;
 *  arc -> open: 40-160 the arc flattens into the lid line, then the eye opens 160-280 (6% past open at 245, then settles). */
export function faceAt(a       , b       , ms        )        {
  'worklet';
  const tb = cl01(ms / 200), pb = eio(Math.min(1, tb / .75)) + (tb > .5 ? .08 * Math.sin(Math.PI * (tb - .5) / .5) : 0), p = sio((ms - 40) / 200), pc = sio((ms - 30) / 300), e = ms - 40;
  const v        = { f: b.f, brow: lerpA(a.brow, b.brow, pb), mouth: lerpA(a.mouth, b.mouth, p), sw: a.sw + (b.sw - a.sw) * p, teeth: a.open && b.open ? lerpA(a.teeth, b.teeth, p) : (b.open ? b.teeth : a.teeth),
    open: a.open + (b.open - a.open) * p, tongue: a.tongue + (b.tongue - a.tongue) * p, cheek: a.cheek + (b.cheek - a.cheek) * pc, blush: a.blush + (b.blush - a.blush) * pc, arc: b.arc, lid: 0, line: null, still: false };
  // The eyes are ONE number s along a path: 0 = open, 1 = lid shut (flat lid line), 2 = the closed arc. s0 = where the eyes are NOW (a), so a change that starts in the middle of another one carries the lid
  // (and the line) through: nothing jumps (rule F-seamless). From a settled face s0 is 0 or 2 and the timing is exactly the studio's.
  const s0 = a.line !== null ? 1 + a.line : a.lid, lz = s0 >= 2 ? 0 : 1;
  if (b.arc) {
    if (s0 >= 1) { v.lid = lz; v.line = (s0 - 1) + (2 - s0) * (s0 >= 2 ? 0 : sio(e / 120)); }
    else if (e < 90) v.lid = s0 + (1 - s0) * sio(e / 90);
    else { v.lid = 1; v.line = sio((e - 90) / 120); }
  } else if (s0 > 1) {
    if (e < 120) { v.lid = lz; v.line = (s0 - 1) * (1 - sio(e / 120)); } else { const t = cl01((e - 120) / 120); v.lid = 1 - (sio(Math.min(1, t / .7)) + (t > .45 ? .06 * Math.sin(Math.PI * (t - .45) / .55) : 0)); }
  } else if (s0 !== 0) { const t = cl01(e / 120); v.lid = s0 * (1 - (sio(Math.min(1, t / .7)) + (t > .45 ? .06 * Math.sin(Math.PI * (t - .45) / .55) : 0))); }
  if (ms >= FACE_MS) { v.lid = 0; v.line = b.arc ? 1 : null; }
  return v;
}

/** live.js applyFace(): the numbers of a face as path text, matrices and switches. */
export function faceFrame(rig         , v       )            {
  'worklet';
  const b = v.brow, m = v.mouth, t = v.teeth;
  let d = `M${f1(m[0])} ${f1(m[1])}`; for (let i = 2; i < 24; i += 6) d += `C${f1(m[i])} ${f1(m[i + 1])} ${f1(m[i + 2])} ${f1(m[i + 3])} ${i === 20 ? f1(m[0]) : f1(m[i + 4])} ${i === 20 ? f1(m[1]) : f1(m[i + 5])}`;
  const bs = .4 + .6 * v.blush, tg = v.tongue, bl             = [];
  for (let i = 0; i < rig.el.blush.length; i++) { const q = rig.el.blush[i]; bl.push([bs, 0, 0, bs, q.cx * (1 - bs), q.cy * (1 - bs)]); }
  return {
    browD: `M${f1(b[0])} ${f1(b[1])}Q${f1(b[2])} ${f1(b[3])} ${f1(b[4])} ${f1(b[5])}M${f1(b[6])} ${f1(b[7])}Q${f1(b[8])} ${f1(b[9])} ${f1(b[10])} ${f1(b[11])}`,
    mouthD: d + 'Z', mouthSw: Math.max(.01, v.sw),
    teethO: v.open > .12 ? Math.min(1, (v.open - .12) / .2) : 0,  // the teeth fade in and out with the mouth, so a closing mouth never leaves a strip of teeth
    teethD: `M${f1(t[0])} ${f1(t[1])}L${f1(t[2])} ${f1(t[3])}L${f1(t[4])} ${f1(t[5])}Q${f1(t[6])} ${f1(t[7])} ${f1(t[8])} ${f1(t[9])}L${f1(t[10])} ${f1(t[11])}Q${f1(t[12])} ${f1(t[13])} ${f1(t[14])} ${f1(t[15])}Z`,
    teethM: [1, 0, 0, v.open, 0, t[1] * (1 - v.open)],                        // teeth grow down from the top edge of the mouth
    tongueO: tg > .02 ? 1 : 0, tongueM: [tg, 0, 0, tg, 500 * (1 - tg), 742 * (1 - tg)],   // the tongue grows from the floor of the mouth
    cheekO: v.cheek > .02 ? 1 : 0, cheekM: [1, 0, 0, 1, 0, 50 * (1 - v.cheek)],         // the cheek lift slides up from the cheek
    blushO: v.blush, blushM: bl };
}

/** Once (JS thread): the rig and every settled expression. */
export function faceKit(rig         )          {
  const rest                  = {};
  for (const f of rig.names) { const T = rig.t[f], v        = { f, ...T, lid: 0, line: T.arc ? 1 : null, still: true }; rest[f] = { v, r: faceFrame(rig, v) }; }
  return { rig, rest };
}
/** The face of a moment: from one expression to another, `ms` after the change started (the moment's own timing: solve.ts). */
export function faceMoment(fk         , from        , to        , ms        )        {
  'worklet';
  return ms >= FACE_MS ? fk.rest[to].v : faceAt(fk.rest[from].v, fk.rest[to].v, ms);
}
/** The face is a chain of changes. faceStill() = settled on `name`. */
export function faceStill(fk         , name        )             { return { from: fk.rest[name].v, to: name, t0: -1e9 }; }
/** The face now (t in ms, same clock as t0). */
export function faceNow(fk         , ch            , t        )        {
  'worklet';
  const ms = t - ch.t0; return ms >= FACE_MS ? fk.rest[ch.to].v : faceAt(ch.from, fk.rest[ch.to].v, ms);
}
/** Change to `name` at time t (live.js setExp). A change that starts while another one runs starts from the face as it is now. */
export function faceGo(fk         , ch            , name        , t        )             {
  'worklet';
  if (ch.to === name) return ch;
  const c = faceNow(fk, ch, t);
  return { from: { ...c, arc: c.line !== null ? 1 : 0 }, to: name, t0: t };
}
/** The draw numbers of a face: the cached ones for a settled face. */
export function faceOut(fk         , v       )            { 'worklet'; return v.still ? fk.rest[v.f].r : faceFrame(fk.rig, v); }
