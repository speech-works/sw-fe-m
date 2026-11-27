// The Hard Conversations: a phone held in the reader's hand; the caller (kit
// cast, phone-call) on her kit blob inside the screen, a green bubble carrying
// her words out past the phone's edge. Reference: references/hard_conversations-01.png.
const { figure } = require('../lib/fig.cjs');
// (references/hard_conversations-01.png). A phone seen from above, held in the
// reader's hand; the communicator character rises out of the screen, headset
// on, mid-sentence, a green speech bubble carrying the sound out past the
// phone's edge. Chat bubbles on the screen, no words. The hand is the
// reader's, drawn as one shape (wrist, palm, fingers, thumb) after the
// founder's hand references; our characters stay head and collar only.
const k = require('../lib/draw.cjs');
const { INK, CREAM, line, rng, cover } = k;

module.exports = () => {
  const BG = '#6B63E6';
  const BODY = '#4A5878';
  const SCREEN = '#DDF7EE';
  const FAINT = '#BDEBDC';
  const GREEN = '#8EDB6E';
  const SKIN = '#EDB894';
  const SKIN_D = '#D99A74';
  const cx = 452, cy = 740, rot = -12;
  const W = 480, H = 700, sx = 30, sTop = 96, sBot = 84;
  const tr = `rotate(${rot} ${cx} ${cy})`;
  const x0 = cx - W / 2, y0 = cy - H / 2;
  const scr = { x: x0 + sx, y: y0 + sTop, w: W - sx * 2, h: H - sTop - sBot };
  const defs = `<clipPath id="hc3-front"><rect x="${-W / 2 - 3}" y="${-H / 2 - 3}" width="${W + 6}" height="${H + 6}" rx="67"/><rect x="${-W / 2 - 15}" y="${-H / 2 + 11}" width="${W + 6}" height="${H + 6}" rx="67"/></clipPath><clipPath id="hc3-screen"><rect x="${scr.x}" y="${scr.y}" width="${scr.w}" height="${scr.h}" rx="20" transform="${tr}"/></clipPath>`;

  let body = `<rect width="900" height="1200" fill="${BG}"/>`;
  // confetti dashes on the ground
  const c = rng(404);
  for (let i = 0; i < 70; i++) {
    const x = c() * 900, y = c() * 1200, a = c() * 180, l = 12 + c() * 14;
    body += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${(l * Math.cos(a)).toFixed(1)} ${(l * Math.sin(a)).toFixed(1)}" stroke="#8C86F0" stroke-width="7" stroke-linecap="round"/>`;
  }

  // ── the hand: a graphic grip, ONE shape ───────────────────────────────
  // Drawn as a union (stroked wide, then filled) behind the phone, then the
  // parts that lie on the phone (fingertips and thumb) drawn again clipped to
  // the phone, so there is no seam.
  const E = W / 2;
  const local = `translate(${cx} ${cy}) rotate(${rot})`;
  const NAIL = '#F6D3BC';
  const union = (paths) => `<g fill="${SKIN}" stroke="${INK}" stroke-width="10" stroke-linejoin="round">${paths}</g><g fill="${SKIN}">${paths}</g>`;
  let handBack = '', handFront = '', handFrontExtra = '';
  {
    // After the green reference (the founder's pick): thick fingers come over
    // the phone's right edge with nails; a chunky thumb with a nail on the left.
    const fingers = [[-34, 36, E - 36, E + 96], [38, 36, E - 40, E + 102], [110, 35, E - 36, E + 96], [178, 30, E - 26, E + 84]];
    const bars = fingers.map(([c, h, x0, x1]) => `<rect x="${x0}" y="${c - h}" width="${x1 - x0}" height="${2 * h}" rx="${h}"/>`).join('');
    const palm = `<path d="M${E - 10} -66 L${E + 70} -70 C${E + 116} -66 ${E + 128} 120 ${E + 112} 222 C${E + 98} 300 ${E + 40} 360 ${E} 420 C-20 520 0 600 20 760 L-220 760 C-224 600 -236 470 -272 380 C-302 300 -302 220 -272 150 Z"/>`;
    const thumb = `<path d="M-268 146 C-200 128 -120 124 -60 136 C-18 144 -2 176 -12 206 C-22 234 -56 240 -92 234 C-150 226 -210 238 -268 270 Z"/>`;
    handBack = union(palm + bars + thumb) +
      fingers.slice(0, 3).map(([c, h], i) => { const [c2, h2] = fingers[i + 1]; const y = ((c + h) + (c2 - h2)) / 2; return `<path d="M${E + 2} ${y} L${E + 86} ${y}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; }).join('') +
      `<path d="M-236 392 Q-186 440 -160 540" fill="none" stroke="${SKIN_D}" stroke-width="4" stroke-linecap="round"/>`;
    handFront = union(bars + thumb);
    handFrontExtra = fingers.map(([c, h, x0]) => `<ellipse cx="${x0 + 17}" cy="${c}" rx="11" ry="${(h * 0.55).toFixed(1)}" fill="${NAIL}" stroke="${INK}" stroke-width="3.5"/>`).join('') +
      `<ellipse cx="-38" cy="186" rx="19" ry="23" fill="${NAIL}" stroke="${INK}" stroke-width="3.5"/>` +
      `<path d="M-150 150 Q-140 180 -148 212 M-126 146 Q-116 174 -122 204" fill="none" stroke="${SKIN_D}" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (handBack) body += `<g transform="${local}">${handBack}</g>`;

  // the phone and its screen
  body += `<g transform="${tr}">`;
  body += `<rect x="${x0 - 12}" y="${y0 + 14}" width="${W}" height="${H}" rx="64" fill="#2E3850" stroke="${INK}" stroke-width="5"/>`;
  body += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="64" fill="${BODY}" stroke="${INK}" stroke-width="5"/>`;
  body += `<rect x="${cx - 70}" y="${y0 + 40}" width="140" height="18" rx="9" fill="#2E3850" stroke="${INK}" stroke-width="4"/><circle cx="${cx + 104}" cy="${y0 + 49}" r="10" fill="#2E3850" stroke="${INK}" stroke-width="4"/>`;
  body += `<rect x="${scr.x}" y="${scr.y}" width="${scr.w}" height="${scr.h}" rx="20" fill="${SCREEN}" stroke="${INK}" stroke-width="4.5"/>`;
  body += line(`M${scr.x + 30} ${scr.y + 40} L${scr.x + 120} ${scr.y + 20}`, '#FFFFFF', 10, 'opacity="0.8"');
  body += `</g>`;
  // older messages up the screen, behind the character
  body += `<g clip-path="url(#hc3-screen)"><g transform="${tr}">` +
    `<rect x="${scr.x + 36}" y="${scr.y + 70}" width="200" height="56" rx="28" fill="${FAINT}"/>` +
    `<rect x="${scr.x + scr.w - 230}" y="${scr.y + 150}" width="190" height="56" rx="28" fill="${FAINT}"/>` +
    `</g></g>`;

  // the character on a call, on her kit blob inside the screen
  body += `<g clip-path="url(#hc3-screen)">${figure('phone-call', 470, 780, 330, 'hc4', { tilt: -6 })}</g>`;

  // the green bubble, out past the phone's edge, tail toward the mouth
  const bub = `<path d="M118 556 H300 A62 62 0 0 1 300 680 H118 A62 62 0 0 1 118 556Z"/><path d="M318 644 Q340 668 382 684 Q348 650 352 618 Z"/>`;
  body += `<g fill="${GREEN}" stroke="${INK}" stroke-width="10" stroke-linejoin="round">${bub}</g><g fill="${GREEN}">${bub}</g>`;
  body += line('M120 588 Q112 600 124 610', '#C8F0B4', 6);
  body += line('M226 596 Q244 618 226 640 M250 584 Q276 618 250 652 M274 572 Q308 618 274 664', '#3E7A31', 5);

  // the parts of the hand that lie on the phone
  if (handFront) body += `<g transform="${local}" clip-path="url(#hc3-front)">${handFront}${handFrontExtra}</g>`;

  return cover(defs, body);
};
