// The solver. prepare() runs once for a moment and a look (plain data out). solveFrame() gives one frame from that data: no state, no screen code.
// The maths is a port of web/scripts/hands/hands-rig.js (frame, AT.palms, AT.wave2, swing) and web/scripts/pm.js (handMoment), with the head springs of web/scripts/live.js.
                                                                                                    
import { D, clamp, seg, outBack, io, bump, up2, smooth, inOutCubic, sio } from './ease.js';
import { faceKit, faceMoment, faceOut } from './face.js';
                                         
import { ARM, CHEEK, CHIN, FACE_MS, HEAD_PIVOT, HEART, MOMENTS, PALMS, POSES, SHRUG, SPRINGS, UP2, WAVE, WAVE_X } from './data/moments.js';
import { HAND_ART } from './art/hand-art.js';
import { makeShoulderLine, shoulderTop } from './shoulder.js';
                                                  
import { eyeFrame } from './idle.js';
import { armShadowM, shadowSet } from './shadow.js';
                                             
                                         

/** One beat of a pose (hands-rig.js AT.*): plain numbers. */
                                                                                                                                                                            

/** hands-rig.js AT.palms, with the soft entry (up2) that pm.js asks for. */
export function beatPalms(ms        , dur        )       {
  'worklet';
  const c = clamp(ms, 0, dur), s = bump(seg(c, PALMS.open[0], PALMS.open[1]));
  return { up: up2(ms, dur, UP2.i, UP2.o), spread: PALMS.spread * s, dy: PALMS.dy * s, dfa: 0, dha: 0, wrist: false, sk: 0,
    tilt: PALMS.tilt * io(seg(c, PALMS.tiltIn[0], PALMS.tiltIn[1])) * (1 - io(seg(c, PALMS.tiltOut[0], PALMS.tiltOut[1]))), ny: PALMS.nod * s, face: c > PALMS.faceIn && c < PALMS.faceOut, pop: 1 };
}
/** hands-rig.js swing(): h = hand angle, f = forearm angle, env, ph. Returned as an array (no object per call on the hot path is not needed; kept simple). */
function swing(ms        )           {
  'worklet';
  if (ms < WAVE.s0) return [0, 0, 0, 0];
  const u = seg(ms, WAVE.s0, WAVE.s1), ph = 2 * Math.PI * WAVE.f * (ms - WAVE.s0) / 1000;
  const env = Math.sin(Math.PI / 2 * Math.min(1, u / WAVE_X.envIn)) * (1 - WAVE_X.decay * u) * (1 - io(seg(ms, WAVE.s1 - WAVE_X.fadeMs, WAVE.s1)));
  return [WAVE.A * env * Math.sin(ph), WAVE.F * env * Math.sin(ph + WAVE.lead), env, ph];
}
/** hands-rig.js AT.wave2. */
export function beatWave(ms        )       {
  'worklet';
  const T = WAVE.T, c = clamp(ms, 0, T), X = WAVE_X, lin = seg(c, 0, WAVE.lift), lift = outBack(Math.pow(lin, X.liftPow), X.liftBack), drop = io(seg(c, T - X.dropMs, T)), s = swing(c), sd = swing(c - WAVE.lag);
  const drag = X.drag0 * Math.pow(1 - lin, 2) - X.dragOut * io(seg(c, T - X.dragFrom, T - X.dragTo));
  return { up: lift * (1 - drop), spread: 0, dy: 0, dfa: s[1] - X.armBack * (1 - lift) * (1 - drop) + X.armDrop * drop, dha: s[0] + drag, wrist: true, sk: Math.tan((s[0] - sd[0]) * X.skewK * D),
    tilt: X.tilt * io(seg(c, X.tiltIn[0], X.tiltIn[1])) * (1 - io(seg(c, T - X.tiltOut[0], T - X.tiltOut[1]))) + X.sway * s[2] * Math.sin(s[3] - X.swayPhase), ny: X.nod * bump(seg(c, X.nodSeg[0], X.nodSeg[1])), face: c > X.faceIn && c < T - X.faceOut, pop: 1 };
}

/** hands-rig.js AT.calm(1): Hand on the cheek. The soft entry (up2) is the studio's for every position B pose that is not the wave. */
export function beatCheek(ms        )       {
  'worklet';
  const C = CHEEK, T = POSES.cheek.dur, c = clamp(ms, 0, T), h = seg(c, C.popSeg[0], C.popSeg[1]);
  return { up: up2(ms, T, UP2.i, UP2.o), spread: 0, dy: 0, dfa: 0, dha: 0, wrist: false, sk: 0, tilt: C.tilt * io(seg(c, C.tiltIn[0], C.tiltIn[1])) * (1 - io(seg(c, C.tiltOut[0], C.tiltOut[1]))), ny: C.ny * bump(h),
    face: c > MOMENTS['h-cheek'].faceIn && c < MOMENTS['h-cheek'].faceOff, pop: 1 + C.pop * bump(h) };
}
/** hands-rig.js AT.chin: Hand at the chin. The hand turns a little with the nod (rot goes into the hand angle, not into the wrist swing). */
export function beatChin(ms        )       {
  'worklet';
  const C = CHIN, T = POSES.chin.dur, c = clamp(ms, 0, T), n = seg(c, C.seg[0], C.seg[1]), nod = C.nod * Math.sin(2 * Math.PI * C.freq * n) * bump(n);
  return { up: up2(ms, T, UP2.i, UP2.o), spread: 0, dy: nod * C.dyK, dfa: 0, dha: C.rot * Math.sin(2 * Math.PI * C.freq * n - C.rotPh) * bump(n), wrist: false, sk: 0,
    tilt: C.tilt * io(seg(c, C.tiltIn[0], C.tiltIn[1])) * (1 - io(seg(c, C.tiltOut[0], C.tiltOut[1]))), ny: C.dip * bump(seg(c, C.dipSeg[0], C.dipSeg[1])) + nod,
    face: c > MOMENTS['h-chin'].faceIn && c < MOMENTS['h-chin'].faceOff, pop: 1 };
}
/** hands-rig.js AT.heart3: the hands pulse once. Nothing is held in the gap (no plush heart, no glow). */
export function beatHeart(ms        )       {
  'worklet';
  const C = HEART, T = POSES.heart3.dur, c = clamp(ms, 0, T), b = bump(seg(c, C.pulse[0], C.pulse[1]));
  return { up: up2(ms, T, UP2.i, UP2.o), spread: 0, dy: C.dy * b, dfa: 0, dha: 0, wrist: false, sk: 0, tilt: C.tilt * io(seg(c, C.tiltIn[0], C.tiltIn[1])) * (1 - io(seg(c, C.tiltOut[0], C.tiltOut[1]))),
    ny: C.ny * io(seg(c, C.nyIn[0], C.nyIn[1])) * (1 - io(seg(c, C.nyOut[0], C.nyOut[1]))), face: c > MOMENTS['h-heart'].faceIn && c < MOMENTS['h-heart'].faceOff, pop: 1 + C.pop * b };
}

/** One hand of a pose + its rigid arm, ready to use (numbers only). */
                           
                                                                                                                                                   
                                                                                                                                                                        
                                                                                                    
                                                                                                          
 
                           
                                                                                                                                                                                                             
                                                                                                                         
                                                                                                                           
                                                                  
                                                                                                                                           
                                                                                                                                                                   
 

/** pm.js warp: real time -> pose time (Palms up holds its pose for `hold` ms only). */
function warp(P          , t        )         {
  'worklet';
  if (!P.palms) return t;
  return t < P.inT ? t : t < P.inT + P.hold ? P.inT + (t - P.inT) * (P.dur - P.outT - P.inT) / P.hold : P.dur - P.outT + (t - P.inT - P.hold);
}
const KIND                                   = { 'h-palms': 'palms', 'h-wave': 'wave', 'h-cheek': 'cheek', 'h-chin': 'chin', 'h-heart': 'heart' };
function beatAt(P          , ms        )       { 'worklet'; const k = P.kind; return k === 'palms' ? beatPalms(ms, P.dur) : k === 'wave' ? beatWave(ms) : k === 'cheek' ? beatCheek(ms) : k === 'chin' ? beatChin(ms) : beatHeart(ms); }

                                                                                                                  // k includes the pop of the beat; w (sleeve width) does not
/** hands-rig.js frame(): where the wrist is, the hand angle, the forearm direction and the sleeve width. enter = [0,0] (pm.js P2). */
function poseHand(h          , A         , b      )        {
  'worklet';
  const k0 = h.size / h.artH, k = k0 * b.pop, off = 1 - b.up; let Wx        , Wy        , R        , sk        , dx        , dy        ;
  if (A) { Wx = h.atX + h.enX * off - b.spread * h.sgn * PALMS.spreadX; Wy = h.atY + h.enY * off + b.dy; R = h.angle - b.spread * h.sgn; sk = 0;
    const x = Math.cos(h.wdeg * D) * h.m, y = Math.sin(h.wdeg * D), c = Math.cos(R * D), s = Math.sin(R * D); dx = x * c - y * s; dy = x * s + y * c; }
  else { const L = ARM.forearm, Ex = h.wristX - L * Math.sin(h.fa * D), Ey = h.wristY + L * Math.cos(h.fa * D) + b.dy, fa = h.fa + b.dfa, dm = h.m < 0 ? 180 - h.wdeg : h.wdeg;
    Wx = Ex + L * Math.sin(fa * D); Wy = Ey - L * Math.cos(fa * D); R = (90 + fa) - dm + h.bend + b.dha; sk = b.sk; dx = -Math.sin(fa * D); dy = Math.cos(fa * D); }
  const cut = h.cutHalf * k0, w = Math.max(h.sl * h.artW * k0, 2 * cut * ARM.cutMin + ARM.cutPad);
  return { Wx, Wy, R, sk, k, dx, dy, w };
}

const NO_STRIP        = { on: false, d: '', x1: 0, y1: 0, x2: 0, y2: 0 };
const NO_ARM = { on: false, matrix: [1, 0, 0, 1, 0, 0] };

const BIG_CLIP = 'M-9999 -9999H9999V9999H-9999Z';
/** Heart hands (pm.js handMoment 'heart3'): no sleeve, no cuff, no seam, no shadow and no cut at a cuff line. The drawing has its own forearms and the badge cuts them.
 *  The hand slides in from below by itself (poseHand: enter). The gap between the hands stays empty. */
function heartFrame(h          , p       , b      , show         )            {
  'worklet';
  const x = p.Wx, y = p.Wy, rotate = p.R, scaleX = p.k * h.m, scaleY = p.k, rc = Math.cos(rotate * D), rs = Math.sin(rotate * D);
  const ma = rc * scaleX, mb = rs * scaleX, mc = rc * p.sk * scaleY - rs * scaleY, md = rs * p.sk * scaleY + rc * scaleY;
  const matrix = [ma, mb, mc, md, x + ma * h.ox + mc * h.oy, y + mb * h.ox + md * h.oy];
  const transform = 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + rotate.toFixed(3) + ') matrix(1 0 ' + p.sk.toFixed(4) + ' 1 0 0) scale(' + scaleX.toFixed(5) + ' ' + scaleY.toFixed(5) + ') translate(' + h.ox + ' ' + h.oy + ')';
  return { art: h.art, show, x, y, rotate, skewX: p.sk, scaleX, scaleY, originX: h.ox, originY: h.oy, matrix, transform, clip: BIG_CLIP, sleeve: '', cuff: '', seam: NO_STRIP, shadow: NO_STRIP, armShadow: NO_ARM };
}

/** pm.js handMoment, the part inside the frame loop: the rigid arm that rises from below, the hand cut, the sleeve, the cuff, the seam and its shadow strip. */
function handFrame(h          , A         , b      , show         , S              , AS                                   )            {
  'worklet';
  const p = poseHand(h, A, b);
  if (!h.rigid) return heartFrame(h, p, b, show);
  const SU = A ? ARM.sleeveUpA : ARM.sleeveUpB, off = 1 - b.up, th = h.side * ARM.riseTilt * off, tvx = h.dvx * ARM.riseDist * off, tvy = h.dvy * ARM.riseDist * off;
  const cs = Math.cos(th * D), sn = Math.sin(th * D);
  const Jqx = p.Wx - p.dx * SU, Jqy = p.Wy - p.dy * SU;                                         // the wrist joint at the cuff
  const qx = h.Sx + (Jqx - h.Sx) * cs - (Jqy - h.Sy) * sn + tvx, qy = h.Sy + (Jqx - h.Sx) * sn + (Jqy - h.Sy) * cs + tvy;
  const gh = th * ARM.handTiltShare, gp = gh + (b.wrist ? b.dha : 0), gc = Math.cos(gp * D), gs = Math.sin(gp * D), w0x = p.Wx - Jqx, w0y = p.Wy - Jqy;
  const x = qx + w0x * gc - w0y * gs, y = qy + w0x * gs + w0y * gc, rotate = p.R + gh, scaleX = p.k * h.m, scaleY = p.k;
  const rc = Math.cos(rotate * D), rs = Math.sin(rotate * D), ma = rc * scaleX, mb = rs * scaleX, mc = rc * p.sk * scaleY - rs * scaleY, md = rs * p.sk * scaleY + rc * scaleY;
  const matrix = [ma, mb, mc, md, x + ma * h.ox + mc * h.oy, y + mb * h.ox + md * h.oy];
  const transform = 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + rotate.toFixed(3) + ') matrix(1 0 ' + p.sk.toFixed(4) + ' 1 0 0) scale(' + scaleX.toFixed(5) + ' ' + scaleY.toFixed(5) + ') translate(' + h.ox + ' ' + h.oy + ')';
  const base = { art: h.art, show, x, y, rotate, skewX: p.sk, scaleX, scaleY, originX: h.ox, originY: h.oy, matrix, transform };
  if (!show) return { ...base, clip: '', sleeve: '', cuff: '', seam: NO_STRIP, shadow: NO_STRIP, armShadow: NO_ARM };
  const dx = p.dx * cs - p.dy * sn, dy = p.dx * sn + p.dy * cs, nx = -dy, ny = dx;
  let armShadow = NO_ARM;       // pm.js SHD: the hand drawing as a silhouette, moved 4 toward the body (side of the sleeve point) and 11 down
  if (AS) { const side = +(qx + dx * SU).toFixed(1) < 500 ? 1 : -1; armShadow = { on: true, matrix: [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4] + AS.dx * side, matrix[5] + AS.dy] }; }
  const T2 = (ax        , ay        ) => ax.toFixed(1) + ' ' + ay.toFixed(1);
  const c4 = (al        , ac        ) => T2(qx + dx * al - dy * ac, qy + dy * al + dx * ac);
  const clip = 'M' + c4(ARM.clipAhead, -900) + 'L' + c4(ARM.clipAhead, 900) + 'L' + c4(-1500, 900) + 'L' + c4(-1500, -900) + 'Z';
  const hw0 = Math.max(ARM.cuffMin, p.w * ARM.cuffScaleW / 2 - ARM.cuffInset), hw = A ? hw0 : ARM.wideB * hw0, wd = A ? ARM.widenA : ARM.widenB, sI = h.sI, sO = -sI, Le = h.L, hwe = hw * ARM.capK;
  const Px = (al        , ac        ) => qx + dx * al + nx * ac * (1 + wd * Math.max(0, al - ARM.widenFrom));
  const Py = (al        , ac        ) => qy + dy * al + ny * ac * (1 + wd * Math.max(0, al - ARM.widenFrom));
  const Pax = Px(0, sI * hw), Pay = Py(0, sI * hw), Pbx = Px(14, sO * hw), Pby = Py(14, sO * hw), Cmx = Px(-22, 0), Cmy = Py(-22, 0);
  const Cax = Pax + (Cmx - Pax) * .3, Cay = Pay + (Cmy - Pay) * .3, Cbx = Pbx + (Cmx - Pbx) * .3, Cby = Pby + (Cmy - Pby) * .3;
  const I1x = Px(14, sI * hw), I1y = Py(14, sI * hw), O1x = Px(28, sO * hw), O1y = Py(28, sO * hw);
  const sleeve = 'M' + T2(I1x, I1y) + 'Q' + T2(Pax, Pay) + ' ' + T2(Cax, Cay) + 'Q' + T2(Cmx, Cmy) + ' ' + T2(Cbx, Cby) + 'Q' + T2(Pbx, Pby) + ' ' + T2(O1x, O1y)
    + 'L' + T2(Px(Le, sO * hw), Py(Le, sO * hw)) + 'C' + T2(Px(Le + hwe, sO * hw), Py(Le + hwe, sO * hw)) + ' ' + T2(Px(Le + hwe, sI * hw), Py(Le + hwe, sI * hw)) + ' ' + T2(Px(Le, sI * hw), Py(Le, sI * hw)) + 'Z';
  const k6x = dx * ARM.cuffShift, k6y = dy * ARM.cuffShift;
  const cuff = 'M' + T2(I1x + k6x, I1y + k6y) + 'Q' + T2(Pax + k6x, Pay + k6y) + ' ' + T2(Cax + k6x, Cay + k6y) + 'Q' + T2(Cmx + k6x, Cmy + k6y) + ' ' + T2(Cbx + k6x, Cby + k6y) + 'Q' + T2(Pbx + k6x, Pby + k6y) + ' ' + T2(O1x + k6x, O1y + k6y);
  let ac = -1;                                                                                   // where the inner edge of the sleeve goes onto the shirt
  for (let al = ARM.shoulderFrom; al <= Le; al += ARM.shoulderStep) { if (Py(al, sI * hw) >= shoulderTop(S, Px(al, sI * hw)) + ARM.shoulderPad) { ac = al; break; } }
  let seam = NO_STRIP, shadow = NO_STRIP;
  if (ac >= 0) {
    const a0x = Px(ac - ARM.seamBack, sI * hw), a0y = Py(ac - ARM.seamBack, sI * hw), a1x = Px(ac + ARM.seamLen, sI * hw), a1y = Py(ac + ARM.seamLen, sI * hw);
    seam = { on: true, d: 'M' + T2(a0x, a0y) + 'L' + T2(a1x, a1y), x1: +a0x.toFixed(1), y1: +a0y.toFixed(1), x2: +a1x.toFixed(1), y2: +a1y.toFixed(1) };
    const e = (al        , o        ) => T2(Px(al, sI * (hw + o)), Py(al, sI * (hw + o))), i0 = ARM.shadowIn, o0 = ARM.shadowOut;
    shadow = { on: true, d: 'M' + e(ac - ARM.shadowBack, i0) + 'L' + e(Le, i0) + 'L' + e(Le, o0) + 'L' + e(ac - ARM.shadowBack, o0) + 'Z',
      x1: +Px(ac, sI * (hw + i0)).toFixed(1), y1: +Py(ac, sI * (hw + i0)).toFixed(1), x2: +Px(ac, sI * (hw + o0)).toFixed(1), y2: +Py(ac, sI * (hw + o0)).toFixed(1) };
  }
  return { ...base, clip, sleeve, cuff, seam, shadow, armShadow };
}

/** The script of the head (pm.js handMoment + live.js): spring targets and the direct values at real time t. [rotTarget, nyTarget, gazeXTarget, gazeYTarget, shrug, browUp, faceOn] */
function script(P          , t        )           {
  'worklet';
  const tw = t - P.lead, inTween = tw >= 0 && tw <= P.real;
  let tilt = 0, nyT = 0, face = 0, hid = true;
  if (inTween) { const ms = Math.max(.01, warp(P, tw)), b = beatAt(P, ms); hid = ms <= 0 || ms >= P.dur || b.up <= 0; if (!hid) { tilt = b.tilt; nyT = b.ny; face = b.face ? 1 : 0; } }
  if (!P.palms) return [tilt, nyT, 0, 0, 0, 0, face];
  const M = MOMENTS['h-palms'], e0 = P.lead + P.real + M.endPause, on = t >= 0 && t < e0;
  const shrug = inTween ? smooth((tw + P.lead) / (P.inT + M.shrugUpPad)) * (1 - smooth((tw - (P.real - P.outT - M.shrugDownPad)) / (P.outT + M.shrugDownPad))) : 0;
  const browUp = t < 0 ? 0 : t < e0 ? inOutCubic(clamp(t / M.browMs, 0, 1)) : 1 - inOutCubic(clamp((t - e0) / M.browMs, 0, 1));
  return [tilt, on && !P.tall ? M.headSink : 0, on ? M.gazeX : 0, on ? M.gazeY : 0, shrug, browUp, on ? 1 : 0];
}

function mixHex(a        , b        , t        )         { const q = (h        ) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = q(a), y = q(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** pm.js handColours + sleeve style A. */
export function handColours(look      )              {
  const q = (h        ) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), s = q(look.skin), lum = .3 * s[0] + .59 * s[1] + .11 * s[2];
  const dark = (h        , t        ) => '#' + q(h).map(v => Math.round(v * (1 - t)).toString(16).padStart(2, '0')).join('');
  const bandD = q(look.collar).reduce((t, v, i) => t + Math.abs(v - q(look.collarShade)[i]), 0);
  return { skin: look.skin, shade: look.skinShade, highlight: mixHex(look.skin, '#FFFFFF', .16), outline: lum < 95 ? mixHex(look.skin, '#000000', .6) : '#523027',
    sleeve: dark(look.collar, ARM.sleeveDark), seam: dark(look.collar, ARM.seamDark), cuff: look.collarShade, cuffOpacity: +Math.min(.6, 30 / Math.max(1, bandD || 100)).toFixed(2) };
}

/** hands-rig.js cutHalf: half width of the flat wrist cut of a drawing (art units), from its silhouette path. */
function cutHalf(art        )         {
  const A = HAND_ART[art], w = A.wrists[0], n = (A.paths[0].d.match(/-?\d+\.?\d*/g) || []).map(Number), wx = w[0] * A.w, wy = w[1] * A.h, dx = Math.cos(w[2] * D), dy = Math.sin(w[2] * D); let mx = 0;
  for (let i = 0; i + 1 < n.length; i += 2) { const x = n[i] - wx, y = n[i + 1] - wy, al = x * dx + y * dy, pe = Math.abs(-x * dy + y * dx); if (al > -.035 * A.h && pe < .3 * A.w && pe > mx) mx = pe; }
  return mx;
}

/** Once for a moment and a look: the rigid arm of each hand (pm.js RIG, from the peak pose), the shoulder line, the colours, the spring answers. */
export function prepare(id          , look      )           {
  const M = MOMENTS[id], pose = POSES[M.pose], palms = id === 'h-palms', A = pose.variant === 'A', kind = KIND[id];
  const real = palms ? M.inT + M.hold + M.outT : pose.dur, scriptEnd = palms ? M.lead + real + M.endPause + M.browMs : real;
  const P           = { id, kind, palms, tall: !!look.tall, variantA: A, dur: pose.dur, lead: M.lead, real, inT: M.inT, hold: M.hold, outT: M.outT, scriptEnd, durationMs: scriptEnd, totalMs: scriptEnd + SPRINGS.settleMs, peakMs: M.peakMs,
    poseFace: pose.face          , baseFace: 'calm', faceIn: M.faceIn, faceOff: M.faceOff, hands: [], shoulder: makeShoulderLine(look.shoulderPath, look.zoom, look.bottomPad), colours: handColours(look), armShadow: look.armShadow !== false && look.shadow && (id === 'h-palms' || id === 'h-wave') ? { dx: look.shadow.dx, dy: look.shadow.dy, sh: shadowSet(look) } : null, eg: look.eyes.eg, fk: faceKit(look.face), stepMs: SPRINGS.stepMs, rot: [], ny: [], gx: [], gy: [] };
  const peak = beatAt(P, pose.dur * pose.mid); if (A) peak.up = up2(pose.dur * pose.mid, pose.dur, UP2.i, UP2.o);
  pose.parts.forEach((part, i) => { const art = HAND_ART[part.art], w = art.wrists[0];
    const h           = { art: part.art, artW: art.w, artH: art.h, ox: -w[0] * art.w, oy: -w[1] * art.h, wdeg: w[2], cutHalf: cutHalf(part.art), m: part.mirror ? -1 : 1, size: part.size, sl: part.sl, sgn: i % 2 ? -1 : 1, rigid: pose.rigid, enX: pose.enter[0], enY: pose.enter[1],
      atX: part.atX, atY: part.atY, angle: part.angle, wristX: part.wristX, wristY: part.wristY, fa: part.fa, bend: part.bend, Sx: 0, Sy: 0, L: 0, side: 1, dvx: 0, dvy: 0, sI: 1 };
    if (!pose.rigid) { P.hands.push(h); return; }      // the heart hands have no rigid arm
    const s = poseHand(h, A, peak), SU = A ? ARM.sleeveUpA : ARM.sleeveUpB, qx = s.Wx - s.dx * SU, qy = s.Wy - s.dy * SU; let L = ARM.pivotFrom;
    const PR = (look.arm && look.arm.pivotR) || ARM.pivotR, PY = (look.arm && look.arm.pivotY) || ARM.pivotY;   // a site figure on a blob carries its own (look.arm): the sleeve runs on under the blob
    for (; L < ARM.pivotTo; L += ARM.pivotStep) { const x = qx + s.dx * L, y = qy + s.dy * L; if (Math.hypot(x - 500, y - 500) > PR || y > PY) break; }
    const fr = (k        ) => Math.hypot(qx - s.dy * k - ARM.bodyX, qy + s.dx * k - ARM.bodyY);
    h.Sx = qx + s.dx * L; h.Sy = qy + s.dy * L; h.L = L; h.side = s.Wx < 500 ? -1 : 1; h.dvx = s.dx; h.dvy = s.dy; h.sI = fr(40) < fr(-40) ? 1 : -1; P.hands.push(h); });
  // springs (live.js spring(): a = k*(target-x) - c*v; v += a*dt; x += v*dt; then the cap of rule M2), stepped at a fixed 1/60 s
  const dt = SPRINGS.stepMs / 1000, st = [[0, 0], [0, 0], [0, 0], [0, 0]], K = [[SPRINGS.rotK, SPRINGS.rotC], [SPRINGS.nyK, SPRINGS.nyC], [SPRINGS.gazeK, SPRINGS.gazeC], [SPRINGS.gazeK, SPRINGS.gazeC]], out = [P.rot, P.ny, P.gx, P.gy];
  for (let i = 0; i * SPRINGS.stepMs <= P.totalMs + SPRINGS.stepMs; i++) { const tg = script(P, i * SPRINGS.stepMs);
    for (let j = 0; j < 4; j++) { const s = st[j], a = K[j][0] * (tg[j] - s[0]) - K[j][1] * s[1]; s[1] += a * dt; s[0] += s[1] * dt;
      if (j === 0) s[0] = clamp(s[0], -SPRINGS.rotCap, SPRINGS.rotCap); if (j === 1) s[0] = clamp(s[0], -SPRINGS.nyCap, SPRINGS.nyCap); out[j].push(+s[0].toFixed(4)); } }
  return P;
}

function sample(a          , u        )         { 'worklet'; if (u <= 0) return a[0]; const i = Math.floor(u), n = a.length - 1; if (i >= n) return a[n]; return a[i] + (a[i + 1] - a[i]) * (u - i); }

/** One frame. Pure: the same (P, tMs) gives the same answer. Safe to call on the UI thread of the phone. */
export function solveFrame(P          , tMs        )             {
  'worklet';
  const t = clamp(tMs, 0, P.totalMs), sc = script(P, t), u = t / P.stepMs - 1 < 0 && t <= 0 ? -1 : t / P.stepMs;
  const shrug = sc[4], sk = P.tall ? 0 : shrug, headTilt = (t <= 0 ? 0 : sample(P.rot, u)) + SHRUG.tilt * sk, nod = (t <= 0 ? 0 : sample(P.ny, u)) + SHRUG.sink * sk;   // sk: a tall collar gets no shoulder lift, no sink and no tilt
  const tw = t - P.lead, inTween = tw >= 0 && tw <= P.real, ms = Math.max(.01, warp(P, tw)), b = beatAt(P, inTween ? ms : 0), show = inTween && !(ms >= P.dur || b.up <= 0);
  const hands              = []; for (let i = 0; i < P.hands.length; i++) hands.push(handFrame(P.hands[i], P.variantA, b, show, P.shoulder, P.armShadow));
  // face: the pose face while the script says so. The change takes FACE_MS (live.js); t0 = when it last changed.
  const on = sc[6] > 0, face         = on ? P.poseFace : P.baseFace, facePrev         = on ? P.baseFace : P.poseFace;
  let t0 = 0; if (P.palms) t0 = on ? 0 : P.lead + P.real + MOMENTS['h-palms'].endPause; else t0 = on ? P.faceIn : (t <= P.faceIn ? -FACE_MS : P.faceOff);
  const faceMs = t - t0, fv = faceMoment(P.fk, facePrev, face, faceMs), arc = P.fk.rig.el.arc, lid = fv.lid < 0 ? 0 : fv.lid > 1 ? 1 : fv.lid;
  const r = headTilt * D, c = Math.cos(r), s = Math.sin(r), px = HEAD_PIVOT[0], py = HEAD_PIVOT[1];
  const fr             = { t, durationMs: P.durationMs, totalMs: P.totalMs, peakMs: P.peakMs, headTilt, nod, headMatrix: [c, s, -s, c, px - c * px + s * py, py - s * px - c * py + nod],
    shoulderLift: SHRUG.lift * sk, browLift: SHRUG.brow * Math.max(0, shrug) + SHRUG.browUp * sc[5], face, facePrev, faceMix: sio((t - t0) / FACE_MS), faceMs, fv, faceR: faceOut(P.fk, fv), blink: 0, browDip: 0, breathBody: 0, breathCollar: 0,
    gazeX: t <= 0 ? 0 : sample(P.gx, u), gazeY: t <= 0 ? 0 : sample(P.gy, u), eyes: eyeFrame(P.eg, lid, lid, t <= 0 ? 0 : sample(P.gx, u), t <= 0 ? 0 : sample(P.gy, u), arc ? arc.n : null, arc ? arc.sw : 0, fv.line), hair: null, hands, shadowM: null };
  if (P.armShadow && show) fr.shadowM = armShadowM(P.armShadow.sh, fr);
  return fr;
}

const cache = new Map                                     ();
/** The simple call: solve(momentId, tMs, look). It keeps the prepared data of the last look for each moment. */
export function solve(momentId          , tMs        , look      )             {
  let c = cache.get(momentId); if (!c || c.look !== look) { c = { look, P: prepare(momentId, look) }; cache.set(momentId, c); }
  return solveFrame(c.P, tMs);
}
