// The shirt's shoulder line, from the shirt path of the look. Pure maths (the web reads it from the page: pm.js shoulderLine()).
// Same idea as the web: walk the path, keep the smallest y in bins of 6 kit units. The web samples 901 points by length; here every curve is cut in 48 parts.
                                                                                           

function flatten(d        )             {
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], pts             = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0;
  const num = () => +tok[i++], N = 48;
  const curve = (f                         ) => { for (let s = 1; s <= N; s++) pts.push(f(s / N)); };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { x = sx; y = sy; pts.push([x, y]); continue; }
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; pts.push([x, y]); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); pts.push([x, y]); }
    else if (C === 'H') { x = ox + num(); pts.push([x, y]); }
    else if (C === 'V') { y = oy + num(); pts.push([x, y]); }
    else if (C === 'C' || C === 'S') { const x0 = x, y0 = y; let x1        , y1        ;
      if (C === 'C') { x1 = ox + num(); y1 = oy + num(); } else { x1 = 2 * x - px; y1 = 2 * y - py; }
      const x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num();
      curve(t => { const u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]; });
      px = x2; py = y2; x = x3; y = y3; continue; }
    else if (C === 'Q' || C === 'T') { const x0 = x, y0 = y; let x1        , y1        ;
      if (C === 'Q') { x1 = ox + num(); y1 = oy + num(); } else { x1 = 2 * x - px; y1 = 2 * y - py; }
      const x2 = ox + num(), y2 = oy + num();
      curve(t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]; });
      px = x1; py = y1; x = x2; y = y2; continue; }
    else if (C === 'A') { i += 5; x = ox + num(); y = oy + num(); pts.push([x, y]); }
    else i++;
    px = x; py = y;
  }
  return pts;
}

/** zoom + bottomPad = the place of the kit art on the stage (live.js: translate(500 1014) scale(z) translate(-500 -1000)). */
export function makeShoulderLine(d        , zoom        , bottomPad        )               {
  const pts = flatten(d), bins                         = {};
  for (let j = 0; j < pts.length; j++) {       // lines too: walk them in steps of 3 units
    const a = pts[Math.max(0, j - 1)], b = pts[j], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let s = 1; s <= n; s++) { const qx = a[0] + (b[0] - a[0]) * s / n, qy = a[1] + (b[1] - a[1]) * s / n, k = Math.round(qx / 6); if (bins[k] == null || qy < bins[k]) bins[k] = qy; }
  }
  const ks = Object.keys(bins).map(Number).sort((p, q) => p - q), k0 = ks[0], k1 = ks[ks.length - 1], ys           = [];
  for (let k = k0; k <= k1; k++) { if (bins[k] != null) { ys.push(bins[k]); continue; } let p = k, q = k; while (bins[p] == null) p--; while (bins[q] == null) q++; ys.push(bins[p] + (bins[q] - bins[p]) * (k - p) / (q - p)); }
  return { k0, ys, a: zoom, e: 500 - zoom * 500, f: 1000 + bottomPad - zoom * 1000 };
}

/** y of the shoulder line at stage x (pm.js env.top). Past the ends the line falls with a slope of 0.35. */
export function shoulderTop(S              , x        )         {
  'worklet';
  const u = (x - S.e) / S.a / 6, k1 = S.k0 + S.ys.length - 1; let yl        ;
  if (u <= S.k0) yl = S.ys[0] + (S.k0 - u) * 6 * .35;
  else if (u >= k1) yl = S.ys[S.ys.length - 1] + (u - k1) * 6 * .35;
  else { const a = Math.floor(u), b = Math.ceil(u), ya = S.ys[a - S.k0], yb = S.ys[b - S.k0]; yl = a === b ? ya : ya + (yb - ya) * (u - a); }
  return S.a * yl + S.f;
}
