// The Panic Button: a flat red no-sign over a blue aura of pale reaching hands,
// crossed out by the sign's bar. The beanie figure with the scared face from the
// site's panic page (inputs/faces/beanie-scared.svg), low in the sign, no blob:
// the ring's lower arc ends his body under the collar.
const { figure } = require('../lib/fig.cjs');
// flat red no-sign with the beanie character inside it, hat off, blonde hair
// streaming in the wind, flustered, in a yellow A-line dress with puff sleeves
// and a Peter Pan collar (the founder's dress reference) and a no-sign badge. Behind him the panic as an aura of blobs and reaching hands, after
// the founder's second reference, crossed out by the sign's bar. The ring's lower arc is drawn
// again in front, so the sweater's cut edge sits behind it. No words, no hands.
const k = require('../lib/draw.cjs');
const { INK, cover, line } = k;

// An organic blob: a wobbly circle, smoothed through its points.
function blobPath(cx, cy, R, seed, amp) {
  const r = k.rng(seed);
  const n = 12;
  const ph1 = r() * 6.28, ph2 = r() * 6.28;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (Math.PI * 2 * i) / n;
    const rr = R * (1 + amp * Math.sin(3 * t + ph1) + amp * 0.6 * Math.sin(5 * t + ph2) + (r() - 0.5) * amp * 0.6);
    return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)];
  });
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// A pale open hand on its forearm, fingers pointing along `angle`, one fill
// with no outline, as in the founder's aura reference.
function reachingHand(x, y, angle, sc, fill) {
  const g = `<rect x="-170" y="-17" width="176" height="34" rx="17"/>` +
    `<ellipse cx="16" cy="0" rx="28" ry="25"/>` +
    [[-15, -6, 40], [-5, -2, 48], [5, 2, 47], [15, 6, 40]].map(([fy, a, len]) => `<rect x="20" y="${fy - 5.5}" width="${len}" height="11" rx="5.5" transform="rotate(${a} 20 ${fy})"/>`).join('') +
    `<rect x="0" y="-7" width="36" height="13" rx="6.5" transform="translate(8 -18) rotate(-48)"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${sc})" fill="${fill}">${g}</g>`;
}

module.exports = (v = 'blob') => {
  // v: 'blob' (draft 1), 'low' (the old cover's placement: low in the sign, the ring's
  // lower arc ends his body), 'high' (the same, the sign smaller and higher so
  // the Home card's band shows his whole collar)
  const SCARED = require('path').join(__dirname, '../inputs/faces/beanie-scared.svg');
  const BG = '#2F7F8C';
  const RED = '#D7362C';
  const PAPER = '#FFF8EC';
  const cx = 450, cy = 770, rMid = 362, band = 72;
  const rOut = rMid + band / 2, rIn = rMid - band / 2;
  const pt = (r, deg) => [(cx + r * Math.cos((deg * Math.PI) / 180)).toFixed(1), (cy + r * Math.sin((deg * Math.PI) / 180)).toFixed(1)];
  const arc = (r, a0, a1) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };

  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // soft shapes in the background instead of rays, in the aura's style
  body += `<path d="${blobPath(150, 230, 170, 3, 0.14)}" fill="#3A8C99"/>` + `<path d="${blobPath(780, 1080, 200, 9, 0.12)}" fill="#3A8C99"/>` +
    `<path d="${blobPath(820, 260, 110, 5, 0.16)}" fill="#287380"/>` + `<path d="${blobPath(90, 1060, 120, 7, 0.16)}" fill="#287380"/>`;

  const k = v === 'high' ? 0.9 : 1, Y = v === 'high' ? 560 : 770;
  if (v !== 'blob') body += `<g transform="translate(450 ${Y}) scale(${k}) translate(-450 -770)">`;
  // the sign's paper disc
  body += `<circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${PAPER}"/>`;

  // ── the panic, as an aura round him: layered blobs and pale hands
  // reaching in from every side. The sign's bar is drawn over them. ──
  let aura = `<path d="${blobPath(450, 800, 300, 11, 0.12)}" fill="#BFD9F5"/>` +
    `<path d="${blobPath(452, 812, 236, 13, 0.14)}" fill="#6FA6EC"/>` +
    `<path d="${blobPath(450, 836, 168, 17, 0.12)}" fill="#3E7BDB"/>`;
  // [x, y, angle the fingers point, scale]
  [[214, 560, 38, 1], [690, 548, 140, 1], [168, 760, 2, 0.95], [736, 744, 182, 0.95], [244, 960, -32, 0.9], [668, 968, 210, 0.9], [450, 492, 90, 0.85]]
    .forEach(([x, y, a, sc]) => { aura += reachingHand(x, y, a, sc, '#EAF3FD'); });
  body += `<g clip-path="url(#pb3-disc)">${aura}</g>`;

  // the bar, over the hands, then the ring over the bar's ends
  // a flat no-sign, as in the founder's reference: a soft red ramp and no
  // outlines, so it reads as a sign behind him rather than one more drawn
  // object
  body += `<g transform="rotate(45 ${cx} ${cy})"><rect x="${cx - rIn - 10}" y="${cy - 36}" width="${2 * rIn + 20}" height="72" fill="url(#pb3-red)"/></g>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${rMid}" fill="none" stroke="url(#pb3-red)" stroke-width="${band}"/>`;

  // jolt lines and two drops beside the head
  body += `<g transform="translate(0 ${v === 'blob' ? 62 : 112})">` +
    line('M282 650 Q266 674 272 702 M256 690 Q244 708 250 730', INK, 5) +
    line('M626 664 Q644 688 638 716 M654 704 Q666 722 660 744', INK, 5) +
    `<path d="M640 786 C648 800 652 810 644 816 C636 820 628 812 632 802 Z" fill="#EAF6FF" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M266 790 C272 802 275 810 269 815 C263 818 257 812 260 804 Z" fill="#EAF6FF" stroke="${INK}" stroke-width="3"/>` +
    `</g>`;

  if (v === 'blob') {
    // the character on his kit blob, in the middle of the sign, calm
    body += figure('beanie', 450, 782, 366, 'pb4', { a: '#FFC83D', b: '#FFF4E6' });
  } else {
    // scared (the site's panic-page face), low inside the sign; the ring's
    // lower arc is drawn again in front and ends his body under the collar
    body += `<g clip-path="url(#pb3-in)">${figure('beanie', 450, 1084, v === 'high' ? 478 : 380, 'pb4', { blob: false, file: SCARED })}</g>`;
    body += `<path d="${arc(rMid, 8, 172)}" fill="none" stroke="url(#pb3-red)" stroke-width="${band}"/>`;
    body += `</g>`;
  }

  return cover(`<linearGradient id="pb3-red" gradientUnits="userSpaceOnUse" x1="${cx - rOut}" y1="${cy - rOut}" x2="${cx + rOut}" y2="${cy + rOut}"><stop offset="0" stop-color="#F2463E"/><stop offset="1" stop-color="#C9241D"/></linearGradient><clipPath id="pb3-in"><circle cx="${cx}" cy="${cy}" r="${rMid}"/></clipPath><clipPath id="pb3-disc"><circle cx="${cx}" cy="${cy}" r="${rIn}"/></clipPath>`, body);
};
