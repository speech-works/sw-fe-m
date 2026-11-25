// The arm contact shadow (pm.js SHD): where it falls on the avatar. Pure numbers.
                                       

/** What a frame needs to move the shadow regions: the region groups, the kit zoom and the bottom pad. */
                                                                       
const mm = (m          , n        )           => { 'worklet'; return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; };
/** pm.js SHD upd(): for each region, the matrix from kit units to the hand layer (the hand layer lifts with the shoulders, the regions do not: T(lift) * zoom * the region's own group), and its inverse. 12 numbers each. */
export function armShadowM(sh           , f                                                                                          )             {
  'worklet';
  const L = f.shoulderLift, Z = [sh.zoom, 0, 0, sh.zoom, 500 * (1 - sh.zoom), 1000 + sh.pad - 1000 * sh.zoom], out             = [];
  for (let i = 0; i < sh.cls.length; i++) { const c = sh.cls[i], G = c === 'body' ? [1, 0, 0, 1, 0, f.breathBody - L] : c === 'collar' ? [1, 0, 0, 1, 0, f.breathCollar - L] : f.headMatrix;
    const m = mm([1, 0, 0, 1, 0, L], mm(Z, G)), det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c2 = -m[2] / det, d = m[0] / det;
    out.push([m[0], m[1], m[2], m[3], m[4], m[5], a, b, c2, d, -(a * m[4] + c2 * m[5]), -(b * m[4] + d * m[5])]); }
  return out;
}

export function shadowSet(look      )            { return { cls: look.shadow.regions.map(r => r.cls), zoom: look.zoom, pad: look.bottomPad }; }
