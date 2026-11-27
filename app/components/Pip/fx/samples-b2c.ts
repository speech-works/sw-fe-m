/**
 * Moment samples, batch 2 part C: new options for the two moments the founder sent back with "think of more options"
 * (they replace the earlier options): first AI call done, and paired with a practice buddy. Both play on the "stage" screen:
 * the plain dark canvas, Pip on his blob in the middle (his picture x 75-315, y 250-490). Props act on a floor BELOW him
 * (y 500-710) or fly round him; nothing crosses his face or collar. Positions are in the screen's points (390 x 844).
 * Every option has a SYNC note: which visual hit lands on which sound hit.
 */
import type { FxEffect, FxEmitter } from "./types";
import { FXK } from "./library";

const W = 390, H = 844;
const at = (x: number, y: number): [number, number] => [x / W, y / H];
const px = (n: number) => n / W;
const LIME = "#DFFF2E", PINK = "#FF9BD8", GOLD = "#FFC530", SUN = "#FFD84A", OR = "#FF7A1A", CREAM = "#FFF9E9", BLUE = "#1E7BFF",
  SKY = "#22D3FF", TEAL = "#2BB3A3", CLAY = "#E9793F", CHAI = "#E2A565", FLOOR = "#2B2824";
type E = FxEmitter;
type K = NonNullable<E["keys"]>[number];
type P = [number, number];
const { depth, toss, fall, sparks: fsparks, shell } = FXK;

// ───────────────────────────── helpers (as in ./samples-b2b.ts) ─────────────────────────────
const tr = (shape: string, o: P, size: number, keys: K[], more: Partial<E> = {}): E =>
  ({ kind: "track", shapes: [shape], origin: at(o[0], o[1]), size: [size, size], at: 0, keys, ...more });
type Full = Required<Omit<K, "e">> & { e: K["e"] };
const norm = (keys: K[]): Full[] => { let x = 0, y = 0, r = 0, s = 1, o = 1;
  return keys.map(k => ({ t: k.t, x: (x = k.x ?? x), y: (y = k.y ?? y), r: (r = k.r ?? r), s: (s = k.s ?? s), o: (o = k.o ?? o), e: k.e })); };
const ez = (u: number, e: K["e"]) => e === "out" ? 1 - Math.pow(1 - u, 3) : e === "in" ? u * u * u : e === "lin" ? u : e === "hold" ? (u >= 1 ? 1 : 0)
  : e === "back" ? 1 + 3.2 * Math.pow(u - 1, 3) + 2.2 * Math.pow(u - 1, 2) : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const poseAt = (N: Full[], t: number): Full => {
  if (t <= N[0].t) return { ...N[0], t };
  const j = N.findIndex(k => k.t > t); if (j < 0) return { ...N[N.length - 1], t };
  const a = N[j - 1], b = N[j], u = ez((t - a.t) / (b.t - a.t), b.e), L = (p: number, q: number) => p + (q - p) * u;
  return { t, x: L(a.x, b.x), y: L(a.y, b.y), r: L(a.r, b.r), s: L(a.s, b.s), o: L(a.o, b.o), e: b.e };
};
const withTimes = (keys: K[], times: number[]): Full[] => { const N = norm(keys);
  return [...N, ...times.filter(t => !N.some(k => k.t === t)).map(t => poseAt(N, t))].sort((a, b) => a.t - b.t); };
/** A part that is only seen during `spans` ([from, to] ms) and moves with the body: a face that changes, a flag that waves. */
const gated = (body: K[], spans: [number, number][]): K[] => {
  const flips = spans.flat().filter(t => t > 0 && isFinite(t)), N = withTimes(body, flips), on = (t: number) => spans.some(([a, b]) => t >= a && t < b);
  return N.flatMap((k): K[] => flips.includes(k.t) ? [{ ...k, t: k.t - 1, o: on(k.t - 1) ? k.o : 0 }, { ...k, o: on(k.t) ? k.o : 0, e: "hold" }] : [{ ...k, o: on(k.t) ? k.o : 0 }]);
};
/** One prop that changes its look: looks[i] shows from cuts[i] to cuts[i + 1] (cuts start at 0; the last look stays). */
const looks = (shapes: string[], cuts: number[], o: P, size: number, body: K[], more: Partial<E> = {}): E[] =>
  [...new Set(shapes)].map(sh => tr(sh, o, size, gated(body, shapes.flatMap((s, i): [number, number][] => s === sh ? [[cuts[i], cuts[i + 1] ?? Infinity]] : [])), more));
/** Hops through points, each a parabola sampled every ~30 ms. pts: [time, x pt, y pt, arc height to the NEXT point]; offsets from `o`. */
function hops(o: P, pts: [number, number, number, number][], tilt = 0, squash = 0.92): K[] {
  const keys: K[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ta, xa, ya, h] = pts[i], [tb, xb, yb] = pts[i + 1], n = Math.max(2, Math.round((tb - ta) / 30));
    for (let k = i ? 1 : 0; k <= n; k++) { const u = k / n;
      keys.push({ t: Math.round(ta + (tb - ta) * u), x: px(xa + (xb - xa) * u - o[0]), y: px(ya + (yb - ya) * u - 4 * h * u * (1 - u) - o[1]), r: -tilt * Math.sin(Math.PI * u), s: k === n ? squash : 1, e: "lin" }); }
  }
  return keys;
}
const hop = (t: number, h: number, d = 300): K[] => [{ t, y: 0, s: 1 }, { t: t + d * 0.45, y: px(-h), e: "out" }, { t: t + d * 0.9, y: 0, s: 0.94, e: "in" }, { t: t + d * 1.25, s: 1, e: "back" }];
const popIn = (t: number, d = 280): K[] => [{ t: 0, s: 0 }, ...(t > 0 ? [{ t, s: 0, e: "hold" as const }] : []), { t: t + d, s: 1, e: "back" }];
const popOut = (t: number, d = 240): K[] => [{ t, s: 1 }, { t: t + d * 0.35, s: 1.1, e: "out" }, { t: t + d, s: 0, e: "in" }];
/** The flat ground patch under a prop: it follows the prop sideways and shrinks while the prop is in the air. */
const ground = (o: P, floorY: number, size: number, body: K[], lift = 1): E => tr("b2-shadow", [o[0], floorY], size,
  norm(body).map(b => ({ t: b.t, x: b.x, y: 0, r: 0, s: Math.max(0, Math.min(1.1, b.s)) * Math.max(0.35, 1 + Math.min(0, b.y) * 3.2 * lift), o: Math.min(1, b.o), e: b.e })), { colors: [FLOOR], layer: "back" });
const glint = (o: P, t: number, colors: string[], n = 12, more: Partial<E> = {}): E =>
  ({ kind: "burst", shapes: ["sparkle", "glitter", "dot"], colors, origin: at(o[0], o[1]), at: t, count: n, spread: [0, 360], speed: [0.22, 0.55], drag: 3, gravity: 0.08, size: [0.024, 0.05], life: [650, 1000], fadeOut: 400, ...more });
const twinkleBox = (c: P, w: number, h: number, t: number, n: number, colors: string[], stagger = 800): E =>
  ({ kind: "twinkle", shapes: ["sparkle", "sparkpair"], colors, count: n, at: t, stagger, area: [(c[0] - w) / W, (c[1] - h) / H, (c[0] + w) / W, (c[1] + h) / H], size: [0.035, 0.07], life: [500, 800] });
/** Everything that flies or falls across the screen goes BEHIND Pip and his blob, so nothing ever crosses his face or collar. */
const behind = (es: E[]): E[] => es.map(e => ({ ...e, layer: "back" as const }));
const puff1 = (shape: string, color: string, o: P, t: number, ang = -90, size = 0.07, more: Partial<E> = {}): E =>
  ({ kind: "burst", shapes: [shape], colors: [color], origin: at(o[0], o[1]), at: t, count: 1, spread: [ang, ang], speed: [0.16, 0.16], drag: 1.2, gravity: -0.02, size: [size, size], life: [900, 900], fadeIn: 80, fadeOut: 450, upright: true, ...more });
const ring = (o: P, t: number, size: number, color: string, life = 520): E => ({ kind: "ring", shapes: ["p3-ripple"], colors: [color], origin: at(o[0], o[1]), at: t, size: [size, size], life: [life, life], opacity: 0.85, layer: "back" });
/** A comic impact burst: it snaps open and fades. */
const bam = (o: P, t: number, size: number, color: string, turn = 0): E => tr("c2-bam", o, size, [{ t: 0, s: 0, o: 0, r: turn }, { t, s: 0.35, o: 1, e: "hold" }, { t: t + 110, s: 1, e: "out" }, { t: t + 260, s: 1.06, r: turn + 8 }, { t: t + 420, s: 1.12, o: 0 }],
  { colors: [color], layer: "back" });
/** A flight along a smooth line through `pts` (points on the screen) from t0 to t1: the nose turns with the path. Offsets from `o`. */
function fly(o: P, pts: P[], t0: number, t1: number, step = 40): { keys: K[]; at: (t: number) => P } {
  const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
  const S: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 14; k++) S.push([cr(p0[0], p1[0], p2[0], p3[0], k / 14), cr(p0[1], p1[1], p2[1], p3[1], k / 14)]); }
  S.push(pts[pts.length - 1]);
  const D = [0]; for (let i = 1; i < S.length; i++) D.push(D[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const L = D[D.length - 1], pos = (d: number): P => { const j = Math.min(S.length - 1, Math.max(1, D.findIndex(v => v >= d))), u = (d - D[j - 1]) / Math.max(0.001, D[j] - D[j - 1]);
    return [S[j - 1][0] + (S[j][0] - S[j - 1][0]) * u, S[j - 1][1] + (S[j][1] - S[j - 1][1]) * u]; };
  const pace = (u: number) => 0.25 * u * u + 0.75 * u;   // a soft start
  const n = Math.round((t1 - t0) / step), keys: K[] = []; let prev = 0;
  for (let j = 0; j <= n; j++) { const d = L * pace(j / n), p = pos(d), a = pos(Math.max(0, d - 6)), b = pos(Math.min(L, d + 6));
    let r = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI; while (r - prev > 180) r -= 360; while (r - prev < -180) r += 360; prev = r;
    keys.push({ t: Math.round(t0 + (t1 - t0) * (j / n)), x: px(p[0] - o[0]), y: px(p[1] - o[1]), r, e: "lin" }); }
  return { keys, at: (t: number) => pos(L * pace(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))))) };
}
const cannon = (x: number, dir: [number, number], t: number, n: number): E[] => behind(depth(toss({ origin: at(x, 760), spread: dir, speed: [0.75, 1.4], at: t }), n));
const starFall = (t: number, n: number, colors: string[]): E[] => behind(depth(fall({ at: t, shapes: ["star", "star", "sparkle"], colors, speed: [0.34, 0.52], gravity: 0.08, sway: 0.02, spin: [40, 160], size: [0.035, 0.065], life: [1500, 1700], stagger: 500, flip: false }), n));

// ═════════════════════ First AI call done (once ever, big) ═════════════════════
// A. The mic drop. The mic is 0.36 wide (140 pt); its foot is 64 pt under its middle; the floor is y 698.
const MIC: P = [195, 634], MS = 0.44, D1 = 700, D2 = D1 + 300, D3 = D1 + 585, COOL = 1650, BOOM = 1950;
const micKeys: K[] = [{ t: 0, x: px(150), y: px(-780), r: -170, s: 1 }, { t: D1, x: px(150), y: 0, r: 8, e: "in" },
  ...hops(MIC, [[D1, 345, 634, 84], [D2, 268, 634, 44], [D3, 195, 634, 0]], -16, 0.9).slice(1), { t: D3 + 150, s: 1, r: 0, e: "back" },
  { t: COOL - 50, s: 1 }, { t: COOL, s: 1.16, e: "out" }, { t: COOL + 180, s: 1, e: "back" }, ...hop(2450, 44, 330), ...hop(2900, 28, 300), { t: 4350, r: 0 }, { t: 4420, r: -8, e: "out" }, ...popOut(4450)];
// B. The voice that flies. The ribbon is 0.52 wide; the plane 0.27.
const WV: P = [195, 620], FOLD = 950, TO = 1420, OUT = 3400;
const WAVE_HITS = [100, 210, 320, 430, 520, 630, 740, 850];
const waveKeys: K[] = [...popIn(0, 90), ...WAVE_HITS.flatMap((t): K[] => [{ t, s: 1.1, e: "hold" }, { t: t + 90, s: 1, e: "out" }]), { t: FOLD, s: 1, r: 0 }, { t: FOLD + 110, s: 0.2, r: -16, e: "in" }, { t: FOLD + 111, o: 0, e: "hold" }];
const PLANE_O: P = [195, 620];
const flight = fly(PLANE_O, [[183, 622], [300, 600], [358, 480], [352, 310], [292, 196], [195, 156], [98, 196], [38, 310], [32, 480], [92, 610], [195, 650], [310, 600], [392, 430], [480, 170]], TO, OUT);
const planeKeys: K[] = [{ t: 0, s: 0 }, { t: FOLD + 60, s: 0, e: "hold" }, { t: FOLD + 300, s: 1, e: "back" }, { t: TO - 180, x: 0, y: 0, r: 0 }, { ...flight.keys[0], e: "out" }, ...flight.keys.slice(1)];
// C. A flag on the summit. The peak is 0.44 wide (172 pt), its top 62 pt over its middle; the flag 0.26 (101 pt), its foot 47 pt
// under its middle and 20 pt left of it.
const PK: P = [195, 660], PKS = 0.5, FL: P = [218, 542], FLS = 0.3, PLANT = 1150, UNF = 1560;
const peakKeys: K[] = [{ t: 0, y: px(210), s: 1 }, { t: 400, y: 0, e: "back" }, { t: PLANT, s: 1 }, { t: PLANT + 70, s: 0.93, e: "out" }, { t: PLANT + 320, s: 1, e: "back" },
  { t: UNF, s: 1 }, { t: UNF + 90, s: 1.06, e: "out" }, { t: UNF + 300, s: 1 }, ...popOut(3950)];
const flagKeys: K[] = [...hops(FL, [[160, 470, 682, 64], [620, 340, 682, 136], [PLANT, 218, 546, 0]], 12, 1), { t: PLANT + 70, y: px(8), r: 7, e: "out" }, { t: PLANT + 200, r: -5 }, { t: PLANT + 320, y: px(4), r: 0 },
  { t: UNF, s: 1 }, { t: UNF + 90, s: 1.12, e: "out" }, { t: UNF + 300, s: 1, e: "back" }, ...popOut(3950)];
const FLAG_CUTS = [0, UNF, ...Array.from({ length: 11 }, (_, i) => UNF + 210 * (i + 1))];

const firstCall: FxEffect[] = [
  // SYNC: the mic hits the floor on the three taps of lab-a2-mic-tap-1 (700, 1000, 1285 ms): the first with the comic burst, the
  // ring and Pip's jump; the dark glasses go on with lab-lock-click-1 (1650); both confetti cannons fire on lab-cannon-confetti-1 (1950).
  { id: "fc-mic-drop", name: "Mic drop", ms: 5000,
    feel: "A big hand mic with a face drops out of the sky beside Pip, hits the floor with a comic burst and bounces to the middle on three taps. It stands up, puts on dark glasses, and two confetti cannons go off. Pip jumps at the drop, then gives his palms-up \"no big deal\" shrug with a proud face. You made the call.",
    emitters: [
      ground(MIC, 714, 0.3, micKeys, 0.6),
      bam([330, 704], D1, 0.42, GOLD), ring([338, 710], D1, 0.6, CREAM), ring([268, 712], D2, 0.4, CREAM, 400), ring([195, 712], D3, 0.34, CREAM, 380),
      fsparks({ origin: at(345, 704), at: D1, count: 14, colors: [GOLD, SUN, CREAM], spread: [-170, -10], speed: [0.3, 0.7], layer: "back" }),
      ...looks(["c2-mic-whoa", "c2-mic", "c2-mic-cool"], [0, D3, COOL], MIC, MS, micKeys),
      glint([195, 584], COOL + 20, [CREAM, SUN, LIME], 8, { speed: [0.14, 0.34] }),
      ...cannon(-6, [-74, -44], BOOM, 26), ...cannon(396, [-136, -106], BOOM + 90, 26),
      ...starFall(BOOM + 500, 22, [GOLD, SUN, LIME, PINK, CREAM]),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 250, volume: 0.5 }, { name: "lab-a2-mic-tap-1", at: D1, volume: 0.95 }, { name: "lab-lock-click-1", at: COOL, volume: 0.8 },
      { name: "lab-cannon-confetti-1", at: BOOM, volume: 0.8 }, { name: "lab-cheer-short-1", at: BOOM + 80, volume: 0.6 }, { name: "lab-hop-boing-small-1", at: 2450, volume: 0.4 }, { name: "pop", at: 4500, volume: 0.35 }],
    pip: [{ at: 0, look: [0.9, -1], face: "curious" }, { at: 450, look: [0.9, 0.2] }, { at: D1, look: [0.9, 1], face: "laugh", body: "bighop", haptic: "success" }, { at: D2, look: [0.5, 1] }, { at: D3, look: [0, 1], face: "smile" },
      { at: COOL + 60, look: "off", face: "proud", move: "h-palms" }, { at: BOOM, haptic: "light" }, { at: 4950, face: "warm" }] },
  // SYNC: the ribbon beats on the eight notes of lab-a2-marimba-wave-1 played twice (100 ... 430, 520 ... 850 ms); it folds into the
  // plane on lab-page-flip-1 (950); take-off on lab-swoosh-soft-2 (1420) under lab-harp-gliss-1; the plane leaves the screen
  // where lab-firework-pop-1 bursts (3440), with Pip's jump.
  { id: "fc-voice-flies", name: "Your voice takes off", ms: 5100,
    feel: "Your voice shows as a bright ribbon under Pip, beating like speech. It folds itself into a paper plane, lifts off, flies one full loop right round Pip with a trail of sparkles, and shoots off the top of the screen into a burst of stars. Pip listens first, follows it all the way round with his eyes, then jumps. Your voice went out into the world.",
    emitters: [
      ...looks(["c2-wave-a", "c2-wave-b", "c2-wave-a", "c2-wave-b", "c2-wave-a", "c2-wave-b", "c2-wave-a", "c2-wave-b", "c2-wave-a"], [0, ...WAVE_HITS], WV, 0.6, waveKeys),
      glint([195, 620], FOLD + 80, [CREAM, LIME, PINK], 12),
      tr("c2-plane", PLANE_O, 0.32, planeKeys),
      ...Array.from({ length: 22 }, (_, i): E => { const t = TO + 120 + i * 88, p = flight.at(t - 70);
        return { kind: "burst", shapes: [i % 3 ? "sparkle" : "dot"], colors: [[LIME, CREAM, PINK, SUN][i % 4]], origin: at(p[0], p[1]), at: t, count: 1, spread: [0, 360], speed: [0.01, 0.05], gravity: 0.03, size: [0.035, 0.065], life: [700, 950], fadeIn: 40, fadeOut: 420, layer: "back" }; }),
      ...shell(0.86, 0.17, OUT + 40, [LIME, CREAM, PINK], "back", 22), ...shell(0.6, 0.1, OUT + 330, [GOLD, SUN, CREAM], "back", 16),
      ...starFall(OUT + 150, 26, [LIME, PINK, GOLD, CREAM, SUN]),
    ],
    sounds: [{ name: "lab-a2-marimba-wave-1", at: 100, volume: 0.6 }, { name: "lab-a2-marimba-wave-1", at: 520, volume: 0.7 }, { name: "lab-page-flip-1", at: FOLD, volume: 0.8 }, { name: "lab-swoosh-soft-2", at: TO, volume: 0.6 },
      { name: "lab-harp-gliss-1", at: TO + 80, volume: 0.5 }, { name: "lab-firework-pop-1", at: OUT + 40, volume: 0.8 }, { name: "lab-firework-pop-2", at: OUT + 330, volume: 0.6 }, { name: "lab-stars-twinkle-1", at: OUT + 200, volume: 0.5 }],
    pip: [{ at: 0, look: [0, 1], face: "listening" }, { at: FOLD, face: "curious" }, { at: TO + 150, look: [0.9, 0.8], face: "smile" }, { at: TO + 480, look: [1, -0.2] }, { at: TO + 780, look: [0.6, -1] }, { at: TO + 950, look: [-0.5, -1] },
      { at: TO + 1150, look: [-1, -0.2] }, { at: TO + 1400, look: [-0.8, 0.9] }, { at: TO + 1600, look: [0.3, 1] }, { at: TO + 1800, look: [1, 0] }, { at: OUT - 80, look: [0.9, -1] },
      { at: OUT + 40, face: "laugh", body: "bighop", haptic: "success" }, { at: OUT + 900, look: "off", face: "proud", body: "pop" }, { at: 4700, face: "warm" }] },
  // SYNC: the flag lands on the floor on lab-hop-boing-small-2 (620 ms) and plants itself in the summit on the thud of
  // lab-rubber-stamp-2 (1150) with Pip's nod; it flies open on lab-party-horn-1 (1560) with Pip's jump; the three fireworks open
  // on lab-firework-pop-1/2 (1980, 2280, 2580).
  { id: "fc-summit-flag", name: "A flag on the summit", ms: 4350,
    feel: "A little mountain with a face pushes up under Pip. A rolled-up flag pogo-hops in, takes one big leap and plants itself in the summit; the mountain blinks, the flag flies open with a big 1 on it and waves while fireworks go up behind Pip. He nods at the planting, jumps when the flag opens, then stands proud. Your first call: this ground is yours now.",
    emitters: [
      ground(PK, 738, 0.46, peakKeys.map(k => ({ ...k, y: 0 }))),
      ...looks(["c2-peak", "c2-peak-happy"], [0, PLANT], PK, PKS, peakKeys, { colors: [BLUE] }),
      ...looks(["c2-flag-furled", ...FLAG_CUTS.slice(1).map((_, i) => (i % 2 ? "c2-flag-b" : "c2-flag-a"))], FLAG_CUTS, FL, FLS, flagKeys, { colors: [OR] }),
      ring([317, 736], 620, 0.3, CREAM, 380), bam([195, 594], PLANT, 0.34, GOLD), glint([195, 590], PLANT, [CREAM, SUN, GOLD], 10, { spread: [-170, -10] }),
      glint([250, 522], UNF + 40, [OR, GOLD, CREAM], 10),
      ...shell(0.16, 0.2, 1980, [GOLD, SUN, OR], "back", 20), ...shell(0.85, 0.15, 2280, [PINK, LIME, CREAM], "back", 20), ...shell(0.5, 0.09, 2580, [SKY, CREAM, LIME], "back", 18),
      ...starFall(2100, 24, [GOLD, SUN, CREAM, LIME]),
    ],
    sounds: [{ name: "lab-cartoon-boing-1", at: 0, volume: 0.5 }, { name: "lab-hop-boing-small-2", at: 620, volume: 0.6 }, { name: "lab-rubber-stamp-2", at: PLANT, volume: 0.9 }, { name: "lab-party-horn-1", at: UNF, volume: 0.7 },
      { name: "lab-firework-pop-1", at: 1980, volume: 0.75 }, { name: "lab-firework-pop-2", at: 2280, volume: 0.7 }, { name: "lab-firework-pop-1", at: 2580, volume: 0.6 }, { name: "lab-cheer-short-2", at: 2050, volume: 0.55 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: 300, look: [0.9, 1] }, { at: 900, look: [0.6, 0.9] }, { at: PLANT, look: [0.1, 1], face: "smile", body: "nod", haptic: "light" },
      { at: UNF, face: "laugh", body: "bighop", haptic: "success" }, { at: 2280, look: [0.7, -0.9] }, { at: 2580, look: [0, -1] }, { at: 3000, look: "off", face: "proud", body: "pop" }, { at: 3950, face: "warm", body: "settle" }] },
];

// ═════════════════════ Paired with a practice buddy (per pairing, medium) ═════════════════════
// A. Two puzzle pieces, 0.4 wide (156 pt). Joined, the right piece's box sits 0.28 of a box to the right of the left one's.
const PZS = 0.46, PZ_L: P = [195 - 0.14 * PZS * W, 622], PZ_R: P = [195 + 0.14 * PZS * W, 622], CLICK = 1150;
const together: K[] = [...hop(1500, 46, 340), ...hop(1950, 26, 300), { t: 2480, x: 0, r: 0 }, { t: 2600, x: px(-16), r: -7, e: "out" }, { t: 3100, x: px(360), r: 14, e: "in" }];
const pieceKeys = (side: -1 | 1): K[] => [{ t: 0, x: px(side * 250), r: side * 10, s: 1 }, { t: 480, x: px(side * 44), r: 0, e: "out" },
  { t: 620, r: side * -8 }, { t: 760, r: side * 6 }, { t: 880, r: 0 }, { t: 1020, x: px(side * 62), r: side * 6, e: "out" },
  { t: CLICK, x: 0, r: 0, e: "in" }, { t: CLICK + 50, s: 0.93 }, { t: CLICK + 260, s: 1, e: "back" }, ...together];
// B. The high five: two glove props, 0.36 wide (140 pt).
const HF: P = [195, 660], HFS = 0.42, SLAP = 950;   // low enough that the slap and its sparks stay clear of Pip's collar
const gloveKeys = (side: -1 | 1, late: number): K[] => [{ t: 0, x: px(side * 150), y: px(190), r: side * 30, s: 1 }, ...(late ? [{ t: late, x: px(side * 150), y: px(190), r: side * 30, e: "hold" as const }] : []),
  { t: 420 + late, x: px(side * 108), y: px(26), r: side * 34, e: "out" }, { t: SLAP - 190, x: px(side * 122), y: px(30), r: side * 46 },
  { t: SLAP, x: px(side * 34), y: 0, r: side * -14, e: "in" }, { t: SLAP + 50, s: 0.9 }, { t: SLAP + 260, x: px(side * 58), r: side * -6, s: 1, e: "out" },
  { t: 1500, r: side * -6 }, { t: 1620, r: side * 10 }, { t: 1740, r: side * -8 }, { t: 1860, r: side * 10 }, { t: 1980, r: side * -4 },
  { t: 2150, x: px(side * 58), y: 0 }, { t: 2650, x: px(side * 170), y: px(200), r: side * 30, e: "in" }];
// C. Two clay cups of chai, 0.3 wide (117 pt).
const CH_L: P = [130, 630], CH_R: P = [260, 630], CHS = 0.38, CLINK = 950;
const cupKeys = (side: -1 | 1): K[] => [...popIn(side < 0 ? 0 : 160, 260), { t: 620, x: 0, y: 0, r: 0 }, { t: 800, x: px(side * 8), r: side * 9, e: "out" },
  { t: CLINK, x: px(side * -17), y: px(-16), r: side * -16, e: "in" }, { t: CLINK + 90, x: px(side * -9), r: side * -11, e: "out" }, { t: CLINK + 180, x: px(side * -17), r: side * -16, e: "in" },
  { t: CLINK + 330, x: px(side * -10), y: px(-34), r: 0, e: "out" }, { t: CLINK + 510, x: px(side * -6), y: 0, s: 0.93, e: "in" }, { t: CLINK + 640, s: 1, e: "back" },
  { t: 1900, r: 0 }, { t: 2100, r: 7 }, { t: 2350, r: -7 }, { t: 2600, r: 7 }, { t: 2800, r: 0 }, ...popOut(2950 + (side < 0 ? 0 : 80))];

const buddy: FxEffect[] = [
  // SYNC: the two pieces snap together on lab-lock-click-1 (1150 ms) with the ring, the heart (heart-blip, 1230) and Pip's small
  // grow; they jump as one on lab-kalimba-warm-1 (1500) and on "pop" (1950) with Pip's two hops.
  { id: "bp-puzzle-click", name: "Two pieces click", ms: 3250,
    feel: "Two big puzzle pieces with faces slide in from the two sides under Pip, look each other over, pull back and click together: a perfect fit. A heart pops out of the join, they jump as one piece and slide off side by side. Pip looks from one to the other, then hops with them. You and your buddy fit.",
    emitters: [
      ground(PZ_L, 680, 0.28, pieceKeys(-1), 0.7), ground(PZ_R, 680, 0.28, pieceKeys(1), 0.7),
      ...looks(["c2-puz-r", "c2-puz-r-happy"], [0, CLICK], PZ_R, PZS, pieceKeys(1), { colors: [PINK] }),
      ...looks(["c2-puz-l", "c2-puz-l-happy"], [0, CLICK], PZ_L, PZS, pieceKeys(-1), { colors: [LIME] }),
      ring([195, 622], CLICK, 0.6, CREAM), glint([195, 600], CLICK, [CREAM, LIME, PINK, SUN], 14),
      tr("p3-heart", [195, 560], 0.15, [{ t: 0, s: 0 }, { t: CLICK + 80, s: 0.2, e: "hold" }, { t: CLICK + 280, s: 1, y: px(-22), e: "back" }, { t: CLICK + 800, y: px(-34), o: 1 }, { t: CLICK + 1100, y: px(-46), s: 0.8, o: 0 }]),
      twinkleBox([195, 600], 150, 50, 1500, 8, [LIME, PINK, CREAM], 500),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 0, volume: 0.45 }, { name: "lab-lock-click-1", at: CLICK, volume: 0.9 }, { name: "heart-blip", at: CLICK + 80, volume: 0.6 }, { name: "lab-kalimba-warm-1", at: 1500, volume: 0.6 },
      { name: "pop", at: 1950, volume: 0.4 }, { name: "lab-swoosh-soft-2", at: 2600, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.9, 1], face: "curious" }, { at: 480, look: [0.9, 1] }, { at: 880, look: [0, 1] }, { at: CLICK, face: "smile", body: "pop", haptic: "success" },
      { at: 1500, face: "laugh", body: "bounce" }, { at: 2600, look: [0.9, 1], face: "smile" }, { at: 3050, look: "off", face: "warm" }] },
  // SYNC: the two gloves slap on the pat of lab-grip-pat-2 (950 ms) with the comic burst, the ring, the stars and Pip's jump;
  // lab-soft-bell-1 rings right after (970); they wave on lab-kalimba-warm-2 (1500).
  { id: "bp-high-five", name: "High five", ms: 2800,
    feel: "Two big cartoon gloves, one gold and one blue, come up from the two bottom corners, wind back and slap a high five right under Pip: a comic burst, a ring and a spray of stars. They give each other a little wave and drop away. Pip looks at one, then the other, and jumps on the slap with a laugh. Someone is on your side now.",
    emitters: [
      bam([195, 596], SLAP, 0.52, CREAM, 6), ring([195, 600], SLAP, 0.8, SUN),
      tr("c2-glove-l", HF, HFS, gloveKeys(-1, 0), { colors: [GOLD] }), tr("c2-glove-r", HF, HFS, gloveKeys(1, 110), { colors: [SKY] }),
      { kind: "burst", shapes: ["star", "sparkle", "star"], colors: [GOLD, SUN, SKY, CREAM, PINK], origin: at(195, 620), at: SLAP, count: 18, spread: [-150, -30], speed: [0.35, 0.8], drag: 2.4, gravity: 0.3, spin: [60, 240], size: [0.035, 0.07], life: [900, 1300], fadeOut: 400, layer: "back" },
      { kind: "burst", shapes: ["star", "dot"], colors: [GOLD, SKY, CREAM], origin: at(195, 700), at: SLAP, count: 10, spread: [15, 165], speed: [0.2, 0.5], drag: 2.4, gravity: 0.2, spin: [60, 240], size: [0.03, 0.055], life: [800, 1100], fadeOut: 400, layer: "back" },
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 0, volume: 0.4 }, { name: "lab-swoosh-soft-2", at: SLAP - 190, volume: 0.5 }, { name: "lab-grip-pat-2", at: SLAP - 60, volume: 1 }, { name: "lab-soft-bell-1", at: SLAP + 20, volume: 0.5 },
      { name: "lab-kalimba-warm-2", at: 1500, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.9, 1], face: "curious" }, { at: 500, look: [0.9, 1] }, { at: SLAP - 190, look: [0, 1], face: "smile" }, { at: SLAP, face: "laugh", body: "bighop", haptic: "success" },
      { at: 1800, face: "smile", body: "nod" }, { at: 2400, look: "off", face: "warm" }] },
  // SYNC: the cups pop up on two "pop"s (0, 160 ms); they clink on the first hit of lab-a2-spoon-clink-1 (950) with the splash and
  // Pip's smile, tap again on its second hit (1130), and land from their little jump on its third (1460) with Pip's nod; the hearts
  // of steam start on heart-blip (1500).
  { id: "bp-chai-cheers", name: "Chai for two", ms: 3300,
    feel: "Two little clay cups of chai with faces pop up under Pip, lean back and clink: cheers. A drop of chai jumps, they tap once more, do a happy hop and sway side by side while hearts of steam float up. Pip leans in, smiles at the clink and sways with them. A chat is easier over chai, with a friend who gets it.",
    emitters: [
      ground(CH_L, 692, 0.25, cupKeys(-1), 0.8), ground(CH_R, 692, 0.25, cupKeys(1), 0.8),
      ...looks(["c2-chai-l", "c2-chai-happy"], [0, CLINK], CH_L, CHS, cupKeys(-1), { colors: [CLAY] }),
      ...looks(["c2-chai-r", "c2-chai-happy"], [0, CLINK], CH_R, CHS, cupKeys(1), { colors: [TEAL] }),
      { kind: "burst", shapes: ["dot"], colors: [CHAI, "#F8DDB5", CHAI], origin: at(195, 574), at: CLINK, count: 9, spread: [-150, -30], speed: [0.2, 0.45], drag: 1.6, gravity: 0.9, size: [0.014, 0.03], life: [600, 800], fadeOut: 200 },
      ring([195, 578], CLINK, 0.44, CREAM, 420), glint([195, 574], CLINK, [CREAM, SUN], 8, { speed: [0.14, 0.34] }),
      ...[0, 1, 2, 3, 4, 5].map(i => puff1("heart", [PINK, CREAM, "#FF8FA3"][i % 3], [i % 2 ? 236 : 154, 572], 1500 + i * 190, -90 + (i % 2 ? 14 : -14) * (1 + (i >> 1) * 0.4), 0.06 + (i % 3) * 0.012, { life: [1000, 1000], speed: [0.12, 0.12] })),
    ],
    sounds: [{ name: "pop", at: 20, volume: 0.4 }, { name: "pop", at: 180, volume: 0.35 }, { name: "lab-swoosh-soft-1", at: 760, volume: 0.3 }, { name: "lab-a2-spoon-clink-1", at: CLINK, volume: 0.9 }, { name: "heart-blip", at: 1500, volume: 0.5 },
      { name: "lab-kalimba-warm-2", at: 1900, volume: 0.5 }],
    pip: [{ at: 0, look: [-0.5, 1], face: "curious" }, { at: 300, look: [0.5, 1], body: "lean" }, { at: CLINK, look: [0, 1], face: "smile", haptic: "light" }, { at: CLINK + 510, body: "nod" },
      { at: 2000, look: "off", face: "warm", body: "sway" }, { at: 2950, face: "smile" }] },
];

export const SAMPLES_B2C: Record<string, FxEffect[]> = {
  "first-call-done": firstCall,
  "buddy-paired": buddy,
};
