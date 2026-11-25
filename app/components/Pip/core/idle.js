// Idle life: blink, gaze (glance), breath, brow dip, slow sway, and the hair springs that follow the head.
// Port of web/scripts/live.js: S, startBlink, randGlance, frame(dt) (timers, BLINK, blinkAt, springs, breath), lidLine, drawEyes (the numbers only), and web/scripts/hair.js (hair.ts).
// The web draws idle with random timers and Math.random. Here prepareIdle() runs the same timers with a seeded random and a fixed 1/60 s step ONCE (JS thread)
// and keeps the answers as plain numbers. solveIdle(P, tMs) then reads them: no state, safe on the UI thread. The idle loops after P.totalMs.
                                                                        
import { clamp } from './ease.js';
import { BLINK, HEAD_PIVOT, SPRINGS } from './data/moments.js';
import { faceKit, faceOut } from './face.js';
                                                
import { armShadowM, shadowSet } from './shadow.js';
                                             
import { hairSim, hairStep, hairState, planHair } from './hair.js';
                                          
                                           

                                                                                                                  
/** Prepared idle: the springs answered once per 1/60 s for `seconds` seconds. */
                        
                                                                                         
                                                                                                         
                                                                                                                                                     
                                                                                                                                                                                                                                      
 

const LID_Y = .8, SAG = 14, LASH = 3, LASH_SHUT = 14, cl01 = (v        ) => { 'worklet'; return v < 0 ? 0 : v > 1 ? 1 : v; };
const f1 = (v        ) => { 'worklet'; return v.toFixed(1); };
const eyeSpan = (g         ) => { 'worklet'; const top = g.cy - g.ry, bot = g.wcy + g.wry; return { top, bot, shut: top + (bot - top) * LID_Y }; };
const eyeHalf = (g         , y        ) => { 'worklet'; const a = 1 - Math.pow((y - g.cy) / g.ry, 2), b = 1 - Math.pow((y - g.wcy) / g.wry, 2); return Math.max(a > 0 ? g.rx * Math.sqrt(a) : 0, b > 0 ? g.wrx * Math.sqrt(b) : 0); };
export const EYES_FULL = 'M-1000 -1000H2000V2000H-1000Z';        // no cut: the whole eye shows

/** live.js drawEyes() with the eyes open or closing by a blink (no closed-eye arc): where the lid edges and the lash line are, as numbers and path text.
 *  cu / cl = how far the upper / lower lid is closed (0..1). The eyeball keeps its size (rule M10): the eye group is CUT to the open part between the lid edges. */
export function eyeFrame(eg           , cu        , cl        , gx        , gy        , arc                  = null, arcSw = 0, k                = null)           {
  'worklet';
  const shut = k !== null || (cu >= .999 && cl >= .999), cut = !shut && (cu > .001 || cl > .001); let cutD = EYES_FULL, lidD = '';
  if (cut) { cutD = ''; for (let i = 0; i < eg.length; i++) { const g = eg[i], sp = eyeSpan(g), eu = sp.top - 12 + (sp.shut - sp.top + 12) * cu, el = sp.bot + 14 - (sp.bot + 14 - sp.shut) * cl, x0 = f1(g.cx - 80), x1 = f1(g.cx + 80);
    cutD += `M${x0} ${f1(eu - SAG)}Q${f1(g.cx)} ${f1(eu + SAG)} ${x1} ${f1(eu - SAG)}L${x1} ${f1(el - SAG)}Q${f1(g.cx)} ${f1(el + SAG)} ${x0} ${f1(el - SAG)}Z`;
    // the same two lid edges as SKIN SHAPES (for drawers where a moving clip does not redraw, e.g. Android): upper lid = above the upper edge, lower lid = below the lower edge
    if (cu > .001) lidD += `M${x0} ${f1(Math.min(sp.top - 3, eu - SAG - 2))}H${x1}V${f1(eu - SAG)}Q${f1(g.cx)} ${f1(eu + SAG)} ${x0} ${f1(eu - SAG)}Z`;
    if (cl > .001) lidD += `M${x0} ${f1(el - SAG)}Q${f1(g.cx)} ${f1(el + SAG)} ${x1} ${f1(el - SAG)}V${f1(Math.max(sp.bot + 5, el + SAG + 1))}H${x0}Z`; } }
  const cuL = shut ? 1 : cu; let wide = 99, lashD = '', o           = [];                      // lidLine(): the lash line of both eyes, 12 numbers (2 curves)
  for (let i = 0; i < eg.length; i++) { const g = eg[i], sp = eyeSpan(g), eu = sp.top - 12 + (sp.shut - sp.top + 12) * cuL, hw = Math.max(0, eyeHalf(g, eu) - 2), yh = eu - SAG * Math.pow(hw / 80, 2);
    if (hw < wide) wide = hw; let q = [g.cx - hw, yh, g.cx, 2 * eu - yh, g.cx + hw, yh];
    if (k && arc) { const j = i * 6; q = q.map((v, n) => v + (arc[j + n] - v) * k); }                      // closed eye of Laugh / Proud: the lid line bends into the arc (live.js lidLine, k)
    o = o.concat(q); }
  const lashOn = shut || wide > 8;
  if (lashOn) lashD = `M${f1(o[0])} ${f1(o[1])}Q${f1(o[2])} ${f1(o[3])} ${f1(o[4])} ${f1(o[5])}M${f1(o[6])} ${f1(o[7])}Q${f1(o[8])} ${f1(o[9])} ${f1(o[10])} ${f1(o[11])}`;
  return { on: !shut, cutD, lidD, lashOn, lashD, lashSw: LASH + (LASH_SHUT - LASH) * cl01((cuL - .6) / .4) + (k && arc ? (arcSw - (LASH + (LASH_SHUT - LASH) * cl01((cuL - .6) / .4))) * k : 0), pupilX: gx * 11, pupilY: gy * 8 + 5 * cu };      // pupilY: the pupil drops 5 units while the lid comes down
}
const blinkAt = (K                                                , t        ) => t <= 0 ? 0 : t < K.c ? K.m * Math.pow(t / K.c, 2) : t < K.c + K.h ? K.m : t < K.c + K.h + K.o ? K.m * Math.pow(1 - (t - K.c - K.h) / K.o, 2) : 0;

function rng(seed        ) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Runs live.js frame() for `seconds` seconds at 60 Hz. quiet = the face is calm or thinking (slow blinks). */
export function prepareIdle(look      , opts                                                                                                                                                                      = {})        {
  const seconds = opts.seconds || 120, quiet = opts.quiet !== false, rand = rng(opts.seed || 7), rnd = (a        , b        ) => a + rand() * (b - a), dt = 1 / 60, n = Math.round(seconds * 60);
  const sp = () => ({ x: 0, v: 0, t: 0 }), spring = (s                          , target        , k        , c        ) => { const a = k * (target - s.x) - c * s.v; s.v += a * dt; s.x += s.v * dt; };
  const S = { rot: sp(), ny: sp(), gx: sp(), gy: sp(), brow: sp(), blink: 0, blinkLow: 0, blinkT: -1, blinkDouble: false, blinkKind: 'normal'                      , sway: 0, next: { blink: 1.2, glance: 1.8, sway: 3.5 }, time: 0, phase: 0 };
  const startBlink = (d         , kind                    ) => { if (S.blinkT >= 0) { if (d) S.blinkDouble = true; return; } S.blinkT = 0; S.blinkDouble = d; S.blinkKind = kind; };
  const randGlance = () => { const x0 = S.gx.t; if (rand() < .3) { S.gx.t = 0; S.gy.t = 0; } else { S.gx.t = rnd(-1, 1); S.gy.t = rnd(-.7, .6); } S.rot.t = S.gx.t * 1.1 + S.sway; if (Math.abs(S.gx.t - x0) > .9) startBlink(false, 'normal'); };   // a big look to the side comes with a blink
  const items                                             = [];
  for (const l of look.layers) if (l.hairItems) for (const it of l.hairItems) items.push(it.tag === 'path' ? { d: it.d } : { cx: it.cx, cy: it.cy });
  let plan                  = null; if (look.hair && opts.hair !== false && items.length) { plan = planHair(items, { id: look.hair.id, flags: look.hair.flags, hasHat: !!look.hat, gain: look.hair.gain == null ? 1 : look.hair.gain }); if (!plan.moving || !plan.gain) plan = null; }
  const P        = { stepMs: SPRINGS.stepMs, n, totalMs: n * SPRINGS.stepMs, eg: look.eyes.eg, fk: faceKit(look.face), blink: [], blinkLow: [], brow: [], rot: [], hy: [], gx: [], gy: [], by: [], hair: plan, sh: shadowSet(look), hairN: [], hairV: [], hairS: [], hairVt: [], hairVer: [] };
  const H = hairSim(); let prev                   = null, last                   = null, ver = 0;
  for (let i = 0; i < n; i++) {
    S.time += dt; const nx = S.next; nx.blink -= dt; nx.glance -= dt; nx.sway -= dt;
    if (nx.blink <= 0) { const r = rand(); startBlink(r < .18, r > .88 ? 'half' : quiet && r > .6 ? 'sleepy' : 'normal'); nx.blink = rnd(2.5, 6); }   // sometimes double, sometimes half, slow in quiet faces
    if (nx.glance <= 0) { randGlance(); nx.glance = rnd(1.4, 3.4); }
    if (nx.sway <= 0) { S.sway = rnd(-2.4, 2.4); S.rot.t = S.sway + S.gx.t * 1.1; nx.sway = rnd(3.5, 7); }
    if (S.blinkT >= 0) { S.blinkT += dt; const K = BLINK[S.blinkKind]; S.blink = blinkAt(K, S.blinkT); S.blinkLow = blinkAt(K, S.blinkT - .01);     // the lower lid is 10 ms behind the upper lid
      if (S.blinkT > K.c + K.h + K.o + .02) { if (S.blinkDouble) { S.blinkT = 0; S.blinkDouble = false; } else { S.blinkT = -1; S.blink = 0; S.blinkLow = 0; } } }
    spring(S.brow, S.blink, 420, 24);                                                                // the brows dip with the blink and come back a little past their place
    spring(S.rot, S.rot.t, SPRINGS.rotK, SPRINGS.rotC); spring(S.ny, S.ny.t, SPRINGS.nyK, SPRINGS.nyC); spring(S.gx, S.gx.t, SPRINGS.gazeK, SPRINGS.gazeC); spring(S.gy, S.gy.t, SPRINGS.gazeK, SPRINGS.gazeC);
    S.rot.x = clamp(S.rot.x, -SPRINGS.rotCap, SPRINGS.rotCap); S.ny.x = clamp(S.ny.x, -SPRINGS.nyCap, SPRINGS.nyCap);   // M2
    const dv = opts.drive ? opts.drive(i * SPRINGS.stepMs, i) : null;   // stress: a moment's head, a hop of the stage and head kicks (live.js kick: rot.v += 6, ny.v += 40) feed the hair springs
    if (dv && dv.kick) { S.rot.v += 6; S.ny.v += 40; }
    const R = S.rot.x + .5 * Math.sin(S.time * 2 * Math.PI / 9.1); S.phase += dt / 3.4 * 2 * Math.PI; const br = Math.sin(S.phase), hy = S.ny.x + br * 2.2, by = br * 4.2;
    P.blink.push(S.blink); P.blinkLow.push(S.blinkLow); P.brow.push(S.brow.x); P.rot.push(R); P.hy.push(hy); P.gx.push(S.gx.x); P.gy.push(S.gy.x); P.by.push(by);
    if (plan) { hairStep(H, plan.F, R + (dv ? dv.tilt : 0), hy + (dv ? dv.nod : 0), dv ? dv.hop : 0, dt); const h = hairState(plan, H, false, !!dv, prev, dt); prev = h;
      if (!last || Math.abs(h.N[0] - last.N[0]) + Math.abs(h.N[1] - last.N[1]) + Math.abs(h.N[2] - last.N[2]) + Math.abs(h.V - last.V) + Math.abs(h.S - last.S) * 2 > .05) { last = h; ver = i; }   // write the hair only when something moved by 0.05 units or more
      P.hairN.push(last.N[0], last.N[1], last.N[2]); P.hairV.push(last.V); P.hairS.push(last.S); P.hairVt.push(last.Vt); P.hairVer.push(ver); }
  }
  return P;
}
export function headMatrix(tilt        , nod        )           { 'worklet'; const r = tilt * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), px = HEAD_PIVOT[0], py = HEAD_PIVOT[1]; return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py + nod]; }
function at(a          , i0        , i1        , f        ) { 'worklet'; return a[i0] + (a[i1] - a[i0]) * f; }

/** What the idle gives at time t (ms), as numbers. Everything is read from the prepared arrays. */
                                                                                                                                                                                                        
export function idleValues(P       , tMs        )             {
  'worklet';
  const u = (tMs % P.totalMs) / P.stepMs, i0 = Math.min(P.n - 1, Math.floor(u)), i1 = Math.min(P.n - 1, i0 + 1), f = u - i0;
  let hair                   = null;
  if (P.hair) hair = { ver: P.hairVer[i0], N: [P.hairN[i0 * 3], P.hairN[i0 * 3 + 1], P.hairN[i0 * 3 + 2]], V: P.hairV[i0], S: P.hairS[i0], Vt: P.hairVt[i0] };
  const by = at(P.by, i0, i1, f);
  return { blink: at(P.blink, i0, i1, f), blinkLow: at(P.blinkLow, i0, i1, f), brow: at(P.brow, i0, i1, f), tilt: at(P.rot, i0, i1, f), nod: at(P.hy, i0, i1, f), gazeX: at(P.gx, i0, i1, f), gazeY: at(P.gy, i0, i1, f), breathBody: by * .5, breathCollar: by, hair };
}
/** The eyes of a frame: blink and the lids of a face change together (live.js: cu = max(blink, lid)); the closed-eye arc of Laugh / Proud when line is set. */
function eyesWith(P       , fv       , blink        , blinkLow        , gx        , gy        )           {
  'worklet';
  const a = P.fk.rig.el.arc, lid = fv.lid < 0 ? 0 : fv.lid > 1 ? 1 : fv.lid;
  return eyeFrame(P.eg, Math.max(blink, lid), Math.max(blinkLow, lid), gx, gy, a ? a.n : null, a ? a.sw : 0, fv.line);
}
/** The brows dip with a blink; they do not while the eyes are the closed arc (the studio starts no blink then). Smooth: fades with the arc. */
const dipOf = (fv       , brow        ) => { 'worklet'; return 2 * brow * (fv.line === null ? 1 : 1 - fv.line); };
/** A whole FrameState for the idle alone (no hands). fv = the face (face.ts faceNow); not given = calm. */
export function solveIdle(P       , tMs        , fv        )             {
  'worklet';
  const v = idleValues(P, tMs), F = fv || P.fk.rest.calm.v;
  return { t: tMs, durationMs: P.totalMs, totalMs: P.totalMs, peakMs: 0, headTilt: v.tilt, nod: v.nod, headMatrix: headMatrix(v.tilt, v.nod), shoulderLift: 0, browLift: 0, browDip: dipOf(F, v.brow), breathBody: v.breathBody, breathCollar: v.breathCollar,
    face: F.f       , facePrev: F.f       , faceMix: 1, faceMs: 1e9, fv: F, faceR: faceOut(P.fk, F), blink: v.blink, gazeX: v.gazeX, gazeY: v.gazeY, eyes: eyesWith(P, F, v.blink, v.blinkLow, v.gazeX, v.gazeY), hair: v.hair, hands: [], shadowM: null };
}
/** Puts the idle on a moment's frame: blink, breath, brow dip, sway and hair come from the idle; the head and the gaze stay the moment's. */
export function overlayIdle(P       , f            , tMs        )             {
  'worklet';
  const v = idleValues(P, tMs), tilt = f.headTilt + .5 * Math.sin(tMs / 1000 * 2 * Math.PI / 9.1), nod = f.nod + (v.breathCollar / 4.2) * 2.2;   // breath = sin(phase): the nod of the idle is not added, only its breath (2.2 units)
  return { ...f, headTilt: tilt, nod, headMatrix: headMatrix(tilt, nod), browDip: dipOf(f.fv, v.brow), breathBody: v.breathBody, breathCollar: v.breathCollar, blink: v.blink, eyes: eyesWith(P, f.fv, v.blink, v.blinkLow, f.gazeX, f.gazeY), hair: v.hair, shadowM: f.shadowM ? armShadowM(P.sh, { shoulderLift: f.shoulderLift, breathBody: v.breathBody, breathCollar: v.breathCollar, headMatrix: headMatrix(tilt, nod) }) : null };
}
