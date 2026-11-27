// Makes a Look (the data the core needs) from a manifest of kit parts. Pure: no file access, no screen. The kit (avatarKit.js) and its catalog are handed in,
// so it runs in Node (core/scripts/gen-look.mjs), in the browser and on the phone (at run time, from the part data).
// Port of the first gen-look.mjs, made general: any hair, beard, headgear, eyewear, collar, skin and colours that the kit can compose.
                                                            
import { HAIR_GAIN } from './data/hair-gain.js';

/** What of the kit we use: AvatarKit.compose / chosenParts / fit. */
                                                                                                                                                                                                               
/** A look manifest: the kit's own AvatarManifest ({ parts: { slot: "slot.name" | null }, colors }). Missing parts / colours come from the catalog's default manifest. */
                                                                                                                   

/** live.js TALL_COLLARS: stand collars, roll necks, scarves, jackets that come up to the chin. Rule T-tall: no shoulder lift, no head sink and no head tilt from "Palms up" (the collar would climb over the jaw). */
export const TALL_COLLARS = ['collar.mandarin', 'collar.rollneck', 'collar.scarf', 'collar.chunky', 'collar.zipjacket', 'collar.cardigan', 'collar.bowcardigan', 'collar.suittie'];
export const FACE_NAMES = ['calm', 'smile', 'laugh', 'proud', 'curious', 'listening', 'thinking', 'warm'];

// live.js line 19: which group moves with what
const cls = (part        , layer        )                                     => { const slot = part.split('.')[0]; return slot === 'face' ? 'face' : slot === 'head' ? (layer === 'neck' ? 'body' : 'rig') : slot === 'collar' ? (layer === 'back' ? 'body' : 'collar') : 'rig'; };
const num = (s        , k        )         => parseFloat((s.match(new RegExp(' ' + k + '="([-\\d.]+)"')) || [])[1]);
const attr = (s        , n        )                => { const m = s.match(new RegExp(' ' + n + '="([^"]*)"')); return m ? m[1] : null; };
const nums = (d        )           => (d.match(/-?\d*\.?\d+/g) || []).map(Number);
const q2c = (a          , c          , b          )           => [a[0] + 2 / 3 * (c[0] - a[0]), a[1] + 2 / 3 * (c[1] - a[1]), b[0] + 2 / 3 * (c[0] - b[0]), b[1] + 2 / 3 * (c[1] - b[1])];

// ---- the face rig: live.js faceData / faceModel / faceTarget, on the kit's SVG text. One number set per expression (data only). ----
function mouthOf(e        )                                                  {
  if (e.startsWith('<ellipse')) { const cx = +(attr(e, 'cx')          ), cy = +(attr(e, 'cy')          ), rx = +(attr(e, 'rx')          ), ry = +(attr(e, 'ry')          ), k = .5523;
    return { n: [cx - rx, cy, cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry, cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy, cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry, cx - k * rx, cy + ry, cx - rx, cy + k * ry], sw: 0, col: attr(e, 'fill') }; }
  const d = attr(e, 'd')          , v = nums(d);
  if (/Q/.test(d) && !/Z/.test(d)) { const a = [v[0], v[1]], c = [v[2], v[3]], b = [v[4], v[5]], m1 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], m2 = [(c[0] + b[0]) / 2, (c[1] + b[1]) / 2], mid = [(m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2];
    const t1 = q2c(a, m1, mid), t2 = q2c(mid, m2, b);
    return { n: [...a, ...t1, ...mid, ...t2, ...b, t2[2], t2[3], t2[0], t2[1], ...mid, t1[2], t1[3], t1[0], t1[1]], sw: +(attr(e, 'stroke-width')          ) || 10, col: attr(e, 'stroke') }; }
  const P0 = [v[0], v[1]], P1 = [v[2], v[3]], lx = (P1[0] - P0[0]) / 6;
  return { n: [...P0, P0[0] + lx, P0[1], P0[0] + 2 * lx, P0[1], P0[0] + 3 * lx, P0[1], P0[0] + 4 * lx, P0[1], P0[0] + 5 * lx, P0[1], ...P1, ...v.slice(4, 10), ...v.slice(10, 14)], sw: 0, col: attr(e, 'fill') };
}
function faceModel(rest          )      {
  const o      = { brow: null, arc: null, nose: null, cheek: null, mouth: null, teeth: null, tongue: null }, after           = []; let nose = false;
  for (const e of rest) {
    if (!nose && e.startsWith('<path')) { const d = attr(e, 'd')          , sw = +(attr(e, 'stroke-width')          ) || 0, twoQ = /^M[^A-Za-z]*Q[^A-Za-z]*M[^A-Za-z]*Q[^A-Za-z]*$/.test(d);
      if (twoQ && sw > 25) { o.brow = { n: nums(d), el: e }; continue; }
      if (twoQ) { o.arc = { n: nums(d), sw, el: e }; continue; }
      if (attr(e, 'fill') === 'none' && /C/.test(d)) { o.nose = e; nose = true; continue; }
      o.cheek = e; continue; }
    if (nose) after.push(e); }
  if (after[0]) o.mouth = mouthOf(after[0]);
  if (after[1]) o.teeth = { n: nums(attr(after[1], 'd')          ), el: after[1] };
  if (after[2]) o.tongue = after[2];
  return o;
}
const faceCache = new Map             ();      // face rig + eyes by skin / ink: the face art does not depend on the other parts
function faceKitOf(Kit        , cat     , colors                        )                          {
  const key = JSON.stringify([colors.skin, colors.ink, cat.version]), hit = faceCache.get(key); if (hit) return hit;
  const man = (f        ) => ({ parts: { head: cat.defaultManifest.parts.head, face: 'face.' + f, collar: cat.defaultManifest.parts.collar }, colors: { skin: colors.skin, ink: colors.ink, hair: colors.hair, bg: colors.bg, collar: colors.collar } });
  const faceSvg = (f        ) => { const s = Kit.compose(cat, man(f), { shape: 'none', bg: false, zoom: 1, uid: 'p' }), m = s.match(/<g data-part="face\.[^"]+" data-layer="main">(.*?)<\/g>/)                    ; return m[1]; };
  const D                      = {}; let calm                  = null, calmSvg = '';
  for (const f of FACE_NAMES) { const svg = faceSvg(f), e = svg.match(/<(?:ellipse|circle|path)\b[^>]*\/>/g)            ;
    if (f === 'calm') { calm = e; calmSvg = svg; }
    const c = calm            , std = e.length >= 10 && e.slice(0, 4).join('') === c.slice(0, 4).join('') && e[4].startsWith('<ellipse') && e[5].startsWith('<circle'), rest = std ? e.slice(10) : e;
    const under = rest.filter(x => x.startsWith('<ellipse') && x.includes('ry="19'));
    D[f] = { under, model: faceModel(rest.filter(x => !under.includes(x))) }; }
  const any = (k        ) => { for (const x of FACE_NAMES) if (D[x].model[k]) return D[x].model[k]; return null; }, t                      = {};
  for (const f of FACE_NAMES) { const m = D[f].model;
    t[f] = { brow: m.brow.n, mouth: m.mouth.n, sw: m.mouth.sw, teeth: (m.teeth || any('teeth')).n, open: m.teeth ? 1 : 0, tongue: m.tongue ? 1 : 0, cheek: m.cheek ? 1 : 0, blush: D[f].under.length ? 1 : 0, arc: m.arc ? 1 : 0 }; }
  const arcM = FACE_NAMES.map(x => D[x].model.arc).find(Boolean), blushL           = FACE_NAMES.map(x => D[x].under).find((u          ) => u.length) || [];
  const el = { brow: { stroke: attr(D.calm.model.brow.el, 'stroke'), sw: +(attr(D.calm.model.brow.el, 'stroke-width')          ) }, nose: D.calm.model.nose,
    mouthCol: D.calm.model.mouth.col, teethFill: attr((any('teeth') || {}).el || '', 'fill'), tongue: (any('tongue') || null), cheek: (any('cheek') || null),
    arc: arcM ? { n: arcM.n, sw: arcM.sw } : null, blush: blushL.map(x => ({ cx: +(attr(x, 'cx')          ), cy: +(attr(x, 'cy')          ), rx: +(attr(x, 'rx')          ), ry: +(attr(x, 'ry')          ), fill: attr(x, 'fill') })), blur: 15 };
  // the open eyes: the first 10 elements of the face (ring L, ring R, white L, white R, pupil L: 3, pupil R: 3). They are the same in every face.
  const E = (calmSvg.match(/<(?:ellipse|circle)\b[^>]*\/>/g)            ).slice(0, 10), brow0 = /stroke="([^"]+)"/.exec((calmSvg.match(/<path [^>]*stroke-width="30[^>]*\/>/)                    )[0])                   ;
  const eg = [0, 1].map(i => ({ cx: num(E[i], 'cx'), cy: num(E[i], 'cy'), rx: num(E[i], 'rx'), ry: num(E[i], 'ry'), wcy: num(E[i + 2], 'cy'), wrx: num(E[i + 2], 'rx'), wry: num(E[i + 2], 'ry') }));
  const out = { rig: { names: FACE_NAMES, t, el }, eyes: { ring: [E[0], E[1]], white: [E[2], E[3]], pupil: [E[4] + E[5] + E[6], E[7] + E[8] + E[9]], eg, lashColour: brow0[1] } };
  faceCache.set(key, out); return out;
}

// ---- the arm contact shadow (pm.js SHD): the avatar parts the shadow falls on, in 3 colours. Shapes are copies of the kit shapes (fill only), cut by region and by the group that moves them.
const hexv = (h        ) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mixc = (a        , b        , t        ) => '#' + hexv(a).map((v, i) => Math.round(v + (hexv(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const lumOf = (h        ) => { const q = hexv(h); return .3 * q[0] + .59 * q[1] + .11 * q[2]; };
function shadowRegions(base                                                , C                        , skinShade        )                 {
  const R                                                                                                     = {};   // key role/cls
  let hairFill                = null;
  for (const l of base) { const slot = l.part.split('.')[0]; if (slot === 'face' || slot === 'headgear' || slot === 'eyewear' || l.layer === 'over') continue;
    const cl = cls(l.part, l.layer)                             , role = ['neck', 'skull', 'ears', 'earsTop'].includes(l.layer) && slot === 'head' ? 'skin' : cl === 'collar' || (cl === 'body' && l.layer === 'back') ? 'shirt' : 'hair', key = role + '/' + cl;
    for (const m of l.svg.matchAll(/<(?:path|ellipse|circle|rect)\b[^>]*\/>/g)) { let e = m[0]; const f = (attr(e, 'fill') || '').toLowerCase(); if (f === 'none') continue;
      if (role === 'hair' && !hairFill && /^#[0-9a-f]{6}$/.test(f)) hairFill = f;
      const fr = attr(e, 'fill-rule'); for (const a of ['clip-path', 'filter', 'id', 'style', 'data-name', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'fill-rule', 'opacity', 'fill-opacity']) e = e.replace(new RegExp(' ' + a + '="[^"]*"'), '');
      e = e.replace(/ fill="[^"]*"/, ''); e = e.replace(/\/>$/, ' fill="#000"' + (fr ? ' clipRule="' + fr + '"' : '') + '/>');
      (R[key] = R[key] || { role, cls: cl, els: [] }).els.push(e); } }
  const col                         = { skin: lumOf(C.skin) < 95 ? mixc(C.skin, '#000000', .7) : mixc(skinShade, '#000000', .15), shirt: mixc(C.collar, '#000000', .28), hair: hairFill ? mixc(hairFill, '#000000', .55) : '#2a1c16' };
  const order = ['skin/body', 'skin/rig', 'shirt/body', 'shirt/collar', 'hair/rig'];
  return { opacity: .6, dx: 4, dy: 11, regions: order.filter(k => R[k]).map(k => ({ role: R[k].role, cls: R[k].cls, col: col[R[k].role], svg: R[k].els.join('') })) };
}

/** The motion gate's gain for a hair x hat pair (core/src/data/hair-gain.ts). The gate ran on the first hairs; a hair that came later and is not listed takes the answer of its twin of the same family (boxbraids = braids, coilybig = coily, pigtailbows = pigtails): the safe way (still, or half). */
const TWIN                         = { 'hair.boxbraids': 'hair.braids', 'hair.braidsshort': 'hair.braids', 'hair.coilybig': 'hair.coily', 'hair.pigtailbows': 'hair.pigtails', 'hair.temples': 'hair.croptemples' };
const TWIN_HAT                         = { 'headgear.sunhat': 'headgear.cap', 'headgear.cowboy': 'headgear.cap', 'headgear.capheadset': 'headgear.cap' };   // wide-brim hats that cover the hair top like the work cap: they take its answer
export function hairGain(hairId                           , hatId                           )         { const t = hairId ? (HAIR_GAIN[hairId] || HAIR_GAIN[TWIN[hairId]] || {}) : {}, g = t[hatId || ''] ?? t[TWIN_HAT[hatId || ''] || '']; return g == null ? 1 : g; }

/** Outline pass, data side (site stills): a copy of the catalog in which the shapes that get a dark outline carry data-o="f" (a filled main shape: its own colour role, no tone) or data-o="s" (a main shape that is only a stroke, e.g. glasses: the drawer puts a wider dark stroke under it). Shade, light and face shapes carry nothing. The flat look never calls this. */
const OUT_ROLE = /^@(skin|hair|collar|headgear|accent|accent2|beard|eyewear)$/, tagged = new WeakMap             ();
export function outlineCatalog(cat     )      {
  const hit = tagged.get(cat); if (hit) return hit;
  const parts      = {};
  for (const id of Object.keys(cat.parts)) { const p = cat.parts[id]; if (p.slot === 'face') { parts[id] = p; continue; } const layers                         = {};
    for (const l of Object.keys(p.layers)) layers[l] = p.layers[l].replace(/<(path|ellipse|circle|rect)\b[^>]*\/>/g, (e        , tag        ) => {
      if (p.slot === 'head' && (l === 'ears') && tag !== 'ellipse') return e;      // the small patches that join an ear to the skull stay plain
      const f = attr(e, 'fill'), st = attr(e, 'stroke'), sw = parseFloat(attr(e, 'stroke-width') || '0');
      if (f && OUT_ROLE.test(f)) return e.replace(/\/>$/, (p.slot === 'head' && l === 'skull' ? ' data-sk="1"' : '') + ' data-o="f"/>');   // data-sk: the skull, whose outline the drawer draws again over a beard
      if (f === 'none' && st && OUT_ROLE.test(st) && sw >= 8) return e.replace(/\/>$/, ' data-o="s"/>');
      return e; });
    parts[id] = { ...p, layers }; }
  const out = { ...cat, parts }; tagged.set(cat, out); return out;
}

/** The kit's default manifest with this manifest on top (parts and colours). */
export function fullManifest(cat     , m              )                                                                           {
  const d = cat.defaultManifest, parts                                = { ...d.parts }, colors                         = { ...d.colors };
  for (const k of Object.keys(m.parts || {})) parts[k] = m.parts[k] == null ? null : m.parts[k]          ;
  Object.assign(colors, m.colors || {}); return { parts, colors };
}

/** The part groups of a composed SVG: <g data-part=".." data-layer="..">..</g>. A part's art may hold groups of its own
 *  (a site jacket is one <g transform>), so the end of a part group is found by counting <g> and </g>, not at the first </g>.
 *  (Reading to the first </g> cut such a layer short: browsers closed the open tag, react-native-svg's parser does not.) */
export function partGroups(raw        )                                                                {
  const out                                                                = [], open = /<g data-part="([^"]+)" data-layer="([^"]+)"([^>]*)>/g;
  let m                        ;
  while ((m = open.exec(raw))) {
    const start = open.lastIndex, tag = /<g\b[^>]*?(\/?)>|<\/g>/g; let depth = 1, end = -1, t                        ; tag.lastIndex = start;
    while ((t = tag.exec(raw))) { if (t[0] === '</g>') { if (--depth === 0) { end = t.index; break; } } else if (!t[1]) depth++; }
    if (end < 0) throw new Error('makeLook: part group ' + m[1] + ' ' + m[2] + ' is not closed');
    out.push({ part: m[1], layer: m[2], attrs: m[3], svg: raw.slice(start, end) }); open.lastIndex = end + 4;
  }
  return out;
}

/** The look data for a manifest. */
export function makeLook(Kit        , cat     , manifest              , opts                        = {})       {
  const M = fullManifest(cat, manifest), worn = Kit.chosenParts(cat, M), C = M.colors, mode = Kit.fit(cat, worn.hair, worn.headgear).mode;
  const man = { parts: { ...M.parts, face: 'face.calm' }, colors: C };
  const raw = Kit.compose(opts.outline ? outlineCatalog(cat) : cat, man, { shape: 'none', bg: false, zoom: 1, uid: 'p' });
  const base = partGroups(raw).map(m => ({ part: m.part, layer: m.layer, clip: m.attrs.includes('clip-path') ? (worn.headgear && worn.headgear.flags.hairOver) || '' : '', svg: m.svg }));
  let hairK = 0;
  const hairItems = (svg        )             => [...svg.matchAll(/<(path|ellipse|circle)\b([^>]*)\/>/g)].map(m => { const attrs                         = {}; for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const it           = { k: hairK++, tag: m[1]                   , attrs }; if (m[1] === 'path') { it.d = attrs.d; delete attrs.d; } else { it.cx = +attrs.cx; it.cy = +attrs.cy; } return it; });
  const layers              = base.map(l => { const c = cls(l.part, l.layer), hair = l.part.startsWith('hair.'); const o            = hair ? { cls: c, svg: '', hairItems: hairItems(l.svg) } : { cls: c, svg: c === 'face' ? '' : l.svg }; o.part = l.part; if (l.clip) o.clip = l.clip; return o; });
  const FK = faceKitOf(Kit, cat, C), neck = base.find(l => l.layer === 'neck'), colMain = base.find(l => l.part.startsWith('collar.') && l.layer === 'main');
  const shadeOf = (svg        , not        ) => (([...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1]).find(c => c.toLowerCase() !== not.toLowerCase())) || not);
  const paths = [...(colMain ? colMain.svg : '').matchAll(/<path\b[^>]*\/>/g)].map(m => ({ d: attr(m[0], 'd') || '', fill: attr(m[0], 'fill') || '' })).filter(p => p.d);
  const shirt = paths.filter(p => p.fill.toLowerCase() === C.collar.toLowerCase()).sort((a, b) => b.d.length - a.d.length)[0] || paths.sort((a, b) => b.d.length - a.d.length)[0];
  const skinShade = shadeOf(neck ? neck.svg : '', C.skin);
  const look       = { skin: C.skin, skinShade, collar: C.collar, collarShade: shadeOf(colMain ? colMain.svg : '', C.collar), bg: C.bg, zoom: cat.zoom, bottomPad: 14, layers, face: FK.rig, eyes: FK.eyes, shoulderPath: shirt ? shirt.d : '', shadow: shadowRegions(base, C, skinShade) };
  if (worn.hair) look.hair = { id: worn.hair.id, flags: worn.hair.flags || {}, colour: C.hair, gain: hairGain(worn.hair.id, worn.headgear ? worn.headgear.id : ''), mode };
  if (worn.headgear) { const f = worn.headgear.flags || {}; look.hat = { id: worn.headgear.id, flags: { coversHair: f.coversHair || false, coversEars: !!f.coversEars, earCups: !!f.earCups, hairMeets: f.hairMeets || '' } }; }
  if (TALL_COLLARS.includes(worn.collar.id)) look.tall = true;
  if (worn.beard) look.beard = { id: worn.beard.id };
  if (worn.eyewear) look.eyewear = { id: worn.eyewear.id };
  look.parts = { head: worn.head ? worn.head.id : '', hair: worn.hair ? worn.hair.id : '', beard: worn.beard ? worn.beard.id : '', headgear: worn.headgear ? worn.headgear.id : '', eyewear: worn.eyewear ? worn.eyewear.id : '', collar: worn.collar.id };
  return look;
}
