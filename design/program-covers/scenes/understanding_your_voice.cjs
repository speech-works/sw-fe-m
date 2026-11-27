// Understanding Your Voice: the iceberg, labelled in the program's day 1 words
// (Blocks, Repetitions; Fear, Swapped words, Avoidance, Tiredness), and a yellow
// submarine surfacing, the headphones figure (kit cast) in its porthole, no
// blob: the porthole's edge ends his body under the collar.
const { figure } = require('../lib/fig.cjs');
// simpler at the founder's request. Two flat colours, one iceberg (a small tip
// above the water, the much bigger part below), one round submarine whose
// porthole shows the headscarf character, and sonar arcs reaching for the
// hidden part, a few fish, and small labels on the iceberg in the program's
// own words. No aurora, weed or floes.
const k = require('../lib/draw.cjs');
const { INK, CREAM, ORANGE, line, cover } = k;

module.exports = (v = 'blob') => {
  const NB = v === 'noblob';
  const SKY = '#8FC9E6';
  const SEA = '#2E7FB8';
  const ICE = '#F7FBFD';
  const ICE_S = '#CFE7F2';
  const ICE_UNDER = '#7FB9DA';
  const SUB = '#FFC542';
  const SUB_D = '#E0A23A';
  const WL = 540;
  const PX = 650, PY = 930, PR = 124;
  const o = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const defs = `<clipPath id="uv3-port"><circle cx="${PX}" cy="${PY}" r="${PR}"/></clipPath>`;

  let body = `<rect width="900" height="${WL}" fill="${SKY}"/>`;
  body += `<rect y="${WL}" width="900" height="${1200 - WL}" fill="${SEA}"/>`;

  // the iceberg's hidden part, under the water: much bigger than the tip
  body += `<path d="M196 ${WL} L478 ${WL} L524 640 L500 780 L524 900 L462 1046 L320 1100 L176 1060 L100 930 L134 800 L88 680 Z" fill="${ICE_UNDER}" ${o(4.5)}/>`;
  body += line(`M330 ${WL + 30} L292 760 L350 960 M292 760 L496 780`, '#A9D3EA', 4);

  // the small tip above the water
  body += `<path d="M206 ${WL} L270 446 L310 470 L352 372 L412 438 L470 ${WL} Z" fill="${ICE}" ${o(5)}/>`;
  body += `<path d="M352 372 L412 438 L470 ${WL} L392 ${WL} L374 452 Z" fill="${ICE_S}"/>`;
  body += line(`M352 372 L374 452 L392 ${WL}`, INK, 3.5);
  body += `<path d="M206 ${WL} L270 446 L310 470 L352 372 L412 438 L470 ${WL}" fill="none" ${o(5)}/>`;

  // small labels, in the program's own words (day 1, Sheehan's picture):
  // the part people hear on the tip, the part nobody sees below the line.
  // Soft tags in Inter, the app's font: no outline, so they read as labels
  // on the picture rather than as more objects in it. The covers carry no
  // text otherwise; the founder asked for these.
  const NAVY = '#16324C';
  const tag = (x, y, text, fill, anchor = 'start', ink = NAVY, size = 21) => {
    const w = Math.round(text.length * size * 0.54 + 30), h = size + 16;
    const left = anchor === 'middle' ? x - w / 2 : x;
    return `<rect x="${left}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>` +
      `<text x="${left + w / 2}" y="${(y + size * 0.36).toFixed(1)}" text-anchor="middle" font-family="Inter, Helvetica Neue, Arial, sans-serif" font-weight="600" font-size="${size}" letter-spacing="0.2" fill="${ink}">${text}</text>`;
  };
  // the part people hear: dark tags with white text, so they stand out on the
  // white tip
  body += tag(352, 470, 'Blocks', INK, 'middle', '#FFFFFF') + tag(336, 514, 'Repetitions', INK, 'middle', '#FFFFFF');
  ['Fear', 'Swapped words', 'Avoidance', 'Tiredness'].forEach((t, i) => {
    body += tag(150, 646 + i * 96, t, 'rgba(255,255,255,0.86)');
  });

  // the water line, drawn over both parts
  body += line(`M-10 ${WL} L910 ${WL}`, '#D7EEF7', 6);

  // a few fish, as on the round 2 cover: an orange school by the iceberg and
  // a lime pair lower down, swimming clear of the sonar
  const fish = (x, y, sc, c, dir = 1) => `<g transform="translate(${x} ${y}) scale(${dir * sc} ${sc})"><path d="M0 0 q18 -12 40 0 q-22 12 -40 0z M40 0 l14 -9 l0 18z" fill="${c}" stroke="${INK}" stroke-width="${(3 / sc).toFixed(2)}" stroke-linejoin="round"/><circle cx="9" cy="-1.5" r="${(2.2 / sc).toFixed(2)}" fill="${INK}"/></g>`;
  body += fish(640, 960, 1.4, '#FFB580', -1) + fish(702, 996, 1.15, '#FFB580', -1) + fish(632, 1026, 1.05, '#FFB580', -1);
  body += fish(130, 1146, 1.4, '#C8F750') + fish(214, 1110, 1.15, '#C8F750');
  body += fish(820, 1110, 1.25, '#FFB580', -1);

  // sonar arcs from the porthole toward the hidden part
  [140, 190, 240].forEach((r, i) => {
    const a1 = (152 * Math.PI) / 180, a2 = (208 * Math.PI) / 180;
    body += `<path d="M${(PX + r * Math.cos(a2)).toFixed(1)} ${(PY + r * Math.sin(a2)).toFixed(1)} A${r} ${r} 0 0 0 ${(PX + r * Math.cos(a1)).toFixed(1)} ${(PY + r * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${CREAM}" stroke-width="7" stroke-linecap="round" opacity="${(0.95 - i * 0.25).toFixed(2)}"/>`;
  });

  // the submarine, surfacing: its tower breaks the water line
  body += `<g transform="translate(0 ${NB ? -278 : -236})">`;
  // the submarine: periscope up to the surface, tower, round body, propeller
    body += `<rect x="676" y="752" width="130" height="70" rx="18" fill="${SUB}" ${o()}/>`;
  body += `<path d="M878 900 L912 868 L912 990 L878 958 Z" fill="${SUB_D}" ${o(4.5)}/>`;
  body += `<ellipse cx="716" cy="${PY}" rx="184" ry="138" fill="${SUB}" ${o()}/>`;
  body += `<path d="M800 ${PY - 122} C836 ${PY - 108} 866 ${PY - 80} 882 ${PY - 40}" fill="none" stroke="#FFE08A" stroke-width="9" stroke-linecap="round"/>`;

  // the porthole and the character in it
  body += `<circle cx="${PX}" cy="${PY}" r="${PR + 20}" fill="${SUB_D}" ${o()}/>`;
  body += `<circle cx="${PX}" cy="${PY}" r="${PR}" fill="#BFE3F4"/>`;
  body += `<g clip-path="url(#uv3-port)">${(NB ? figure('headphones', PX, PY + PR - 7, 200, 'uv4', { blob: false }) : figure('headphones', PX, PY + 84, 180, 'uv4', { a: '#FF9040' }))}</g>`;
  body += `<circle cx="${PX}" cy="${PY}" r="${PR}" fill="none" ${o(4.5)}/>`;
  body += line(`M${PX - 70} ${PY - 30} A108 108 0 0 1 ${PX - 38} ${PY - 100}`, '#FFFFFF', 7, 'opacity="0.6"');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    body += `<circle cx="${(PX + (PR + 10) * Math.cos(a)).toFixed(1)}" cy="${(PY + (PR + 10) * Math.sin(a)).toFixed(1)}" r="4.5" fill="${INK}"/>`;
  }
  // a small second porthole
  body += `<circle cx="842" cy="${PY - 10}" r="24" fill="${SUB_D}" ${o(4)}/><circle cx="842" cy="${PY - 10}" r="14" fill="#BFE3F4" ${o(3)}/>`;

  // three bubbles rising
  [[590, 760, 9], [574, 724, 6], [598, 694, 4.5]].forEach(([x, y, r]) => {
    body += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${CREAM}" stroke-width="3.5"/>`;
  });
  body += `</g>`;
  return cover(defs, body);
};
