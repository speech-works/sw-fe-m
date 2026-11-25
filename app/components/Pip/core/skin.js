// Skin details: optional layers on the bare face (freckles, a beauty mark, laugh lines, dimples, age lines, vitiligo, a brow gap, stubble).
// Picked by the founder on 2026-11-25 (1, 3, 5, 6, 7, 8, 11, 12 of 12 options; heavy freckles, smile lines, birthmark and rosy cheeks were left out).
// Pure: no DOM, no imports. The site and the app copy this file (web/scripts/export_skin.mjs).
//
// How a layer works:
//  - It is drawn in the kit's 1000-unit frame, placed from numbers read out of the figure itself (head outline, eye circles, nose line,
//    mouth corners, blush spots, brow curve), so it sits on every face of the kit, with any hair, hat or glasses.
//  - Its colours come from the figure's own skin (and the kit's nose-line and brow colours, which the kit already derives from the skin).
//    No grey or black, no gradients, no blur.
//  - It lies on the skin: under the collar, hair, eyes, brows and mouth, cut by the head outline. It is drawn again on the cheek lift
//    (the skin that rises over the lower eye on a squint), so the pattern stays when the cheek moves.
//  - Motion (per frame, from the face numbers): dimples and laugh lines fade in and out with the mouth (gateAt); dimples follow the
//    mouth corners (cornerShift); the brow gap follows the brow curve (gapLine). Nothing jumps.

                                                                                                                        
                                                                                    

const SMILING = ["smile", "laugh", "proud", "warm"];
export const SKIN_DETAILS           = [
  { id: "freckles", name: "Freckles", note: "A few small dots on the nose and cheeks, one shade darker than the skin." },
  { id: "mole", name: "Beauty mark", note: "One small round mark on the cheek, in a deep shade of the skin." },
  { id: "laughLines", name: "Laugh lines", note: "Three short lines at the outer eye. Shows on smile and laugh.", faces: ["smile", "laugh"] },
  { id: "dimples", name: "Dimples", note: "A short curve on each cheek, outside the mouth corner. Shows when smiling.", faces: SMILING },
  { id: "ageLines", name: "Age lines", note: "Two soft forehead lines and one line under each eye." },
  { id: "vitiligo", name: "Vitiligo", note: "Lighter patches of the same skin: round one eye, by the mouth, on the forehead and jaw." },
  { id: "browGap", name: "Brow gap", note: "A thin slit through one brow. It moves with the brow." },
  { id: "stubble", name: "Stubble", note: "A flat shadow on the jaw, chin and upper lip, a little darker than the skin." },
];
export const SKIN_DETAIL                           = Object.fromEntries(SKIN_DETAILS.map((d) => [d.id, d]))                            ;
/** Drawing order on the skin, bottom first. The brow gap is a cut in the brow, not a layer. */
const ORDER             = ["vitiligo", "stubble", "freckles", "mole", "ageLines", "laughLines", "dimples"];

// ---------- colour ----------
                                    
const rgb = (h        )      => { const s = h.replace("#", ""); const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16))       ; };
const hex = (c     ) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a        , b        , t        ) => { const A = rgb(a), B = rgb(b); return hex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t)       ); };
function hsl(h        )                           {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hh * 60 + 360) % 360, s * 100, l * 100];
}
function fromHsl(h        , s        , l        ) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

                                                                                                                                    
/** The detail colours of one skin. `line`: the kit's nose-line colour; `brow`: the kit's brow colour (both made from the skin by the kit). */
export function skinTones(skin        , line        , brow        )            {
  const [h, s, l] = hsl(skin);
  return {
    skin, line, brow,
    // a darker, slightly richer shade of the skin: light skin needs a bigger step to show, deep skin a smaller one
    freckle: fromHsl(h - 2, Math.min(70, s + 8), l - (6 + l * 0.13)),
    mole: mix(skin, brow, 0.78),
    // the same skin without pigment: its own hue, much lighter
    light: mix(fromHsl(h, Math.min(s, 55), l + (100 - l) * 0.62), "#FFEFE4", 0.25),
    stubble: mix(skin, brow, l > 60 ? 0.2 : 0.3),
  };
}

// ---------- measuring a figure ----------
                          
/** The face rig fields this file reads (a subset of face.ts FaceRig, so this file needs no import). */
                                                                                                                                                                                               
                           
                                                                                           
                                                                                                               
                                                                     
                                                                                                    
                                                                                                                            
                               
  
const nums = (s        ) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const cubic = (a   , b   , c   , d   , t        )    => { const u = 1 - t; return [0, 1].map((i) => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i])     ; };

/** Reads the face out of a figure as the kit's drawer draws it: `svg` with the skull marked data-sk="1" and the eye clips <id>eL / <id>eR. */
export function measureSkin(svg        , rig         )              {
  const headTag = svg.match(/<path\b[^>]*? data-sk="1"[^>]*\/>/) [0];
  const headD = headTag.match(/ d="([^"]*)"/) [1];
  const hn = nums(headD), hx = hn.filter((_, i) => i % 2 === 0), hy = hn.filter((_, i) => i % 2 === 1);
  const skin = headTag.match(/ fill="(#[0-9a-fA-F]+)"/) [1];
  const eL = nums(svg.match(/<clipPath id="[a-z]+\d*eL"><ellipse([^>]*)\/>/) [1]), eR = nums(svg.match(/<clipPath id="[a-z]+\d*eR"><ellipse([^>]*)\/>/) [1]);
  const nn = nums(String(rig.el.nose).match(/ d=\\?"([^"\\]*)/) [1]);
  const np      = []; for (let i = 0; i < nn.length; i += 2) np.push([nn[i], nn[i + 1]]);
  const pts      = [];
  for (let k = 0; k + 3 < np.length; k += 3) for (let t = 0; t <= 1.001; t += 0.1) pts.push(cubic(np[k], np[k + 1], np[k + 2], np[k + 3], t));
  const line = String(rig.el.nose).match(/stroke=\\?"(#[0-9a-fA-F]+)/) [1];
  const corner = rig.names.map((f) => { const m = rig.t[f].mouth; return { lx: m[0], rx: m[12], y: m[1] }; });
  const s = rig.t.smile?.mouth ?? rig.t[rig.names[0]].mouth;
  return {
    headTag, headD, head: { x0: Math.min(...hx), x1: Math.max(...hx), y0: Math.min(...hy), y1: Math.max(...hy) },
    eye: { lx: eL[0], rx: eR[0], y: eL[1], r: eL[2] + 4 },
    nose: { pts, x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) },
    corner, ref: { lx: s[0], ly: s[1], rx: s[12], ry: s[13] }, cx: (eL[0] + eR[0]) / 2,
    tones: skinTones(skin, line, rig.el.brow.stroke),
  };
}

// ---------- drawing ----------
const f1 = (n        ) => +n.toFixed(1);
/** A closed smooth curve round (cx, cy): `radii` are multipliers of rx/ry, going round. */
function patch(cx        , cy        , rx        , ry        , radii          , rot = 0) {
  const n = radii.length, p      = radii.map((k, i) => { const a = rot + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]; });
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + "Z";
}
function rand(seed        ) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Freckle dots in the cheek and nose zones, kept off the eye rims, the nose line and the widest mouth. Same seed: the same dots every time. */
function freckleDots(m             ) {
  const r = rand(23), out                             = [];
  const cy = m.eye.y + m.eye.r + 46, mouthX0 = Math.min(...m.corner.map((c) => c.lx)) - 14, mouthX1 = Math.max(...m.corner.map((c) => c.rx)) + 14, mouthY = Math.min(...m.corner.map((c) => c.y)) - 16;
  const ok = (x        , y        , rad        , gap        ) =>
    Math.hypot(x - m.eye.lx, y - m.eye.y + 8) > m.eye.r + rad + 7 && Math.hypot(x - m.eye.rx, y - m.eye.y + 8) > m.eye.r + rad + 7 &&
    !(x > mouthX0 && x < mouthX1 && y > mouthY) && m.nose.pts.every((p) => Math.hypot(x - p[0], y - p[1]) > rad + 12) &&
    out.every((o) => Math.hypot(x - o[0], y - o[1]) > o[2] + rad + gap);
  const zone = (zx        , zy        , rx        , ry        , count        , r0        , r1        , gap        ) => {
    for (let got = 0, tries = 0; got < count && tries < 900; tries++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()), x = zx + Math.cos(a) * rx * k, y = zy + Math.sin(a) * ry * k, rad = r0 + r() * (r1 - r0);
      if (ok(x, y, rad, gap)) { out.push([f1(x), f1(y), f1(rad)]); got++; }
    }
  };
  const nx = (m.nose.x0 + m.nose.x1) / 2 + 8, ny = (m.nose.y0 + m.nose.y1) / 2 - 4;
  zone(m.eye.lx - 12, cy, 56, 22, 6, 5.6, 7.4, 13); zone(m.eye.rx + 12, cy, 56, 22, 6, 5.6, 7.4, 13); zone(nx, ny, 26, 20, 3, 5.4, 6.6, 10);
  return out;
}

/** The SVG of one detail layer (kit units). A group with data-side="l" / "r" follows that mouth corner. */
export function skinLayer(id          , m             )         {
  const T = m.tones, e = m.eye, cx = m.cx, c = { lx: m.ref.lx, rx: m.ref.rx, y: m.ref.ly };
  const stroke = (d        , w        , o = 1, col = T.line) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
  switch (id) {
    case "freckles":
      return freckleDots(m).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${T.freckle}"/>`).join("");
    case "mole":
      return `<circle cx="${f1(e.rx + 30)}" cy="${f1(e.y + e.r + 44)}" r="9.5" fill="${T.mole}"/>`;
    case "laughLines": {
      // a small fan from the outer, lower edge of each eye, where there is the most free skin beside the kit's large eyes
      const room = Math.min(30, Math.max(12, e.lx - e.r - m.head.x0 - 16));
      const d = (s        ) => [-14, 12, 38].map((deg, i) => {
        const a = (deg * Math.PI) / 180, r0 = e.r + 6, r1 = r0 + room * (i === 1 ? 1 : 0.85), X = (r        ) => f1((s === 1 ? e.lx : e.rx) - s * r * Math.cos(a)), Y = (r        ) => f1(e.y + r * Math.sin(a));
        return `M${X(r0)} ${Y(r0)}L${X(r1)} ${Y(r1)}`;
      }).join("");
      return stroke(d(1), 8.5, 0.95) + stroke(d(-1), 8.5, 0.95);
    }
    case "dimples": {
      const d = (x        , s        ) => `M${f1(x - s * 40)} ${f1(c.y - 8)}Q${f1(x - s * 52)} ${f1(c.y + 8)} ${f1(x - s * 40)} ${f1(c.y + 24)}`;
      return `<g data-side="l">${stroke(d(c.lx, 1), 9.5)}</g><g data-side="r">${stroke(d(c.rx, -1), 9.5)}</g>`;
    }
    case "ageLines": {
      const top = e.y - e.r - 8, y1 = top - 138, y2 = top - 108;    // above the highest brow, below most hairlines
      const u = (x        ) => `M${f1(x - 36)} ${f1(e.y + e.r + 6)}Q${f1(x)} ${f1(e.y + e.r + 20)} ${f1(x + 36)} ${f1(e.y + e.r + 6)}`;
      return stroke(`M${f1(cx - 74)} ${f1(y1 + 6)}Q${cx} ${f1(y1 - 6)} ${f1(cx + 74)} ${f1(y1 + 6)}M${f1(cx - 56)} ${f1(y2 + 5)}Q${cx} ${f1(y2 - 5)} ${f1(cx + 56)} ${f1(y2 + 5)}`, 8, 0.8) + stroke(u(e.lx) + u(e.rx), 7.5, 0.8);
    }
    case "vitiligo":
      return `<g fill="${T.light}">` +
        `<path d="${patch(e.rx + 22, e.y + 12, 96, 92, [1, 0.88, 1.04, 0.9, 0.78, 0.92, 0.8, 0.95, 1.05, 0.9], 0.3)}"/>` +
        `<path d="${patch(c.lx - 4, c.y + 52, 60, 40, [1, 0.8, 1.05, 0.85, 1, 0.75, 0.95, 0.85], 0.2)}"/>` +
        `<path d="${patch(e.lx - 6, e.y - e.r - 118, 50, 32, [1, 0.8, 1.05, 0.9, 0.8, 1, 0.85], 0.5)}"/>` +
        `<path d="${patch(m.head.x0 + 34, e.y + e.r + 34, 26, 40, [1, 0.85, 1, 0.8, 1.05, 0.85], 0.4)}"/></g>`;
    case "stubble": {
      const h = m.head, y0 = e.y + e.r + 12, up = m.nose.y1 + 12, ch = c.y + 8;
      return `<path d="M${h.x0 - 20} ${f1(y0)}C${h.x0 + 26} ${f1(y0 + 8)} ${h.x0 + 44} ${f1(ch + 14)} ${f1(c.lx - 50)} ${f1(ch)}C${f1(c.lx - 20)} ${f1(ch - 8)} ${f1(cx - 46)} ${f1(up)} ${cx} ${f1(up)}C${f1(cx + 46)} ${f1(up)} ${f1(c.rx + 20)} ${f1(ch - 8)} ${f1(c.rx + 50)} ${f1(ch)}C${h.x1 - 44} ${f1(ch + 14)} ${h.x1 - 26} ${f1(y0 + 8)} ${h.x1 + 20} ${f1(y0)}V${h.y1 + 30}H${h.x0 - 20}Z" fill="${T.stubble}"/>`;
    }
    case "browGap":
      return "";   // a cut in the brow itself (a mask), see addSkin()
  }
}

/** 1 when the detail shows on this face, else 0. */
export function skinGate(id          , face        )         { const f = SKIN_DETAIL[id].faces; return !f || f.includes(face) ? 1 : 0; }

/**
 * The figure's SVG with the chosen details put in. `ids` in any order; unknown ids are left out. `face`: the face it starts on (for the
 * dimples and laugh lines). Elements it adds: <g data-sd="<id>"> per layer (twice when the figure has a cheek lift) and, for the brow gap,
 * <line data-sd="browGap"> in the brow's mask. Ids it adds start with `<pre>` (the figure's own id prefix, "cd0" for the site figures).
 */
export function addSkin(svg        , rig         , roles                                  , ids          , face        , pre = "cd0")                                  {
  const m = measureSkin(svg, rig);
  const layers = ORDER.filter((i) => ids.includes(i)).map((id) => `<g data-sd="${id}" opacity="${skinGate(id, face)}">${skinLayer(id, m)}</g>`).join("");
  if (layers) {
    // the layers are cut by the head outline; the head's own outline is drawn again on top of them
    const outline = m.headTag.replace(/ fill="[^"]*"/, ' fill="none"').replace(' data-sk="1"', "");
    svg = svg.replace(m.headTag, `${m.headTag}<clipPath id="${pre}sdh"><path d="${m.headD}"/></clipPath><g clip-path="url(#${pre}sdh)">${layers}</g>${outline}`);
    // the cheek lift is drawn in plain skin above the face: draw the layers again on it, cut to its own shape
    if (roles.cheek !== undefined) {
      const cheek = new RegExp(`<path\\b([^>]*?) data-i="${roles.cheek}"/>`);
      svg = svg.replace(cheek, (_all, attrs        ) =>
        `<path${attrs} id="${pre}skc" data-i="${roles.cheek}"/><clipPath id="${pre}skcc"><use href="#${pre}skc"/></clipPath><g clip-path="url(#${pre}skcc)"><g clip-path="url(#${pre}sdh)">${layers}</g></g>`);
    }
  }
  if (ids.includes("browGap")) {
    const brow = new RegExp(`<path\\b([^>]*?) data-i="${roles.brow}"/>`), g = gapLine(nums(svg.match(new RegExp(`<path\\b[^>]*? d="([^"]*)"[^>]*? data-i="${roles.brow}"`))?.[1] ?? ""));
    const at = g ? `x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"` : `x1="0" y1="0" x2="0" y2="0"`;
    svg = svg.replace(brow, (_all, attrs        ) =>
      `<mask id="${pre}sdm" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="1400"><rect x="-200" y="-200" width="1400" height="1400" fill="#fff"/><line data-sd="browGap" ${at} stroke="#000" stroke-width="10.5" stroke-linecap="butt"/></mask><path${attrs} mask="url(#${pre}sdm)" data-i="${roles.brow}"/>`);
  }
  return { svg, m };
}

// ---------- motion (per frame, pure) ----------
const sio = (t        ) => { 'worklet'; return t <= 0 ? 0 : t >= 1 ? 1 : .5 - .5 * Math.cos(Math.PI * t); };
/** A detail's opacity `ms` after a face change started, from `a` (its opacity then) to `b`: the mouth's own timing (face.ts, 40-240 ms). */
export function gateAt(a        , b        , ms        )         { 'worklet'; return a + (b - a) * sio((ms - 40) / 200); }
/** How far each mouth corner is from the corners the corner layers are drawn for. `mouth`: the face's mouth numbers (FaceV.mouth). */
export function cornerShift(m             , mouth          )                 {
  'worklet';
  return { l: [mouth[0] - m.ref.lx, mouth[1] - m.ref.ly], r: [mouth[12] - m.ref.rx, mouth[13] - m.ref.ry] };
}
/** The brow gap across the right brow. `brow`: the face's brow numbers (FaceV.brow, 12 numbers: two quadratic curves). */
export function gapLine(brow          )                                                            {
  'worklet';
  if (brow.length < 12) return null;
  const x0 = brow[6], y0 = brow[7], qx = brow[8], qy = brow[9], x1 = brow[10], y1 = brow[11], t = 0.3, u = 1 - t;
  const px = u * u * x0 + 2 * u * t * qx + t * t * x1, py = u * u * y0 + 2 * u * t * qy + t * t * y1;
  let tx = 2 * u * (qx - x0) + 2 * t * (x1 - qx), ty = 2 * u * (qy - y0) + 2 * t * (y1 - qy);
  const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
  const ax = -ty + tx * 0.28, ay = tx + ty * 0.28, k = 26;   // across the brow, leaning a little
  return { x1: +(px - ax * k).toFixed(1), y1: +(py - ay * k).toFixed(1), x2: +(px + ax * k).toFixed(1), y2: +(py + ay * k).toFixed(1) };
}
