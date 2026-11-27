// Hair deformation (rule M7). Port of web/scripts/hair.js (plan, render, sim, step, state). Same numbers, same names. No DOM.
// plan() weighs every hair path point once (JS thread, at prepare time). hairPath() / hairElement() are the per-frame parts and carry the 'worklet' line.
// The springs (sim, step, state) run in prepareIdle() once; the answers are stored as plain numbers (see idle.ts).
                                                                                                                                                                                                                        
                                                                    
/** One hair element in the plan: still text, a moving element (circle/ellipse), or a path cut in text chunks and moving points. */
                                                                                                                                                             
                                                                                                                                         
/** What the springs give each frame: N = sideways shift at 1/3, 2/3 and the tip; V = up/down at the tip; S = root sway; Vt = V as a share of its limit. */
                                                                            
                                                                                                                                                                       

export const HAIR_Y0 = 600;                                // ear line: hair above it sits on the skull
const HEAD = { cx: 500, cy: 545, rx: 232, ry: 295 };       // skull, a little generous
const RAD = Math.PI / 180, ROOT_PER_DEG = (830 - HAIR_Y0) * RAD;
export const HAIR_FAM                             = {
  short: { k: [260, 220, 200], c: [22, 20, 18], amp: 1, grav: 0, max: 0, vK: 300, vC: 22, vAmp: .25, vMax: 3, flare: 0, topSway: 2, topBounce: 2.5 },
  curl: { k: [260, 220, 200], c: [12, 11, 10], amp: 1, grav: 0, max: 0, vK: 220, vC: 9, vAmp: .25, vMax: 3, flare: 0, topSway: 3, topBounce: 5 },
  long: { k: [120, 70, 45], c: [9, 7, 5.5], amp: 1.6, grav: .55, max: .13, vK: 110, vC: 8, vAmp: .12, vMax: 14, flare: 6, topSway: 1.5, topBounce: 2 },
  bob: { k: [150, 110, 80], c: [10, 8, 7], amp: 1.5, grav: .5, max: .14, vK: 150, vC: 9, vAmp: .12, vMax: 9, flare: 7, topSway: 1.5, topBounce: 2 },
  coils: { k: [170, 140, 110], c: [7, 6, 5], amp: 1.1, grav: .3, max: .08, vK: 200, vC: 8, vAmp: .12, vMax: 9, flare: 4, topSway: 2, topBounce: 4 },
  big: { k: [220, 200, 180], c: [8, 8, 8], amp: .9, grav: 0, max: .13, vK: 240, vC: 8, vAmp: .15, vMax: 8, flare: 3, topSway: 0, topBounce: 0, cloud: true },
  braids: { k: [80, 55, 40], c: [9, 8, 7], amp: 1.4, grav: .7, max: .10, vK: 120, vC: 10, vAmp: .08, vMax: 6, flare: 2, topSway: 1, topBounce: 1.5 },
  bunches: { k: [130, 100, 80], c: [8, 7, 6], amp: 1.6, grav: .5, max: .16, vK: 160, vC: 8, vAmp: .12, vMax: 10, flare: 4, topSway: 1.5, topBounce: 2 },
};
export function hairFamilyOf(id        , flags                                        )         {
  const f = (flags && flags.family) || 'short', n = String(id || '');
  if (flags && flags.bigTop) return 'coils'; if (f === 'long' && /bob/.test(n)) return 'bob'; if (f === 'short' && /curl/.test(n)) return 'curl'; return HAIR_FAM[f] ? f : 'short';
}
const sstep = (v        ) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
/** Reads a path: only absolute M L C Q S T A Z are moved. Anything else leaves the path still. */
function parseD(d        )                                                                        {
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []; if (tok.some(t => /[a-yHV]/.test(t))) return null;
  let i = 0, cmd = '', pre = ''; const pts                                          = [];
  while (i < tok.length) { const t = tok[i];
    if (/[A-Z]/i.test(t)) { cmd = t.toUpperCase(); pre += cmd; i++; if (cmd === 'Z') continue; }
    if (cmd === 'Z') { i++; continue; }
    const pairs = cmd === 'A' ? 1 : ({ M: 1, L: 1, T: 1, Q: 2, S: 2, C: 3 }                          )[cmd]; if (!pairs) return null;
    if (cmd === 'A') { if (i + 7 > tok.length) return null; pre += tok.slice(i, i + 5).join(' ') + ' '; i += 5; }
    for (let p = 0; p < pairs; p++) { if (i + 2 > tok.length) return null; pts.push({ pre, x: +tok[i], y: +tok[i + 1] }); pre = ' '; i += 2; }
  }
  return { pts, tail: pre };
}
/** hair.js plan(): items = all hair elements of one avatar in a fixed order. opts.gain 0..1 from the motion gate (0 = stays still). */
export function planHair(items              , opts                                                                                                )           {
  const fam = hairFamilyOf(opts.id, opts.flags), F = HAIR_FAM[fam], g = opts.gain == null ? 1 : opts.gain, hasHat = !!opts.hasHat;
  const parsed = items.map(it => it.d != null ? parseD(it.d) : null); let yMax = 0;
  for (const p of parsed) if (p) for (const q of p.pts) if (q.y > yMax) yMax = q.y;
  const hang = yMax - HAIR_Y0, Len = F.cloud ? 70 : Math.max(0, hang), hasHang = !F.cloud && hang >= 30;
  const P           = { fam, F, Len, gain: g, items: [], moving: 0, total: 0 };
  const weigh = (x        , y        )                  => {
    const e = Math.sqrt(Math.pow((x - HEAD.cx) / HEAD.rx, 2) + Math.pow((y - HEAD.cy) / HEAD.ry, 2)) - 1; let u = 0, t = 0;
    if (F.cloud) { u = sstep((e - .03) / .4); if (hasHat) u *= sstep((y - HAIR_Y0) / 80); }
    else { if (hasHang && y > HAIR_Y0) u = Math.pow((y - HAIR_Y0) / hang, 1.25); if (!hasHat && y < HAIR_Y0) t = sstep((e - .03) / .35) * sstep((HAIR_Y0 - y) / 150); }
    if (u < .004 && t < .01) return null;
    const side = x < 500 ? -1 : 1;
    return [13.5 * u * (u - 2 / 3) * (u - 1) * g, -13.5 * u * (u - 1 / 3) * (u - 1) * g, 4.5 * u * (u - 1 / 3) * (u - 2 / 3) * g, t * F.topSway * g, -side * u * F.flare / Math.max(1, F.vMax) * g, u * g, t * F.topBounce * g];
  };
  items.forEach((it, k) => {
    if (it.d == null) { const w = weigh(it.cx          , it.cy          ); P.items.push({ el: true, w, x: it.cx, y: it.cy }); if (w) P.moving++; P.total++; return; }
    const p = parsed[k]; if (!p) { P.items.push({ still: it.d }); return; }
    const chunks           = [], mov           = []; let text = '';
    for (const q of p.pts) { P.total++; const w = weigh(q.x, q.y);
      if (!w) { text += q.pre + q.x + ' ' + q.y; continue; }
      chunks.push(text + q.pre); text = ''; mov.push(q.x, q.y, w[0], w[1], w[2], w[3], w[4], w[5], w[6]); P.moving++; }
    P.items.push(mov.length ? { chunks, mov, tail: text + p.tail } : { still: it.d });
  });
  return P;
}
export function hairLimits(P          , cel         ) { const m = P.F.max * P.Len * (cel ? 1.4 : 1); return { N: [m / 3, m * 2 / 3, m], V: P.F.vMax, S: 1, Vt: 1 }; }

/** One hair path of the plan as SVG text for this state, or null when it does not move (hair.js render). Per-frame, UI thread. */
export function hairPath(P          , k        , st           )                {
  'worklet';
  const it = P.items[k]; if (it.still != null || !it.mov) return null;
  const n1 = st.N[0], n2 = st.N[1], n3 = st.N[2], V = st.V, S = st.S, Vt = st.Vt, m = it.mov, ch = it.chunks            ; let d = '';
  for (let i = 0, c = 0; i < m.length; i += 9, c++)
    d += ch[c] + (m[i] + m[i + 2] * n1 + m[i + 3] * n2 + m[i + 4] * n3 + m[i + 5] * S + m[i + 6] * V).toFixed(1) + ' ' + (m[i + 1] + m[i + 7] * V + m[i + 8] * Vt).toFixed(1);
  return d + it.tail;
}
/** The same points as plain numbers (for a drawer that builds its own path, e.g. Skia): writes x, y of every moving point of item k into out, returns how many. */
export function hairPoints(P          , k        , st           , out          )         {
  'worklet';
  const it = P.items[k]; if (it.still != null || !it.mov) return 0;
  const n1 = st.N[0], n2 = st.N[1], n3 = st.N[2], V = st.V, S = st.S, Vt = st.Vt, m = it.mov; let o = 0;
  for (let i = 0; i < m.length; i += 9) { out[o++] = m[i] + m[i + 2] * n1 + m[i + 3] * n2 + m[i + 4] * n3 + m[i + 5] * S + m[i + 6] * V; out[o++] = m[i + 1] + m[i + 7] * V + m[i + 8] * Vt; }
  return o >> 1;
}
/** A moving circle / ellipse: [dx, dy] to translate by, or null (hair.js render). */
export function hairElement(P          , k        , st           )                  {
  'worklet';
  const it = P.items[k]; if (!it.el || !it.w) return null; const w = it.w;
  return [w[0] * st.N[0] + w[1] * st.N[1] + w[2] * st.N[2] + w[3] * st.S + w[4] * st.V, w[5] * st.V + w[6] * st.Vt];
}

/* ---- the springs. Run once by prepareIdle(); the answers are kept as numbers. R = head tilt (deg), Y = head height (units, up is negative), E = hop of the stage (0 here). ---- */
export function hairSim()          { return { x: [0, 0, 0], v: [0, 0, 0], yv: 0, yvv: 0, ys: 0, ysv: 0, init: false }; }
export function hairStep(H         , F            , R        , Y        , E        , dt        )       {
  const Ys = E, p = ROOT_PER_DEG * R; if (!H.init) { H.x = [p, p, p]; H.yv = Y; H.ys = Ys; H.init = true; }
  const n = dt > .02 ? 2 : 1, h = dt / n;
  for (let s = 0; s < n; s++) { let prev = p;
    for (let i = 0; i < 3; i++) { H.v[i] += (F.k[i] * (prev - H.x[i]) - F.c[i] * H.v[i]) * h; H.x[i] += H.v[i] * h; prev = H.x[i]; }
    H.yvv += (F.vK * (Y - H.yv) - F.vC * H.yvv) * h; H.yv += H.yvv * h; H.ysv += (F.vK * (Ys - H.ys) - F.vC * H.ysv) * h; H.ys += H.ysv * h; }
  H.p = p; H.R = R; H.Y = Y; H.Ys = Ys;
}
const SLEW = 12, soft = (v        , m        ) => m > 0 ? m * Math.tanh(v / m) : 0;
/** hair.js state(): soft limits (tanh) and a speed limit against the last frame. */
export function hairState(P          , H         , cel         , stage         , prev                  , dt        )            {
  const F = P.F, L = hairLimits(P, cel), N = [0, 0, 0], p = H.p          , R = H.R          , Y = H.Y          ;
  for (let i = 0; i < 3; i++) N[i] = soft(F.amp * (H.x[i] - p) + (i + 1) / 3 * P.Len * RAD * F.grav * R, L.N[i]);
  let V = soft((H.yv - Y) * F.vAmp, F.vMax * .5); if (stage) V = soft(V + soft((H.ys - (H.Ys          )) * F.vMax / 160, F.vMax), F.vMax);
  const st            = { N, V, S: soft((H.x[0] - p) / 8, 1), Vt: 0 };
  if (prev && dt > 0) { const lim = (v        , q        , m        ) => { const d = SLEW * m * dt; return v > q + d ? q + d : v < q - d ? q - d : v; };
    for (let i = 0; i < 3; i++) N[i] = lim(N[i], prev.N[i], Math.max(1, L.N[i])); st.V = lim(st.V, prev.V, Math.max(1, F.vMax)); st.S = lim(st.S, prev.S, 1); }
  st.Vt = st.V / Math.max(1, F.vMax); return st;
}
