/**
 * Moment samples, batch 2 part B (see ./samples.ts for the conventions): welcome, onboarding done, buddy paired, purchase done,
 * error / offline, waiting, notification permission. All seven play on the "stage" screen: the plain dark canvas, Pip on his
 * blob in the middle (his picture x 75-315, y 250-490; blob x 90-300, y 304-448). Props act on a floor BELOW him (y 520-680)
 * or fly round his sides; nothing crosses his face or collar. Each prop stands on a flat ground patch (b2-shadow).
 * Positions are in the screen's points (390 x 844). Every option has a SYNC note: which visual hit lands on which sound hit.
 */
import type { FxEffect, FxEmitter } from "./types";
import { FXK, fxById } from "./library";

const W = 390, H = 844;
const at = (x: number, y: number): [number, number] => [x / W, y / H];
const px = (n: number) => n / W;
const LIME = "#DFFF2E", PINK = "#FF9BD8", GOLD = "#FFC530", SUN = "#FFD84A", OR = "#FF7A1A", RED = "#FF2B2B", CREAM = "#FFF9E9", BLUE = "#1E7BFF",
  SKY = "#22D3FF", TEAL = "#2BB3A3", ICE = "#BFE3FF", GREEN = "#3DDC64", FLOOR = "#2B2824";
type E = FxEmitter;
type K = NonNullable<E["keys"]>[number];
type P = [number, number];
const { depth, toss, fall, sparks: fsparks, twinkles, shell } = FXK;

// ───────────────────────────── helpers ─────────────────────────────
/** One acting prop: a track at a place on the screen (points), `size` in screen widths; key times are from the effect's start. */
const tr = (shape: string, o: P, size: number, keys: K[], more: Partial<E> = {}): E => {
  return ({ kind: "track", shapes: [shape], origin: at(o[0], o[1]), size: [size, size], at: 0, keys, ...more }); };
type Full = Required<Omit<K, "e">> & { e: K["e"] };
/** Keys with every value written out (a value left out holds the key before's). */
const norm = (keys: K[]): Full[] => { let x = 0, y = 0, r = 0, s = 1, o = 1;
  return keys.map(k => ({ t: k.t, x: (x = k.x ?? x), y: (y = k.y ?? y), r: (r = k.r ?? r), s: (s = k.s ?? s), o: (o = k.o ?? o), e: k.e })); };
const ez = (u: number, e: K["e"]) => e === "out" ? 1 - Math.pow(1 - u, 3) : e === "in" ? u * u * u : e === "lin" ? u : e === "hold" ? (u >= 1 ? 1 : 0)
  : e === "back" ? 1 + 3.2 * Math.pow(u - 1, 3) + 2.2 * Math.pow(u - 1, 2) : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
/** Where a prop is at time t (the engine's own interpolation). */
const poseAt = (N: Full[], t: number): Full => {
  if (t <= N[0].t) return { ...N[0], t };
  const j = N.findIndex(k => k.t > t); if (j < 0) return { ...N[N.length - 1], t };
  const a = N[j - 1], b = N[j], u = ez((t - a.t) / (b.t - a.t), b.e), L = (p: number, q: number) => p + (q - p) * u;
  return { t, x: L(a.x, b.x), y: L(a.y, b.y), r: L(a.r, b.r), s: L(a.s, b.s), o: L(a.o, b.o), e: b.e };
};
/** The same keys with extra keys at `times` (put them where the prop is still, or in linear stretches). */
const withTimes = (keys: K[], times: number[]): Full[] => { const N = norm(keys);
  return [...N, ...times.filter(t => !N.some(k => k.t === t)).map(t => poseAt(N, t))].sort((a, b) => a.t - b.t); };
/** A part that is only seen during `spans` ([from, to] ms) and moves with the body: a mouth that opens, a screen that changes. */
const gated = (body: K[], spans: [number, number][]): K[] => {
  const flips = spans.flat().filter(t => t > 0 && isFinite(t)), N = withTimes(body, flips), on = (t: number) => spans.some(([a, b]) => t >= a && t < b);
  return N.flatMap((k): K[] => flips.includes(k.t) ? [{ ...k, t: k.t - 1, o: on(k.t - 1) ? k.o : 0 }, { ...k, o: on(k.t) ? k.o : 0, e: "hold" }] : [{ ...k, o: on(k.t) ? k.o : 0 }]);
};
/** Two looks of one prop: `a` outside the spans, `b` inside them. */
const swap = (a: string, b: string, o: P, size: number, body: K[], spans: [number, number][], more: Partial<E> = {}): E[] => {
  const cuts = [0, ...spans.flat(), Infinity], rest: [number, number][] = [];
  for (let i = 0; i < cuts.length; i += 2) if (cuts[i + 1] > cuts[i]) rest.push([cuts[i], cuts[i + 1]]);
  return [tr(a, o, size, gated(body, rest), more), tr(b, o, size, gated(body, spans), more)];
};
/** A part fixed to a moving body: the body's keys with the part's offset (dx, dy: screen widths at scale 1) turned and scaled
 *  with the body; `turn` = the part's own extra angle. */
const att = (body: K[], dx: number, dy: number, turn = 0): K[] => norm(body).map(b => { const a = (b.r * Math.PI) / 180;
  return { ...b, x: b.x + b.s * (dx * Math.cos(a) - dy * Math.sin(a)), y: b.y + b.s * (dx * Math.sin(a) + dy * Math.cos(a)), r: b.r + turn }; });
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
/** A hop on the spot: up `h` points and back, from t to t + d. */
const hop = (t: number, h: number, d = 300): K[] => [{ t, y: 0, s: 1 }, { t: t + d * 0.45, y: px(-h), e: "out" }, { t: t + d * 0.9, y: 0, s: 0.94, e: "in" }, { t: t + d * 1.25, s: 1, e: "back" }];
/** Pop in at t (from nothing, with a small overshoot). */
const popIn = (t: number, d = 280): K[] => [{ t: 0, s: 0 }, ...(t > 0 ? [{ t, s: 0, e: "hold" as const }] : []), { t: t + d, s: 1, e: "back" }];
/** Pop out at t. */
const popOut = (t: number, d = 240): K[] => [{ t, s: 1 }, { t: t + d * 0.35, s: 1.1, e: "out" }, { t: t + d, s: 0, e: "in" }];
/** A quick side-to-side shake from t0 to t1 (points, every `step` ms): a buzz, an engine. */
const shake = (t0: number, t1: number, amp: number, step = 40, r = 0): K[] => [{ t: t0, x: 0, r: 0 },
  ...Array.from({ length: Math.floor((t1 - t0) / step) }, (_, i) => ({ t: t0 + (i + 1) * step, x: px(i % 2 ? -amp : amp), r: i % 2 ? -r : r, e: "lin" as const })), { t: t1 + step, x: 0, r: 0 }];
/** The flat ground patch under a prop: it follows the prop sideways and shrinks while the prop is in the air. */
const ground = (o: P, floorY: number, size: number, body: K[], lift = 1): E => tr("b2-shadow", [o[0], floorY], size,
  norm(body).map(b => ({ t: b.t, x: b.x, y: 0, r: 0, s: Math.max(0, Math.min(1.1, b.s)) * Math.max(0.35, 1 + Math.min(0, b.y) * 3.2 * lift), o: Math.min(1, b.o), e: b.e })), { colors: [FLOOR], layer: "back" });
const glint = (o: P, t: number, colors: string[], n = 12, more: Partial<E> = {}): E =>
  ({ kind: "burst", shapes: ["sparkle", "glitter", "dot"], colors, origin: at(o[0], o[1]), at: t, count: n, spread: [0, 360], speed: [0.22, 0.55], drag: 3, gravity: 0.08, size: [0.024, 0.05], life: [650, 1000], fadeOut: 400, ...more });
const twinkleBox = (c: P, w: number, h: number, t: number, n: number, colors: string[], stagger = 800): E =>
  ({ kind: "twinkle", shapes: ["sparkle", "sparkpair"], colors, count: n, at: t, stagger, area: [(c[0] - w) / W, (c[1] - h) / H, (c[0] + w) / W, (c[1] + h) / H], size: [0.035, 0.07], life: [500, 800] });
const late = (es: E[], t: number): E[] => es.map(e => ({ ...e, at: (e.at ?? 0) + t }));
/** Everything that flies or falls across the screen goes BEHIND Pip and his blob, so nothing ever crosses his face or collar. */
const behind = (es: E[]): E[] => es.map(e => ({ ...e, layer: "back" as const }));
/** One thing let go at a point, drifting up (a note from a beak, a heart). */
const puff1 = (shape: string, color: string, o: P, t: number, ang = -90, size = 0.07, more: Partial<E> = {}): E =>
  ({ kind: "burst", shapes: [shape], colors: [color], origin: at(o[0], o[1]), at: t, count: 1, spread: [ang, ang], speed: [0.16, 0.16], drag: 1.2, gravity: -0.02, size: [size, size], life: [900, 900], fadeIn: 80, fadeOut: 450, upright: true, ...more });

const GY = 668;   // the floor line under the props (points)

// ═════════════════════ Welcome, first launch (once ever, medium) ═════════════════════
// A. The welcome mat. A roll 0.26 wide (radius 40 pt) rolls in on y 628; the flat mat is 0.66 wide at y 634.
const MAT: P = [195, 622];
const rollKeys: K[] = [{ t: 0, x: px(-280), r: -400, s: 1 }, { t: 700, x: 0, r: 0, e: "out" }, { t: 760, s: 1.08 }, { t: 860, s: 0, e: "in" },
  { t: 3880, s: 0, x: 0, r: 0 }, { t: 4000, s: 1, e: "back" }, { t: 4100, x: 0, r: 0 }, { t: 4600, x: px(290), r: 420, e: "in" }];
const matKeys: K[] = [{ t: 0, s: 0 }, { t: 780, s: 0.1, e: "hold" }, { t: 1010, s: 1, e: "back" }, { t: 1130, s: 1 }, { t: 1190, s: 1.07, y: px(-5), e: "out" }, { t: 1330, s: 1, y: 0 },
  { t: 1480, s: 1 }, { t: 1540, s: 1.05, y: px(-4), e: "out" }, { t: 1680, s: 1, y: 0 }, { t: 3820, s: 1, r: 0 }, { t: 3960, s: 0, r: -8, e: "in" }];
// B. The desk set: lamp, pot plant, mug, asleep in a row; the lamp's light wakes them one by one.
const LAMP: P = [86, 606], PLANT: P = [212, 610], MUG: P = [326, 626], LS = 0.38, PS = 0.35, MS = 0.28;
const lampKeys: K[] = [...popIn(0), { t: 900, r: 0 }, { t: 960, r: -7, e: "out" }, { t: 1140, r: 0, e: "back" }, ...hop(2250, 26), ...hop(2680, 18), ...popOut(3500)];
const plantKeys: K[] = [...popIn(130), { t: 1300, s: 1 }, { t: 1360, s: 0.9 }, { t: 1500, s: 1.12, e: "out" }, { t: 1640, s: 1, e: "io" }, ...hop(2320, 30), ...hop(2750, 20), ...popOut(3580)];
const mugKeys: K[] = [...popIn(260), ...hop(1750, 24), ...hop(2390, 28), ...hop(2820, 18), ...popOut(3660)];
// C. The HELLO letters: five letter creatures in a row.
const HX = [51, 123, 195, 267, 339], HY = 624, HS = 0.19, HCOL = [LIME, PINK, GOLD, SKY, OR], HSH = ["b2-let-h", "b2-let-e", "b2-let-l", "b2-let-l", "b2-let-o"];
const letterKeys = (i: number): K[] => [...popIn(200 + i * 180, 220), ...hop(1500 + i * 180, 46, 330), ...hop(2800, 30, 260), ...hop(3150, 20, 240),
  ...hops([HX[i], HY], [[3500 + (4 - i) * 90, HX[i], HY, 34], [3760 + (4 - i) * 90, HX[i] + 110, HY, 30], [4000 + (4 - i) * 90, HX[i] + 230, HY, 26], [4240 + (4 - i) * 90, HX[i] + 380, HY, 0]], 8, 1)];

const welcome: FxEffect[] = [
  // SYNC: the roll stops on the pat of lab-grip-pat-2 (700 ms); the mat flops open on "pop" (790); it jumps on the DING (1140)
  // and the DONG (1500) of lab-b2-door-bell-1; it rolls away on lab-swoosh-soft-2 (4100).
  { id: "wf-welcome-mat", name: "Welcome mat rolls out", ms: 4750,
    feel: "A rolled-up doormat with a face rolls in under Pip, flops open (it says hi!), the doorbell goes ding-dong and the mat jumps on each note while Pip gives a full wave hello; then it rolls itself up and trundles off.",
    emitters: [
      ground(MAT, GY + 2, 0.3, [{ t: 0, x: px(-280), s: 1 }, { t: 700, x: 0, e: "out" }, { t: 860, s: 0 }, { t: 3880, s: 0 }, { t: 4000, s: 1 }, { t: 4100, x: 0 }, { t: 4600, x: px(290), e: "in" }]),
      tr("b2-mat", [195, 634], 0.66, matKeys),
      tr("b2-mat-roll", MAT, 0.3, rollKeys),
      glint([195, 600], 1150, [LIME, CREAM, SUN], 10), twinkleBox([195, 620], 150, 50, 1500, 8, [SUN, CREAM, LIME], 900),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 60, volume: 0.45 }, { name: "lab-grip-pat-2", at: 640, volume: 0.7 }, { name: "pop", at: 790, volume: 0.5 }, { name: "lab-b2-door-bell-1", at: 1100, volume: 0.8 },
      { name: "lab-swoosh-soft-2", at: 4100, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.9, 1], face: "curious" }, { at: 300, move: "h-wave" }, { at: 700, look: [0, 1] }, { at: 1140, look: "off", haptic: "light" }, { at: 4000, look: [0.8, 1] }, { at: 4420, look: "off", face: "warm" }] },
  // SYNC: the lamp clicks on with lab-lock-click-1 (900 ms); the plant springs up on lab-cartoon-boing-1 (1360); the mug hops on
  // lab-hop-boing-small-1 (1750); all three jump together on lab-kalimba-warm-2 (2250) and again on "pop" (2680).
  { id: "wf-desk-wakes", name: "The desk wakes up", ms: 4100,
    feel: "A sleepy desk lamp, pot plant and coffee mug pop up under Pip. The lamp clicks on, its light wakes the plant, which perks up, the mug hops awake with a puff of steam, and all three jump together to say hi while Pip leans in, glad to meet you.",
    emitters: [
      ground(LAMP, GY, 0.2, lampKeys), ground(PLANT, GY + 2, 0.22, plantKeys), ground(MUG, GY, 0.2, mugKeys),
      tr("b2-beam", [LAMP[0] + 92, LAMP[1] + 46], 0.33, [{ t: 0, o: 0 }, { t: 900, o: 1, e: "hold" }, { t: 2240, o: 1 }, { t: 2250, o: 0, e: "hold" }, { t: 3100, o: 0 }, { t: 3110, o: 1, e: "hold" }, { t: 3480, o: 1 }, { t: 3560, o: 0 }], { layer: "back" }),
      tr("b2-lamp", LAMP, LS, lampKeys), tr("b2-lamp-on", LAMP, LS, gated(lampKeys, [[900, Infinity]])),
      ...swap("b2-plant-sleepy", "b2-plant", PLANT, PS, plantKeys, [[1360, Infinity]]),
      tr("b2-mug", MUG, MS, mugKeys),
      ...[0, 1, 2].map(i => puff1("b2-steam", CREAM, [MUG[0] - 12 + i * 10, MUG[1] - 46], 1800 + i * 160, -90, 0.06, { opacity: 0.8 })),
      ...[0, 1, 2].map(i => puff1("zed", "#C4B5FD", [LAMP[0] + 30 + i * 60, 560 - (i % 2) * 16], 300 + i * 150, -70, 0.05, { life: [600, 600] })),
      glint([PLANT[0], PLANT[1] - 40], 1420, [LIME, GREEN, CREAM], 8),
      twinkleBox([200, 600], 170, 50, 2300, 8, [SUN, CREAM, LIME], 700),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.4 }, { name: "pop", at: 170, volume: 0.35 }, { name: "pop", at: 300, volume: 0.3 }, { name: "lab-lock-click-1", at: 900, volume: 0.85 }, { name: "lab-cartoon-boing-1", at: 1360, volume: 0.6 },
      { name: "lab-hop-boing-small-1", at: 1750, volume: 0.6 }, { name: "lab-kalimba-warm-2", at: 2250, volume: 0.6 }, { name: "pop", at: 2680, volume: 0.35 }],
    pip: [{ at: 0, look: [-0.5, 1], face: "curious" }, { at: 900, look: [-0.9, 1] }, { at: 1360, look: [0.1, 1], face: "smile" }, { at: 1750, look: [0.9, 1] },
      { at: 2250, look: "off", face: "laugh", body: "bounce", haptic: "light" }, { at: 2950, face: "warm", body: "lean" }, { at: 3850, face: "smile" }] },
  // SYNC: the five letters pop up on the five notes of lab-b2-hello-notes-1 (200, 380, 560, 740, 920 ms); they jump one after
  // another on the same five notes again (1500 ... 2220); all jump together on lab-cartoon-boing-2 (2800) and "pop" (3150).
  { id: "wf-hello-letters", name: "H-E-L-L-O hops in", ms: 4750,
    feel: "Five chunky letter creatures pop up in a row under Pip, one on each note: H, E, L, L, O. They do a wave along the row, jump together, and hop off in a line while Pip follows them with his eyes and laughs.",
    emitters: [
      ...HX.map((x, i) => ground([x, HY], GY - 6, 0.15, letterKeys(i), 0.6)),
      ...HX.map((x, i) => tr(HSH[i], [x, HY], HS, letterKeys(i), { colors: [HCOL[i]] })),
      ...HX.map((x, i) => glint([x, HY - 30], 1650 + i * 180, [HCOL[i], CREAM], 4, { speed: [0.12, 0.3] })),
      twinkleBox([195, 590], 180, 40, 2800, 10, [LIME, PINK, GOLD, SKY], 500),
    ],
    sounds: [{ name: "lab-b2-hello-notes-1", at: 200, volume: 0.75 }, { name: "lab-b2-hello-notes-1", at: 1500, volume: 0.7 }, { name: "lab-cartoon-boing-2", at: 2800, volume: 0.6 }, { name: "pop", at: 3150, volume: 0.4 },
      { name: "lab-swoosh-soft-2", at: 3520, volume: 0.4 }],
    pip: [{ at: 0, face: "curious", look: [-1, 1] }, { at: 560, look: [0, 1] }, { at: 920, look: [1, 1], face: "smile" }, { at: 1500, look: [-1, 1] }, { at: 1860, look: [0, 1] }, { at: 2220, look: [1, 1] },
      { at: 2800, look: "off", face: "laugh", body: "bounce", haptic: "light" }, { at: 3600, look: [0.9, 0.9], face: "smile" }, { at: 4450, look: "off", face: "warm" }] },
];

// ═════════════════════ Onboarding done: "You're all set!" (once ever, big) ═════════════════════
const cannons = (t: number, y = 0.74): E[] => behind([
  ...depth(toss({ at: t, origin: [-0.03, y], spread: [-78, -52], speed: [1.5, 2.6], drag: 1.5, gravity: 0.55, life: [2100, 2600] }), 34),
  ...depth(toss({ at: t + 200, origin: [1.03, y], spread: [-128, -102], speed: [1.5, 2.6], drag: 1.5, gravity: 0.55, life: [2100, 2600] }), 34),
  toss({ at: t, origin: [-0.03, y], spread: [-74, -58], speed: [1.7, 2.4], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 4, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2100, 2600] }),
  toss({ at: t + 200, origin: [1.03, y], spread: [-122, -106], speed: [1.7, 2.4], drag: 1.5, gravity: 0.55, shapes: ["streamer"], count: 4, size: [0.09, 0.14], spin: [30, 120], flip: false, life: [2100, 2600] }),
]);
// A. The TO DO sticky: 0.46 wide, its three ticks and the rosette that stamps its corner.
const TODO: P = [195, 588], TS = 0.46, TICKS = [620, 880, 1140], STAMP = 1560;
const todoKeys: K[] = [{ t: 0, y: px(280), r: -14, s: 0.8 }, { t: 380, y: 0, r: 0, s: 1, e: "back" },
  ...TICKS.flatMap((t): K[] => [{ t, s: 1 }, { t: t + 70, s: 1.04, e: "out" }, { t: t + 200, s: 1 }]),
  { t: STAMP, s: 1, r: 0 }, { t: STAMP + 70, s: 0.93, r: 3 }, { t: STAMP + 260, s: 1, r: 0, e: "back" }, ...hop(1840, 40, 360), ...hop(2320, 22, 300),
  { t: 3500, r: 0, y: 0, s: 1 }, { t: 3620, y: px(10), s: 0.96 }, { t: 4000, y: px(-90), s: 0, r: 30, e: "in" }];
const tickKeys = (t: number): K[] => { const N = withTimes(todoKeys, [t, t + 130]);
  return [{ ...N[0], o: 0 }, ...N.filter(k => k.t > 0 && k.t < t).map(k => ({ ...k, o: 0 })), { ...poseAt(N, t), s: 1.3, o: 1, e: "hold" }, ...N.filter(k => k.t >= t + 130)]; };
// B. The party cake slice with its sparkler candle.
const CAKE: P = [195, 600], CS = 0.44, TIP: P = [193, 548], LIGHT = 760;
const cakeKeys: K[] = [{ t: 0, x: px(330), r: 8 }, { t: 470, x: px(-10), r: -5, e: "out" }, { t: 620, x: 0, r: 0, e: "back" }, { t: LIGHT, s: 1 }, { t: LIGHT + 80, s: 1.05, e: "out" }, { t: LIGHT + 240, s: 1 },
  ...hop(2460, 34, 360), { t: 3800, x: 0, r: 0 }, { t: 3920, x: px(14), r: 4, e: "out" }, { t: 4350, x: px(-340), r: -8, e: "in" }];
// C. The rocket: stands to the right of Pip (its flight line x 332 clears his face and collar).
const RK: P = [332, 612], RS = 0.36, IGN = 1800, LIFT = 2080;
const rocketKeys: K[] = [...hops(RK, [[0, 470, 612, 60], [420, 332, 612, 0]], 6, 0.94), { t: 520, s: 1, x: 0, y: 0, r: 0 }, ...shake(IGN, LIFT - 40, 2.5, 35, 1.2),
  { t: LIFT, y: 0, s: 1 }, { t: LIFT + 260, y: px(-60), e: "in" }, { t: LIFT + 700, y: px(-760), s: 0.9, e: "in" }];
const flameKeys: K[] = [{ t: 0, s: 0 }, { t: IGN, s: 0.2, e: "hold" }, { t: IGN + 120, s: 0.75, e: "out" }, ...Array.from({ length: 5 }, (_, i): K => ({ t: IGN + 170 + i * 45, s: i % 2 ? 0.8 : 0.62, e: "lin" })), { t: LIFT, s: 1.1 }, { t: LIFT + 700, s: 1.25 }];
const digit = (shape: string, t: number, c: string): E => tr(shape, [200, 598], 0.3, [{ t: 0, s: 0 }, { t, s: 0.3, e: "hold" }, { t: t + 150, s: 1.15, e: "out" }, { t: t + 240, s: 1 }, { t: t + 330, s: 1 }, { t: t + 400, s: 0, r: 12, e: "in" }], { colors: [c] });
const smoke = (t: number, x: number, dx: number, size: number): E => tr("p3-puff", [x, GY - 14], size, [{ t: 0, s: 0 }, { t, s: 0.2, e: "hold" }, { t: t + 200, s: 1, x: px(dx * 0.5), e: "out" }, { t: t + 900, s: 1.3, x: px(dx), y: px(-14), o: 0, e: "out" }]);

const onboarding: FxEffect[] = [
  // SYNC: the three ticks land on lab-pencil-check-1 / -2 / -1 (620, 880, 1140 ms); the green rosette stamps the corner on the
  // thump of lab-rubber-stamp-1 (1560); the two cannons fire on lab-cannon-confetti-1 (1760) and -2 (1960) as Pip jumps.
  { id: "od-todo-all-set", name: "To-do, all ticked", ms: 4400,
    feel: "A yellow TO DO sticky flips up under Pip; three red ticks land on it one, two, three (he nods along), a green rosette stamps its corner, and confetti cannons fire from both sides while Pip does his big jump. You're all set.",
    emitters: [
      ground(TODO, GY + 14, 0.34, todoKeys.map(k => ({ ...k, y: Math.min(0, k.y ?? 0) }))),
      tr("b2-todo", TODO, TS, todoKeys),
      ...TICKS.map((t, i) => tr(`b2-tick-${i + 1}`, TODO, TS, tickKeys(t))),
      tr("b2-rosette", [TODO[0] + 52, TODO[1] + 42], 0.27, [{ t: 0, s: 0 }, { t: STAMP - 130, s: 2.4, o: 0, r: -24, e: "hold" }, { t: STAMP - 90, o: 1 }, { t: STAMP, s: 1, r: -8, e: "in" }, { t: STAMP + 70, s: 0.93 }, { t: STAMP + 260, s: 1, e: "back" },
        ...hop(1840, 40, 360), ...hop(2320, 22, 300), { t: 3500, y: 0, s: 1 }, { t: 3620, y: px(10) }, { t: 4000, y: px(-90), s: 0, e: "in" }]),
      { kind: "ring", shapes: ["p3-ripple"], colors: [GREEN], origin: at(TODO[0] + 52, TODO[1] + 36), at: STAMP, size: [0.5, 0.5], life: [450, 450], opacity: 0.85 },
      ...TICKS.map((t, i) => glint([TODO[0] - 40, TODO[1] - 6 + i * 27], t + 20, [RED, SUN, CREAM], 5, { speed: [0.12, 0.3] })),
      glint([TODO[0] + 52, TODO[1] + 36], STAMP + 20, [GREEN, LIME, CREAM], 12),
      ...cannons(1760),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 40, volume: 0.45 }, { name: "lab-pencil-check-1", at: 620, volume: 0.7 }, { name: "lab-pencil-check-2", at: 880, volume: 0.7 }, { name: "lab-pencil-check-1", at: 1140, volume: 0.75 },
      { name: "lab-rubber-stamp-1", at: STAMP, volume: 0.9 }, { name: "lab-cannon-confetti-1", at: 1760, volume: 0.85 }, { name: "lab-cannon-confetti-2", at: 1960, volume: 0.8 }, { name: "lab-cheer-short-1", at: 2150, volume: 0.6 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: 620, body: "nod", face: "smile" }, { at: 1140, body: "nod" }, { at: STAMP, face: "proud" }, { at: 1760, look: "off", face: "laugh", body: "bighop", haptic: "success" },
      { at: 2700, body: "sway", face: "proud" }, { at: 3900, face: "smile" }] },
  // SYNC: the sparkler catches on the start of lab-sparkler-1 (760 ms) and spits on its two crackles (2235 and 2500), where
  // two fireworks open (lab-firework-pop-2 on the second); Pip's big jump lands with lab-kids-yay-1 (2500).
  { id: "od-sparkler-cake", name: "Sparkler cake", ms: 4600,
    feel: "A slice of party cake slides in under Pip, its candle catches and fizzes like a sparkler, gold sparkles sink down the whole screen, and on the two loud crackles fireworks open left and right while Pip jumps for joy.",
    emitters: [
      ground(CAKE, GY + 12, 0.36, cakeKeys),
      tr("b2-cake", CAKE, CS, cakeKeys),
      { kind: "flicker", shapes: ["b2-flash"], colors: [SUN, GOLD], count: 1, at: LIGHT, area: [TIP[0] / W, TIP[1] / H, TIP[0] / W, TIP[1] / H], size: [0.13, 0.13], life: [2950, 2950], fadeIn: 80, fadeOut: 300 },
      fsparks({ origin: at(TIP[0], TIP[1]), at: LIGHT, count: 34, stagger: 2800, spread: [-165, -15], speed: [0.14, 0.32], drag: 2.6, gravity: 0.5, size: [0.018, 0.042], life: [600, 900], fadeOut: 300 }),
      fsparks({ origin: at(TIP[0], TIP[1]), at: LIGHT, count: 10, colors: [CREAM, SUN], shapes: ["sparkle"], spread: [-150, -30], speed: [0.2, 0.36] }),
      ...behind(late(fxById("gold-shower").emitters.map(e => ({ ...e, count: Math.round((e.count ?? 12) * 0.36) })), 900)),
      ...shell(0.2, 0.17, 2235, [GOLD, SUN, OR], "back", 14), ...shell(0.8, 0.2, 2500, [PINK, LIME, CREAM], "back", 14),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 80, volume: 0.45 }, { name: "pop", at: 470, volume: 0.35 }, { name: "lab-sparkler-1", at: LIGHT, volume: 0.8 }, { name: "lab-harp-gliss-1", at: 900, volume: 0.5 },
      { name: "lab-firework-pop-1", at: 2235, volume: 0.5 }, { name: "lab-firework-pop-2", at: 2500, volume: 0.6 }, { name: "lab-kids-yay-1", at: 2470, volume: 0.65 }],
    pip: [{ at: 0, look: [0.9, 0.9], face: "curious" }, { at: 470, look: [0, 1] }, { at: LIGHT, face: "smile", body: "pop" }, { at: 2235, look: [-0.7, -0.9] }, { at: 2500, look: [0.7, -0.9], face: "laugh", body: "bighop", haptic: "success" },
      { at: 3400, look: "off", face: "proud", body: "nod" }, { at: 4200, face: "smile" }] },
  // SYNC: 3, 2, 1 pop on three "boop"s (600, 1000, 1400 ms); the engine lights on lab-fire-whoosh-1 (1800); lift-off on the
  // whistle of lab-firework-launch-1 (2080); the rocket's firework opens on lab-firework-pop-1 (2860), a second on -2 (3120).
  { id: "od-lift-off", name: "Three, two, one, lift-off", ms: 4700,
    feel: "A little rocket with a face hops in beside Pip. Big numbers count 3, 2, 1, the engine lights, it shakes in its own smoke and shoots up past him and off the top of the screen, where it bursts into fireworks and a shower of stars. Pip watches it all the way up and jumps.",
    emitters: [
      ground(RK, GY + 2, 0.24, rocketKeys.map(k => ({ ...k, y: (k.y ?? 0) * 0.5 }))),
      tr("flame", RK, 0.2, att(rocketKeys, 0, 0.5 * RS, 180).map(k => ({ ...k, s: poseAt(norm(flameKeys), k.t).s * (k.s ?? 1) })), { colors: [OR] }),
      tr("b2-rocket", RK, RS, rocketKeys),
      digit("b2-n3", 600, LIME), digit("b2-n2", 1000, SUN), digit("b2-n1", 1400, PINK),
      smoke(IGN, RK[0] - 26, -60, 0.2), smoke(IGN + 60, RK[0] + 24, 46, 0.17), smoke(IGN + 200, RK[0] - 6, -30, 0.24), smoke(LIFT, RK[0] + 10, 30, 0.22), smoke(LIFT + 90, RK[0] - 30, -80, 0.26),
      fsparks({ origin: at(RK[0], GY - 20), at: LIFT, count: 14, colors: [GOLD, OR, SUN], spread: [-180, 0], speed: [0.2, 0.5] }),
      ...shell(0.8, 0.13, 2860, [GOLD, SUN, OR], "back", 22), ...shell(0.22, 0.17, 3120, [PINK, LIME, CREAM], "back", 18),
      ...behind(depth(fall({ at: 2900, shapes: ["star", "star", "sparkle"], colors: [GOLD, LIME, PINK, SUN, CREAM], speed: [0.34, 0.52], gravity: 0.08, sway: 0.02, spin: [40, 160], size: [0.035, 0.065], life: [1500, 1700], stagger: 500, flip: false }), 28)),
    ],
    sounds: [{ name: "lab-hop-boing-small-1", at: 0, volume: 0.5 }, { name: "boop", at: 600, volume: 0.55 }, { name: "boop", at: 1000, volume: 0.6 }, { name: "boop", at: 1400, volume: 0.65 }, { name: "lab-fire-whoosh-1", at: IGN, volume: 0.8 },
      { name: "lab-firework-launch-1", at: LIFT, volume: 0.7 }, { name: "lab-firework-pop-1", at: 2860, volume: 0.8 }, { name: "lab-firework-pop-2", at: 3120, volume: 0.7 }, { name: "lab-cheer-short-2", at: 3000, volume: 0.6 }],
    pip: [{ at: 0, look: [0.9, 0.9], face: "curious" }, { at: 600, look: [0, 1] }, { at: 1400, face: "smile" }, { at: IGN, look: [0.9, 0.9], face: "curious" }, { at: LIFT + 200, look: [0.9, 0.2] }, { at: LIFT + 450, look: [0.8, -0.9] },
      { at: 2860, look: [0.5, -1], face: "laugh", body: "bighop", haptic: "success" }, { at: 3700, look: "off", face: "proud", body: "nod" }, { at: 4350, face: "smile" }] },
];

// ═════════════════════ Paired with a practice buddy (per pairing, medium) ═════════════════════
// A. Two round face badges: they roll in, bump, talk in turn (their mouths open on the notes) and laugh together.
const BA: P = [134, 604], BB: P = [256, 604], BS = 0.34, BUMP = 600;
const badgeKeys = (side: -1 | 1): K[] => [{ t: 0, x: px(side * 240), r: side * 380 }, { t: BUMP, x: 0, r: 0, e: "in" }, { t: BUMP + 60, s: 0.9, x: px(side * 3) }, { t: BUMP + 300, x: px(side * 20), s: 1, r: side * 8, e: "out" },
  { t: 900, r: 0 }, ...hop(2500, 26, 280), ...hop(2880, 18, 260), { t: 3250, x: px(side * 20), r: 0 }, { t: 3400, x: px(side * 20 - 14), r: -8, e: "out" }, { t: 3950, x: px(side * 20 + 330), r: 420, e: "in" }];
const talk = (t: number, n: number, gap: number, open = 100): [number, number][] => Array.from({ length: n }, (_, i): [number, number] => [t + i * gap, t + i * gap + open]);
// B. A tin-can phone: two cans with faces, a string between them, words running along it.
const CL: P = [74, 606], CR: P = [316, 606], CSZ = 0.32, TIGHT = 1000, SAY = 1400, VOICE = [0, 270, 385, 945, 1425, 1625, 1990];
const canKeys = (side: -1 | 1, mine: number[], theirs: number[]): K[] => [...hops(side < 0 ? CL : CR, [[side < 0 ? 0 : 150, (side < 0 ? CL : CR)[0] + side * 150, 606, 50], [side < 0 ? 420 : 570, (side < 0 ? CL : CR)[0], 606, 0]], 6, 0.94),
  { t: 650, s: 1, x: 0, y: 0, r: 0 }, { t: TIGHT - 120, x: 0 }, { t: TIGHT, x: px(side * 9), r: side * 5, e: "out" },
  ...[...mine.map(t => [t, 0] as const), ...theirs.map(t => [t, 1] as const)].sort((a, b) => a[0] - b[0]).flatMap(([t, heard]): K[] =>
    heard ? [{ t, r: side * 5 }, { t: t + 50, r: side * -5, e: "out" }, { t: t + 110, r: side * 5 }] : [{ t, s: 1 }, { t: t + 50, s: 1.12, e: "out" }, { t: t + 110, s: 1 }]),
  ...hop(3880, 26, 300), ...popOut(4260)];
const SL_X: P = [CL[0] + 41, CR[0] - 41];   // the string's two ends before it is pulled tight
const word = (t: number, toRight: boolean, c: string): E => tr("b2-pulse", [toRight ? SL_X[0] - 6 : SL_X[1] + 6, 606], 0.05,
  [{ t: 0, s: 0 }, { t, s: 0.3, e: "hold" }, { t: t + 70, s: 1, e: "out" }, { t: t + 350, x: px((toRight ? 1 : -1) * (SL_X[1] - SL_X[0] + 12)), s: 0.8, e: "lin" }, { t: t + 351, s: 0, e: "hold" }], { colors: [c] });
// C. Two birds on a wire.
const WIRE = 612, B1: P = [144, 571], B2: P = [268, 571], BSZ = 0.28, LAND1 = 700, LAND2 = 1750, SCOOT = 2000, DUET = 2400, CHIRPS = [0, 280, 560, 840], FLY = 3900;
const bird1: K[] = [...hops(B1, [[0, -50, 500, -34], [LAND1, 144, 571, 0]], -10, 0.92), { t: LAND1 + 130, s: 1, r: 0, x: 0, y: 0 },
  ...hops(B1, [[SCOOT, 144, 571, 12], [SCOOT + 160, 157, 571, 12], [SCOOT + 320, 170, 571, 0]], 0, 0.96).map(k => ({ ...k, e: "lin" as const })),
  ...[0, 2].flatMap((i): K[] => [{ t: DUET + CHIRPS[i], s: 1, r: 0 }, { t: DUET + CHIRPS[i] + 70, s: 1.1, r: -8, e: "out" }, { t: DUET + CHIRPS[i] + 220, s: 1, r: 0 }]),
  { t: 3400, r: 0 }, { t: 3560, r: 10, e: "out" }, { t: FLY - 60, r: 10 }, { t: FLY, r: 0, x: px(26), y: 0 }, { t: FLY + 220, x: px(60), y: px(-30), r: -14, e: "in" }, { t: FLY + 700, x: px(330), y: px(-230), r: -18, e: "lin" }];
const bird2: K[] = [{ t: 0, s: 0 }, { t: 1100, s: 1, e: "hold" }, ...hops(B2, [[1100, 450, 505, -30], [LAND2, 268, 571, 0]], 10, 0.92), { t: LAND2 + 130, s: 1, r: 0, x: 0, y: 0 },
  ...hops(B2, [[SCOOT + 80, 268, 571, 12], [SCOOT + 240, 255, 571, 12], [SCOOT + 400, 242, 571, 0]], 0, 0.96).map(k => ({ ...k, e: "lin" as const })),
  ...[1, 3].flatMap((i): K[] => [{ t: DUET + CHIRPS[i], s: 1, r: 0 }, { t: DUET + CHIRPS[i] + 70, s: 1.1, r: 8, e: "out" }, { t: DUET + CHIRPS[i] + 220, s: 1, r: 0 }]),
  { t: 3400, r: 0 }, { t: 3560, r: -10, e: "out" }, { t: FLY + 20, r: -10 }, { t: FLY + 80, r: 0, x: px(-26), y: 0 }, { t: FLY + 320, x: px(20), y: px(-40), r: -6, e: "in" }, { t: FLY + 800, x: px(280), y: px(-250), r: -10, e: "lin" }];
const wireKeys: K[] = [{ t: 0, o: 0, y: 0 }, { t: 220, o: 1 }, ...[LAND1, LAND2].flatMap((t): K[] => [{ t, y: 0 }, { t: t + 70, y: px(7), e: "out" }, { t: t + 190, y: px(-3) }, { t: t + 300, y: px(2) }, { t: t + 400, y: 0 }]),
  { t: FLY + 60, y: 0 }, { t: FLY + 140, y: px(-6), e: "out" }, { t: FLY + 300, y: px(2) }, { t: FLY + 420, y: 0 }, { t: 4500, o: 1 }, { t: 4700, o: 0 }];

const buddy: FxEffect[] = [
  // SYNC: the bump lands on the pat of lab-grip-pat-2 (600 ms); the yellow badge's mouth opens on the three notes of
  // lab-b2-chat-a-1 (950, 1100, 1250), the blue one's on lab-b2-chat-b-1 (1700, 1860, 2020); both laugh and jump on
  // "chime-up" (2500) and "heart-blip" (2880).
  { id: "bp-chatty-badges", name: "Two faces, one chat", ms: 4100,
    feel: "Two round face badges, one yellow, one blue, roll in from the sides and bump under Pip. The yellow one says something (its big mouth opens on each note), the blue one answers, and both burst out laughing and jump together with hearts, then roll off side by side. Pip looks from one to the other and laughs with them.",
    emitters: [
      ground(BA, GY + 6, 0.28, badgeKeys(-1)), ground(BB, GY + 6, 0.28, badgeKeys(1)),
      ...swap("b2-badge-a", "b2-badge-a-open", BA, BS, badgeKeys(-1), [...talk(950, 3, 150), [2500, 3250]]),
      ...swap("b2-badge-b", "b2-badge-b-open", BB, BS, badgeKeys(1), [...talk(1700, 3, 160), [2500, 3250]]),
      tr("b2-flash", [195, 606], 0.2, [{ t: 0, s: 0 }, { t: BUMP, s: 0.3, e: "hold" }, { t: BUMP + 90, s: 1.1, r: 20, e: "out" }, { t: BUMP + 260, s: 0, r: 40, e: "in" }], { colors: [CREAM] }),
      ...[0, 1, 2].map(i => puff1("note", GOLD, [BA[0] - 34 + i * 8, 540], 950 + i * 150, -110 + i * 10, 0.06)),
      ...[0, 1, 2].map(i => puff1("note", SKY, [BB[0] + 34 - i * 8, 540], 1700 + i * 160, -70 - i * 10, 0.06)),
      { kind: "rise", shapes: ["heart"], colors: [RED, PINK], count: 6, at: 2500, stagger: 500, area: [0.36, 0.6, 0.64, 0.7], speed: [0.1, 0.16], sway: 0.015, size: [0.04, 0.065], life: [700, 800], upright: true },
      twinkleBox([195, 600], 170, 50, 2500, 8, [GOLD, SKY, CREAM], 600),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 120, volume: 0.4 }, { name: "lab-grip-pat-2", at: BUMP - 60, volume: 0.8 }, { name: "lab-b2-chat-a-1", at: 950, volume: 0.75 }, { name: "lab-b2-chat-b-1", at: 1700, volume: 0.75 },
      { name: "chime-up", at: 2500, volume: 0.5 }, { name: "heart-blip", at: 2880, volume: 0.5 }, { name: "lab-swoosh-soft-2", at: 3450, volume: 0.35 }],
    pip: [{ at: 0, look: [-1, 1], face: "curious" }, { at: 320, look: [1, 1] }, { at: BUMP, look: [0, 1], face: "smile", body: "hop" }, { at: 950, look: [-0.7, 1], face: "listening" }, { at: 1700, look: [0.7, 1] },
      { at: 2500, look: "off", face: "laugh", body: "bounce", haptic: "success" }, { at: 3300, face: "warm", look: [0.8, 1] }, { at: 3900, look: "off" }] },
  // SYNC: the string twangs tight on lab-cartoon-boing-1 (1000 ms); the left can pulses on the first three syllables of
  // soft kalimba "chat" notes (no voice: babble could read as mocking speech) and a word runs along the string each time; the right can answers on the next
  // four (2345, 2825, 3025, 3390); both jump on "ding" (3880).
  { id: "bp-tin-can-phone", name: "Tin-can phone", ms: 4600,
    feel: "Two tin cans with faces hop in, one on each side of Pip, with a string between them. They pull it tight (twang), the left can talks and its words run along the string to the right can, which wobbles as it hears them and talks back. Then both jump: you have someone to practise with.",
    emitters: [
      ground(CL, GY + 2, 0.24, canKeys(-1, [], [])), ground(CR, GY + 2, 0.24, canKeys(1, [], [])),
      tr("b2-string-slack", [195, 606], (SL_X[1] - SL_X[0]) / W, [{ t: 0, o: 0 }, { t: 600, o: 0 }, { t: 700, o: 1 }, { t: TIGHT - 61, o: 1 }, { t: TIGHT - 60, o: 0, e: "hold" }]),
      tr("b2-string", [195, 606], (SL_X[1] - SL_X[0]) / W, [{ t: 0, o: 0, s: 1 }, { t: TIGHT - 60, o: 1, e: "hold" }, { t: TIGHT, s: 1.1, e: "out" },
        ...Array.from({ length: 6 }, (_, i): K => ({ t: TIGHT + 40 + i * 45, y: px(i % 2 ? -2.5 : 2.5) * (1 - i / 6), e: "lin" })), { t: TIGHT + 330, y: 0 }, { t: 4250, o: 1 }, { t: 4270, o: 0 }]),
      ...VOICE.slice(0, 3).map(v => word(SAY + v, true, LIME)), ...VOICE.slice(3).map(v => word(SAY + v, false, PINK)),
      tr("b2-can-l", CL, CSZ, canKeys(-1, VOICE.slice(0, 3).map(v => SAY + v), VOICE.slice(3).map(v => SAY + v + 350)), { colors: [LIME] }),
      tr("b2-can-r", CR, CSZ, canKeys(1, VOICE.slice(3).map(v => SAY + v), VOICE.slice(0, 3).map(v => SAY + v + 350)), { colors: [PINK] }),
      glint([195, 600], TIGHT, [CREAM, LIME], 6, { speed: [0.1, 0.25] }),
      { kind: "rise", shapes: ["heart"], colors: [RED, PINK], count: 4, at: 3880, stagger: 300, area: [0.42, 0.62, 0.58, 0.7], speed: [0.1, 0.16], sway: 0.015, size: [0.04, 0.06], life: [600, 700], upright: true },
    ],
    sounds: [{ name: "lab-hop-boing-small-1", at: 0, volume: 0.5 }, { name: "lab-hop-boing-small-2", at: 150, volume: 0.5 }, { name: "lab-cartoon-boing-1", at: TIGHT, volume: 0.6 }, { name: "lab-b2-chat-a-1", at: SAY, volume: 0.7 }, { name: "lab-b2-chat-b-1", at: SAY + 400, volume: 0.6 },
      { name: "ding", at: 3880, volume: 0.5 }],
    pip: [{ at: 0, look: [-1, 1], face: "curious" }, { at: 500, look: [1, 1] }, { at: TIGHT, look: [0, 1], face: "smile" }, { at: SAY, look: [-0.9, 1], face: "listening" }, { at: SAY + 500, look: [0.9, 1] },
      { at: SAY + 1500, look: [-0.9, 1] }, { at: 3880, look: "off", face: "laugh", body: "bounce", haptic: "success" }, { at: 4400, face: "warm" }] },
  // SYNC: the orange bird lands (the wire dips) on lab-b2-bird-chirp-2 (700 ms); the blue one lands on "pop" (1750); they sing
  // in turn on the four chirps of lab-b2-bird-chirp-1 (2400, 2680, 2960, 3240), a note from a beak on each; heads together on
  // "heart-blip" (3560); off they fly on lab-swoosh-soft-1 (3900).
  { id: "bp-birds-on-a-wire", name: "Two birds on a wire", ms: 4750,
    feel: "A wire stretches across under Pip. An orange bird flies down and sits on it, alone; a blue bird lands beside it and the wire bounces. They shuffle closer, sing a little duet in turn, put their heads together under a heart, and fly off as a pair. Pip puts a hand to his cheek: aww.",
    emitters: [
      tr("b2-wire", [195, WIRE], 1.3, wireKeys, { layer: "back" }),
      ...swap("b2-bird-r-fly", "b2-bird-r", B1, BSZ, bird1, [[LAND1, FLY]]),
      ...swap("b2-bird-l-fly", "b2-bird-l", B2, BSZ, bird2, [[LAND2, FLY + 80]]),
      ...CHIRPS.map((c, i) => puff1("note", i % 2 ? SKY : OR, i % 2 ? [236, 540] : [176, 540], DUET + c, i % 2 ? -70 : -110, 0.06)),
      tr("p3-heart", [206, 512], 0.13, [{ t: 0, s: 0 }, { t: 3560, s: 0.2, e: "hold" }, { t: 3700, s: 1.15, e: "out" }, { t: 3800, s: 1 }, { t: 3900, s: 1, y: 0 }, { t: 4300, y: px(-40), s: 0, e: "in" }]),
      glint([144, 600], LAND1, [CREAM, OR], 5, { speed: [0.1, 0.25] }), glint([268, 600], LAND2, [CREAM, SKY], 5, { speed: [0.1, 0.25] }),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 250, volume: 0.3 }, { name: "lab-b2-bird-chirp-2", at: LAND1, volume: 0.6 }, { name: "lab-swoosh-soft-2", at: 1350, volume: 0.3 }, { name: "pop", at: LAND2, volume: 0.4 },
      { name: "lab-hop-boing-small-2", at: SCOOT, volume: 0.4 }, { name: "lab-b2-bird-chirp-1", at: DUET, volume: 0.7 }, { name: "heart-blip", at: 3560, volume: 0.55 }, { name: "lab-swoosh-soft-1", at: FLY, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.9, 0.8], face: "curious" }, { at: 800, move: "h-cheek" }, { at: 1200, look: [0.9, 0.8] }, { at: LAND2, look: [0, 1], haptic: "light" }, { at: FLY + 300, look: [0.8, -0.2] }, { at: 4300, look: "off", face: "warm" }] },
];

// ═════════════════════ Purchase done: "You're in" (rare, medium) ═════════════════════
// A. Your program as a book: it lands, opens, and fizzes like a sparkler.
const BOOK: P = [195, 598], OPEN = 850;
const bookKeys: K[] = [{ t: 0, y: px(260), r: 10, s: 0.8 }, { t: 360, y: 0, r: 0, s: 1, e: "back" }, { t: 520, r: 0 }, { t: 600, r: -6 }, { t: 700, r: 5 }, { t: 780, r: 0 }, { t: OPEN, s: 1 }, { t: OPEN + 60, s: 0.86 }, { t: OPEN + 220, s: 1.1, e: "out" }, { t: OPEN + 360, s: 1 },
  ...hop(1700, 20, 300), { t: 3650, s: 1 }, { t: 3710, s: 0.92 }, { t: 3860, s: 1, e: "back" }, { t: 4000, y: 0, s: 1 }, { t: 4380, y: px(-60), s: 0, r: -10, e: "in" }];
const fan = (t: number, a: [number, number]): E[] => [
  fsparks({ origin: at(BOOK[0], BOOK[1] - 30), at: t, count: 30, stagger: 2200, spread: a, speed: [0.36, 0.75], drag: 2.2, gravity: 0.45, size: [0.02, 0.046], life: [800, 1100], fadeOut: 350 }),
  { kind: "burst", shapes: ["star"], colors: [GOLD, SUN, LIME, PINK], origin: at(BOOK[0], BOOK[1] - 30), at: t, count: 5, stagger: 1500, spread: a, speed: [0.45, 0.8], drag: 1.9, gravity: 0.35, spin: [60, 200], size: [0.05, 0.085], life: [1200, 1500], fadeOut: 400 }];
// B. The door and the key: the door stands a little left; the key hops in from the right, unlocks it and goes in.
const DOOR: P = [178, 590], DS = 0.46, KEYHOLE: P = [178 - 0.16 * DS * W, 590 + 0.17 * DS * W], KS = 0.27, IN = 1250, CLICK = 1450, SWING = 1720;
const KEYO: P = [KEYHOLE[0] + 0.42 * KS * W, KEYHOLE[1]];
const keyKeys: K[] = [...hops(KEYO, [[280, 440, 640, 44], [560, 345, 640, 36], [820, 285, 640, 0]], -8, 0.92), { t: 940, s: 1, x: px(285 - KEYO[0]), y: px(640 - KEYO[1]), r: 0 }, { t: 1000, s: 0.92, y: px(646 - KEYO[1]) },
  { t: IN, x: px(8), y: 0, s: 1, r: 0, e: "out" }, { t: IN + 50, x: 0 }, { t: CLICK - 80, r: 0 }, { t: CLICK, r: 24, e: "in" }, { t: CLICK + 165, r: -8, e: "out" }, { t: CLICK + 240, r: 0 },
  { t: SWING, x: 0, r: 0 }, { t: SWING + 140, x: px(40), y: px(-16), r: -12, e: "out" }, { t: SWING + 360, x: px(54), y: px(22), r: 0, e: "in" }, { t: SWING + 520, y: px(8), e: "out" }, { t: SWING + 760, x: px(16), y: px(6), s: 0, e: "in" }];
const doorKeys: K[] = [...popIn(0, 320), { t: IN, s: 1, r: 0 }, { t: IN + 50, s: 0.97, r: -1.5 }, { t: IN + 200, s: 1, r: 0, e: "back" }, { t: SWING, s: 1 }, { t: SWING + 70, s: 1.06, e: "out" }, { t: SWING + 260, s: 1 }, ...popOut(3350, 300)];
// C. The golden ticket and its stub.
const TK: P = [195, 606], TKS = 0.5, TEAR = 1000;
const ticketKeys: K[] = [{ t: 0, x: px(-330), y: px(-40), r: -24 }, { t: 520, x: 0, y: 0, r: 0, e: "out" }, { t: 600, r: 3 }, { t: 720, r: 0 }, { t: TEAR, x: 0, r: 0 }, { t: TEAR + 110, x: px(-10), r: -3, e: "out" }, { t: TEAR + 320, x: 0, r: 0 },
  ...hop(1650, 28, 320), { t: 2650, r: 0, s: 1 }, { t: 2760, s: 1.1, e: "out" }, { t: 3150, s: 0, r: 200, e: "in" }];
const stubKeys: K[] = [...ticketKeys.filter(k => k.t <= TEAR), { t: TEAR + 110, x: px(14), y: px(-6), r: 14, e: "out" }, { t: 1250, x: px(16), y: px(-8), r: 12 },
  { t: 1640, x: px(40), y: px(-176), r: -14, s: 0.5, e: "in" }, { t: 1680, o: 0 }];

const purchase: FxEffect[] = [
  // SYNC: the book flips open on the two flips of lab-page-flip-1 (850 and 1010 ms); the sparkler fizz of lab-sparkler-1 starts
  // as the sparks leave the pages (1010); the book claps shut on lab-book-close-2 (3710).
  { id: "pd-book-opens", name: "Your program opens", ms: 4600,
    feel: "Your program arrives as a book with a face. It wriggles, flips open under Pip, and gold sparks and stars fizz out of its pages to both sides like a sparkler while Pip makes heart hands: thank you, you're in. Then it claps shut and pops away. No money anywhere.",
    emitters: [
      ground(BOOK, GY + 8, 0.36, bookKeys.map(k => ({ ...k, y: Math.min(0, k.y ?? 0) }))),
      ...fan(1010, [-162, -128]).map(e => ({ ...e, layer: "back" as const })), ...fan(1010, [-52, -18]).map(e => ({ ...e, layer: "back" as const })),
      ...swap("b2-book", "b2-book-open", BOOK, 0.48, bookKeys, [[OPEN + 60, 3710]]),
      twinkleBox([195, 590], 175, 60, 1100, 12, [GOLD, SUN, CREAM], 2200),
      glint([195, 590], OPEN + 100, [GOLD, CREAM, LIME], 12),
    ],
    sounds: [{ name: "pop", at: 60, volume: 0.45 }, { name: "lab-page-flip-1", at: OPEN, volume: 0.8 }, { name: "lab-sparkler-1", at: 1010, volume: 0.6 }, { name: "lab-harp-gliss-1", at: 1010, volume: 0.5 },
      { name: "lab-book-close-2", at: 3670, volume: 0.7 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: 700, look: "off", move: "h-heart" }, { at: OPEN + 160, haptic: "success" }, { at: 4150, face: "smile", body: "nod" }] },
  // SYNC: the key's two hops land on lab-hop-boing-small-1 / -2 (560, 820 ms); it goes into the lock on the first click of
  // lab-pen-click-1 (1250); it turns on the two clicks of lab-lock-click-2 (1450, 1615); the door swings open on
  // lab-harp-gliss-1 (1720) with the light; the key hops inside on "pop" (2480).
  { id: "pd-key-and-door", name: "The key lets you in", ms: 3800,
    feel: "A door stands under Pip. A little gold key with a face hops in, jumps into the lock, turns with a click, and the door swings open: warm light and stars pour out, the key hops inside, and Pip leans in after it. You're in.",
    emitters: [
      ground(DOOR, GY + 8, 0.36, doorKeys), ground(KEYO, GY, 0.14, keyKeys.map(k => ({ ...k, y: Math.min(0, (k.y ?? 0) - px(640 - KEYO[1])) })), 0.5),
      ...swap("b2-door", "b2-door-open", DOOR, DS, doorKeys, [[SWING, Infinity]]),
      tr("b2-key", KEYO, KS, [{ ...keyKeys[0], t: 0, s: 0 }, { ...keyKeys[0], s: 1, e: "hold" }, ...keyKeys.slice(1)]),
      glint([DOOR[0], DOOR[1]], SWING + 40, [GOLD, SUN, CREAM], 16, { speed: [0.3, 0.75] }),
      { kind: "rise", shapes: ["star", "sparkle"], colors: [GOLD, SUN, CREAM], count: 10, at: SWING + 100, stagger: 1200, area: [(DOOR[0] - 30) / W, 0.6, (DOOR[0] + 30) / W, 0.74], speed: [0.1, 0.2], sway: 0.02, size: [0.03, 0.055], life: [700, 900] },
      twinkleBox([DOOR[0], 590], 150, 70, SWING + 100, 10, [GOLD, CREAM], 1300),
    ],
    sounds: [{ name: "pop", at: 40, volume: 0.45 }, { name: "lab-hop-boing-small-1", at: 560, volume: 0.5 }, { name: "lab-hop-boing-small-2", at: 820, volume: 0.5 }, { name: "lab-pen-click-1", at: IN, volume: 0.7 },
      { name: "lab-lock-click-2", at: CLICK, volume: 0.9 }, { name: "lab-harp-gliss-1", at: SWING, volume: 0.65 }, { name: "lab-magic-shimmer-1", at: SWING + 60, volume: 0.4 }, { name: "pop", at: SWING + 760, volume: 0.4 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: 300, look: [0.9, 1] }, { at: 940, look: [0.3, 1] }, { at: CLICK, look: [-0.2, 1], body: "nod" }, { at: SWING, face: "laugh", body: "hop", haptic: "success" },
      { at: SWING + 620, look: "off", face: "warm", body: "lean" }, { at: 3450, face: "smile" }] },
  // SYNC: the stub tears off on lab-page-flip-2 (1000 ms); Pip pockets it and the ticket jumps on lab-medal-ding-1 (1650);
  // the ticket spins away on lab-swoosh-soft-2 (2760).
  { id: "pd-golden-ticket", name: "Golden ticket", ms: 3500,
    feel: "A golden ticket with a happy face sails in under Pip. Its stub tears off with a rip and flies up behind Pip (he keeps it), the ticket jumps in a puff of gold sparkle, Pip gives a proud nod, and the ticket spins away. Your place is booked.",
    emitters: [
      ground(TK, GY + 6, 0.4, ticketKeys.map(k => ({ ...k, y: 0 }))),
      tr("b2-ticket-stub", TK, TKS, stubKeys, { layer: "back" }),
      tr("b2-ticket", TK, TKS, ticketKeys),
      glint([TK[0] + 34, TK[1]], TEAR + 20, [GOLD, CREAM], 7, { speed: [0.12, 0.3] }),
      glint([TK[0] - 10, TK[1]], 1650, [GOLD, SUN, CREAM], 16), twinkleBox([195, 600], 175, 60, 1650, 12, [GOLD, SUN, CREAM], 900),
      ...behind(depth(fall({ at: 1650, shapes: ["sparkle", "glitter", "star"], colors: [GOLD, SUN, CREAM], speed: [0.3, 0.5], gravity: 0.06, sway: 0.016, spin: [40, 160], size: [0.024, 0.055], life: [1300, 1600], stagger: 500, flip: false }), 30)),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: 100, volume: 0.45 }, { name: "pop", at: 520, volume: 0.35 }, { name: "lab-page-flip-2", at: TEAR, volume: 0.85 }, { name: "lab-medal-ding-1", at: 1650, volume: 0.75 },
      { name: "lab-stars-twinkle-1", at: 1800, volume: 0.35 }, { name: "lab-swoosh-soft-2", at: 2760, volume: 0.4 }],
    pip: [{ at: 0, look: [-0.9, 0.9], face: "curious" }, { at: 520, look: [0, 1] }, { at: TEAR, face: "smile" }, { at: 1350, look: [0.5, 0.6] }, { at: 1650, look: "off", face: "proud", body: "nod", haptic: "success" }, { at: 2800, face: "warm" }] },
];

// ═════════════════════ Error / offline: "your work is safe" (rare, small) ═════════════════════
// A. The retro computer: "!" on its screen, a blink, then a calm face and a green check.
const PC: P = [195, 604], PCS = 0.38, OK = 1050;
const pcKeys: K[] = [...popIn(0, 300), { t: 380, r: 0 }, { t: 520, r: -7, e: "out" }, { t: 860, r: -7 }, { t: 960, r: 0 }, ...hop(OK, 18, 280), { t: 1600, r: 0 }, { t: 1700, r: 4 }, { t: 1820, r: 0 }, ...popOut(2150)];
// B. The umbrella: a dozing cloud rains a little, an umbrella opens over your work.
const UMB: P = [195, 648], US = 0.46, SHEET: P = [195, 698], CLD: P = [195, 524];
const cloudKeys: K[] = [{ t: 0, x: px(-300), o: 0 }, { t: 80, o: 1 }, { t: 640, x: 0, e: "out" }, { t: 1500, y: px(3) }, { t: 2300, x: 0, y: 0 }, { t: 3050, x: px(310), e: "in" }];
const umbKeys: K[] = [{ t: 0, s: 0, y: px(40) }, { t: 500, s: 0.1, y: px(40), e: "hold" }, { t: 720, s: 1, y: 0, e: "back" }, { t: 2900, s: 1, r: 0 }, { t: 2960, r: -6 }, { t: 3040, r: 5 }, { t: 3100, r: 0 }, { t: 3340, s: 0, y: px(40), e: "in" }];
// C. The cat: a gust lifts your page, a ginger cat lands on it and stays.
const PAGE: P = [195, 672], CAT: P = [198, 628], CATS = 0.36, SIT = 950;
const pageKeys: K[] = [...popIn(0, 220), { t: 380, x: 0, y: 0, r: 0 }, { t: 600, x: px(16), y: px(-12), r: -9, e: "out" }, { t: 760, x: px(26), y: px(-8), r: -4 }, { t: 880, x: px(36), y: px(-14), r: -10 },
  { t: SIT, x: px(4), y: px(2), r: 0, s: 0.97, e: "in" }, { t: SIT + 180, x: 0, y: 0, s: 1, e: "back" }, ...popOut(2420)];
const catKeys: K[] = [{ t: 0, s: 0 }, { t: 700, s: 0.9, y: px(-76), o: 0, r: -8, e: "hold" }, { t: 780, o: 1 }, { t: SIT, y: 0, r: 0, s: 1, e: "in" }, { t: SIT + 70, y: px(5), s: 0.93 }, { t: SIT + 260, y: 0, s: 1, e: "back" },
  { t: 1600, r: 0 }, { t: 1760, r: -2.5 }, { t: 1950, r: 2 }, { t: 2100, r: 0 }, ...popOut(2380)];
const gust = (t: number, ys: number[]): E[] => ys.map((y, i): E => tr("speed", [195, y], 0.3 + (i % 3) * 0.1, [{ t: 0, x: -1.1, o: 0, r: 180 }, { t: t + i * 60, x: -1.1, o: 0.5, e: "hold" }, { t: t + i * 60 + 420, x: 1.2, e: "lin" }], { colors: [i % 2 ? CREAM : ICE], layer: "back" }));

const errorSafe: FxEffect[] = [
  // SYNC: the "!" shows on a soft "boop" (130 ms); the screen blinks and the calm face with the green check comes up on
  // lab-save-confirm-1 (1050), the computer's small hop on the same hit.
  { id: "es-calm-computer", name: "The calm computer", ms: 2500,
    feel: "A little old computer pops up under Pip with an amber ! on its screen and tips its head, puzzled. Its screen blinks, a calm happy face and a green check come up, and it gives a small hop: sorted, your work is safe. Pip looks, then smiles and nods. No buzz, nothing red.",
    emitters: [
      ground(PC, GY + 6, 0.32, pcKeys),
      tr("b2-pc", PC, PCS, pcKeys),
      tr("b2-pc-alert", PC, PCS, gated(pcKeys, [[130, 900]])), tr("b2-pc-ok", PC, PCS, gated(pcKeys, [[OK, Infinity]])),
      glint([PC[0] + 22, PC[1] - 22], OK + 20, [GREEN, LIME, CREAM], 9), twinkleBox([195, 590], 130, 60, OK + 100, 5, [GREEN, CREAM], 500),
    ],
    sounds: [{ name: "pop", at: 30, volume: 0.35 }, { name: "boop", at: 130, volume: 0.4 }, { name: "lab-save-confirm-1", at: OK, volume: 0.7 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: OK, face: "smile", body: "nod" }, { at: 1750, look: "off", face: "warm" }] },
  // SYNC: the umbrella springs open on "pop" (520 ms), before the first drops of lab-b2-rain-soft-1 (700) reach it; the drops
  // patter on it for as long as the rain sound runs; a soft lab-kalimba-warm-1 note (1500) as your page smiles underneath.
  { id: "es-umbrella", name: "Under the umbrella", ms: 3500,
    feel: "A dozing little cloud drifts in under Pip and starts to drip. A lime umbrella springs open just in time over your page, the drops patter off it and the page stays dry and smiling, while Pip gives an easy palms-up shrug: these things happen, nothing is lost. The cloud drifts on.",
    emitters: [
      ground(SHEET, 720, 0.34, [{ t: 0, s: 0 }, { t: 200, s: 1 }, { t: 3100, s: 1 }, { t: 3340, s: 0 }]),
      tr("b2-sheet", SHEET, 0.27, [...popIn(0, 240), ...hop(1500, 8, 260), ...popOut(3120, 220)]),
      tr("b2-umbrella", UMB, US, umbKeys),
      { kind: "rain", shapes: ["drop"], colors: [ICE, "#FFFFFF"], count: 26, at: 700, stagger: 1650, area: [0.39, 0.648, 0.61, 0.648], speed: [0.24, 0.3], gravity: 0.6, size: [0.016, 0.026], life: [150, 170], upright: true, fadeIn: 20, fadeOut: 40 },
      { kind: "burst", shapes: ["drop"], colors: [ICE, "#FFFFFF"], origin: at(195, 588), at: 760, count: 22, stagger: 1650, spread: [-165, -15], speed: [0.14, 0.26], drag: 1.2, gravity: 1.3, size: [0.012, 0.02], life: [300, 380], upright: true, fadeIn: 10, fadeOut: 100 },
      tr("b2-cloud", CLD, 0.27, cloudKeys),
      puff1("zed", "#C4B5FD", [CLD[0] + 44, CLD[1] - 4], 900, -40, 0.04, { life: [700, 700] }), puff1("zed", "#C4B5FD", [CLD[0] + 44, CLD[1] - 4], 1700, -40, 0.04, { life: [700, 700] }),
    ],
    sounds: [{ name: "lab-swoosh-soft-2", at: 60, volume: 0.3 }, { name: "pop", at: 520, volume: 0.5 }, { name: "lab-b2-rain-soft-1", at: 700, volume: 0.5 }, { name: "lab-kalimba-warm-1", at: 1500, volume: 0.45 }],
    pip: [{ at: 0, move: "h-palms", look: [-0.6, 0.9] }, { at: 640, look: [0, 1] }, { at: 2500, look: [0.6, 0.9] }, { at: 3300, look: "off", face: "warm" }] },
  // SYNC: the gust passes on "whoosh" (380 ms); the cat lands on your page on the pat of lab-grip-pat-2 (950) and says
  // lab-b2-cat-meow-1 (1080); a second gust on lab-swoosh-soft-1 (1500) moves nothing, and the cat purrs (lab-b2-cat-purr-1, 1650).
  { id: "es-cat-on-your-page", name: "Cat on your page", ms: 2800,
    feel: "A gust blows across under Pip and your page starts to lift away. A ginger cat drops onto it, settles into a loaf and purrs; the next gust moves nothing at all. Your work is going nowhere. Pip watches, smiles and nods.",
    emitters: [
      ground(PAGE, 696, 0.34, [{ t: 0, s: 0 }, { t: 220, s: 0.8 }, { t: SIT, s: 0.8 }, { t: SIT + 100, s: 1.05 }, { t: 2400, s: 1 }, { t: 2640, s: 0 }]),
      ...gust(380, [620, 646, 674, 634]), ...gust(1500, [624, 664, 642]),
      { kind: "burst", shapes: ["leaf"], colors: [OR, GOLD, LIME], origin: [-0.05, 0.76], at: 420, count: 4, stagger: 250, spread: [-14, 6], speed: [0.9, 1.3], drag: 0.3, gravity: 0.05, spin: [200, 400], size: [0.03, 0.045], life: [800, 900] },
      { kind: "burst", shapes: ["leaf"], colors: [OR, GOLD], origin: [-0.05, 0.78], at: 1540, count: 3, stagger: 200, spread: [-12, 4], speed: [0.9, 1.3], drag: 0.3, gravity: 0.05, spin: [200, 400], size: [0.03, 0.045], life: [800, 900] },
      tr("b2-sheet", PAGE, 0.32, pageKeys),
      tr("b2-cat", CAT, CATS, catKeys),
      tr("p3-puff", [CAT[0] - 56, 680], 0.1, [{ t: 0, s: 0 }, { t: SIT, s: 0.3, e: "hold" }, { t: SIT + 160, s: 1, x: px(-10), e: "out" }, { t: SIT + 500, s: 1.2, x: px(-22), o: 0 }]),
      tr("p3-puff", [CAT[0] + 62, 680], 0.1, [{ t: 0, s: 0 }, { t: SIT, s: 0.3, e: "hold" }, { t: SIT + 160, s: 1, x: px(10), e: "out" }, { t: SIT + 500, s: 1.2, x: px(22), o: 0 }]),
      puff1("heart", PINK, [CAT[0] - 30, 584], 1700, -100, 0.045), puff1("heart", RED, [CAT[0] - 44, 590], 2000, -80, 0.035),
    ],
    sounds: [{ name: "whoosh", at: 380, volume: 0.35 }, { name: "lab-grip-pat-2", at: SIT - 60, volume: 0.6 }, { name: "lab-b2-cat-meow-1", at: 1080, volume: 0.6 }, { name: "lab-swoosh-soft-1", at: 1500, volume: 0.3 },
      { name: "lab-b2-cat-purr-1", at: 1650, volume: 0.55 }],
    pip: [{ at: 0, look: [0, 1], face: "calm" }, { at: 420, look: [0.6, 0.9], face: "curious" }, { at: SIT, look: [0, 1], face: "smile" }, { at: 1650, body: "nod", face: "warm" }, { at: 2450, look: "off" }] },
];

// ═════════════════════ Waiting / loading / empty list (often; a calm loop, ms = one loop) ═════════════════════
// A. The goldfish in a bag of water: it swims across, turns, swims back.
const BAGP: P = [195, 604], BGS = 0.38, FY = 636, LOOPA = 4400;
const bagKeys: K[] = [{ t: 0, o: 0, r: -1.5 }, { t: 220, o: 1 }, { t: 1100, r: 1.5 }, { t: 2200, r: -1.5 }, { t: 3300, r: 1.5 }, { t: LOOPA - 240, r: -1.2, o: 1 }, { t: LOOPA - 40, r: -1.5, o: 0 }];
const fishKeys: K[] = [{ t: 0, x: px(-22), y: 0, o: 0 }, { t: 220, o: 1, x: px(-19) }, { t: 900, x: px(0), y: px(-4), e: "lin" }, { t: 1700, x: px(22), y: px(1), e: "out" }, { t: 1800, x: px(22) }, { t: 2600, x: px(2), y: px(4), e: "in" }, { t: 3600, x: px(-22), y: px(0), e: "out" },
  { t: 3700, x: px(-22) }, { t: LOOPA - 240, x: px(-20), o: 1 }, { t: LOOPA - 40, o: 0 }];
const bubbles = (t: number, x: number): E => ({ kind: "rise", shapes: ["bubble"], colors: ["#FFFFFF", ICE], count: 3, at: t, stagger: 380, area: [(x - 5) / W, 0, (x + 5) / W, (FY - 4) / H], speed: [0.04, 0.055], sway: 0.006, size: [0.022, 0.034], life: [520, 600], fadeIn: 60, fadeOut: 80, upright: true });
// B. The sand timer.
const HG: P = [195, 606], HGS = 0.36, RUN: [number, number] = [260, 3200], FLIP = 3500, LOOPB = 4600;
const hgTurn: K[] = [{ t: 0, o: 0, r: 0 }, { t: 220, o: 1 }, { t: FLIP - 240, y: 0, r: 0 }, { t: FLIP - 110, y: px(-16), e: "out" }, { t: FLIP, y: px(-12), r: 0 }, { t: FLIP + 420, r: 180, y: px(-12), e: "io" }, { t: FLIP + 520, y: px(2), e: "in" }, { t: FLIP + 640, y: 0, e: "back" },
  { t: LOOPB - 240, o: 1 }, { t: LOOPB - 40, o: 0 }];
const HEAP_D = 0.335 * HGS;   // from the box's middle down to the glass floor (screen widths)
// C. The snail whose shell turns like a loading wheel, and three dots.
const SN: P = [158, 618], SNS = 0.36, SH: P = [141, 618], LOOPC = 4400, DOTS = [800, 1500, 2200];
const snailKeys: K[] = [{ t: 0, o: 0, x: px(-8) }, { t: 240, o: 1 }, { t: 700, x: 0, e: "io" }, ...DOTS.flatMap((t): K[] => [{ t, s: 1 }, { t: t + 90, s: 1.03, e: "out" }, { t: t + 260, s: 1 }]), { t: 3200, x: 0 }, { t: 4000, x: px(-8), e: "io" }, { t: LOOPC - 240, o: 1 }, { t: LOOPC - 40, o: 0 }];

const waiting: FxEffect[] = [
  // SYNC: one quiet sound per loop: "bubbles" (900 ms) as the fish lets its first bubbles go; the second bubbles (2850) are silent.
  { id: "we-goldfish", name: "Goldfish in a bag", ms: LOOPA,
    feel: "A goldfish in a bag of water sits under Pip. It swims across, blows three bubbles, turns, swims back and blows three more, and the bag sways a little. One loop is 4.4 s and joins up with itself; only one soft bubble sound per loop. Pip glances down at it now and then. For an empty list the fish simply stays; for loading it leaves as soon as the content is there.",
    emitters: [
      ground(BAGP, GY + 4, 0.34, [{ t: 0, o: 0 }, { t: 220, o: 1 }, { t: LOOPA - 240, o: 1 }, { t: LOOPA - 40, o: 0 }]),
      tr("b2-bag-water", BAGP, BGS, bagKeys),
      ...swap("b2-fish-l", "b2-fish-r", [195, FY], 0.13, fishKeys, [[0, 1750], [3650, Infinity]]),
      bubbles(950, 222), bubbles(2850, 168),
      tr("b2-bag", BAGP, BGS, bagKeys),
    ],
    sounds: [{ name: "bubbles", at: 900, volume: 0.22 }],
    pip: [{ at: 900, look: [0.2, 1], face: "curious" }, { at: 2000, look: "off", face: "calm" }, { at: 2850, look: [-0.2, 1], face: "smile" }, { at: 3300, body: "settle" }, { at: 3900, look: "off", face: "calm" }] },
  // SYNC: silent while the sand runs; the timer turns itself over on lab-swoosh-soft-1 (3500 ms) and lands on "tick" (4020).
  { id: "we-sand-timer", name: "Sand timer", ms: LOOPB,
    feel: "A sand timer stands under Pip. The sand runs down grain by grain for three seconds, then the timer hops, turns itself over with a soft swish and lands with a tick, ready to go again. Pip thinks, and nods when it turns. Loops; on a long wait the sounds can drop out after the second turn.",
    emitters: [
      ground(HG, GY + 6, 0.3, hgTurn.map(k => ({ ...k, r: 0 }))),
      tr("b2-sand-top", HG, HGS, [{ t: 0, o: 0, s: 1 }, { t: 220, o: 1 }, { t: RUN[0], s: 1 }, { t: RUN[1], s: 0.06, e: "lin" }, { t: RUN[1] + 60, o: 0 }]),
      tr("b2-sand-line", HG, HGS, [{ t: 0, o: 0 }, { t: RUN[0], o: 0 }, { t: RUN[0] + 80, o: 0.9 }, { t: RUN[1], o: 0.9 }, { t: RUN[1] + 120, o: 0 }]),
      tr("b2-sand-heap", HG, HGS, [{ t: 0, o: 0, s: 0.06, y: HEAP_D * 0.94 }, { t: RUN[0], o: 1 }, { t: RUN[1], s: 1, y: 0, e: "lin" }, ...hgTurn.filter(k => k.t >= FLIP - 240)]),
      tr("b2-hourglass", HG, HGS, hgTurn),
      glint([HG[0], HG[1] + 40], FLIP + 520, [SUN, CREAM], 5, { speed: [0.1, 0.25] }),
    ],
    sounds: [{ name: "lab-swoosh-soft-1", at: FLIP, volume: 0.3 }, { name: "tick", at: FLIP + 520, volume: 0.35 }],
    pip: [{ at: 800, face: "thinking", look: [0, 1] }, { at: FLIP, face: "curious" }, { at: FLIP + 520, look: "off", face: "smile", body: "nod" }, { at: 4350, face: "calm" }] },
  // SYNC: the three dots pop up on three quiet "tick"s (800, 1500, 2200 ms); nothing else sounds.
  { id: "we-snail-spinner", name: "Snail with a spinner shell", ms: LOOPC,
    feel: "A snail sits under Pip and its shell turns round and round like a loading wheel. Three dots pop up in front of it one by one, each with a quiet tick, and fade; the snail's eyes stay on them. Three full turns per loop, so it joins up with itself. Pip thinks along and sways once. For an empty list: the same snail, no dots.",
    emitters: [
      ground(SN, GY + 4, 0.34, snailKeys),
      tr("b2-snail", SN, SNS, snailKeys),
      tr("b2-shell", SH, 0.21, norm(snailKeys).map(k => ({ ...k, r: (k.t / LOOPC) * 1080, s: 1, e: "lin" as const }))),
      ...DOTS.map((t, i) => tr("b2-dot", [258 + i * 34, 640], 0.045, [{ t: 0, s: 0 }, { t, s: 0, e: "hold" }, { t: t + 200, s: 1, e: "back" }, { t: 3100 + i * 80, s: 1 }, { t: 3320 + i * 80, s: 0, e: "in" }], { colors: [[LIME, SUN, PINK][i]] })),
    ],
    sounds: DOTS.map((t, i) => ({ name: "tick", at: t, volume: 0.22 + i * 0.03 })),
    pip: [{ at: 800, face: "thinking", look: [0.5, 1] }, { at: 2200, face: "curious" }, { at: 3200, look: "off", body: "sway", face: "calm" }] },
];

// ═════════════════════ Notification permission (once, small): the ask ═════════════════════
// A. The bell.
const BELL: P = [195, 600], BLS = 0.38, RING = [500, 900];
const bellKeys: K[] = [...popIn(0, 300), ...RING.flatMap((t, i): K[] => [{ t, r: 0 }, { t: t + 80, r: 15 - i * 4, e: "out" }, { t: t + 190, r: -11 + i * 3 }, { t: t + 290, r: 5 }, { t: t + 370, r: 0 }]),
  { t: 1350, r: 0 }, { t: 1500, r: 7, e: "out" }, { t: 2050, r: 7 }, ...popOut(2100)];
const arcs = (o: P, size: number, t: number, c: string): E => tr("b2-arcs", o, size, [{ t: 0, s: 0 }, { t, s: 0.75, o: 1, e: "hold" }, { t: t + 260, s: 1.12, o: 0, e: "out" }], { colors: [c] });
// B. The letterbox.
const MB: P = [195, 600], MBS = 0.4, PEEK = 600, FLAG = 1040;
const mbKeys: K[] = [...popIn(0, 300), { t: PEEK, s: 1 }, { t: PEEK + 70, s: 1.04, e: "out" }, { t: PEEK + 220, s: 1 }, { t: FLAG + 90, r: 0 }, { t: FLAG + 150, r: -3 }, { t: FLAG + 300, r: 0, e: "back" }, ...popOut(2250)];
// C. The phone.
const PH: P = [195, 598], PHS = 0.42, BUZZ: [number, number][] = [[500, 820], [980, 1300]], NOTE = 1360;
const phoneKeys: K[] = [...popIn(0, 300), ...BUZZ.flatMap(([a, b]) => shake(a, b, 3, 40, 2)), ...hop(NOTE + 60, 14, 260), ...popOut(2200)];

const permission: FxEffect[] = [
  // SYNC: the bell swings on the two rings of lab-b2-hand-bell-1 (500 and 900 ms; the second is softer), sound arcs on each.
  { id: "pa-polite-bell", name: "The polite bell", ms: 2400,
    feel: "Ask: a small gold bell with a face pops up under Pip, gives two gentle rings (the second softer), then tips its head and looks up at him: may I? Pip sways, easy either way. Not now: the bell does not ring again; it yawns one z, settles down to sleep with a smile, and Pip nods. No is a fine answer.",
    emitters: [
      ground(BELL, GY + 2, 0.28, bellKeys.map(k => ({ ...k, r: 0 }))),
      tr("b2-clapper", BELL, BLS, norm(bellKeys).map(k => ({ ...k, r: -k.r * 1.5 }))),
      tr("b2-bell", BELL, BLS, bellKeys),
      arcs(BELL, 0.54, RING[0] + 60, SUN), arcs(BELL, 0.5, RING[1] + 60, CREAM),
      glint([BELL[0], BELL[1] - 50], RING[0] + 60, [GOLD, CREAM], 5, { speed: [0.1, 0.25] }),
    ],
    sounds: [{ name: "pop", at: 30, volume: 0.4 }, { name: "lab-b2-hand-bell-1", at: RING[0] + 50, volume: 0.6 }, { name: "lab-b2-hand-bell-1", at: RING[1] + 50, volume: 0.4 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: RING[0] + 60, face: "smile" }, { at: 1400, look: "off", face: "warm", body: "sway" }] },
  // SYNC: the letter peeks out on "pop" (600 ms); the red flag snaps up on lab-lock-click-1 (1150).
  { id: "pa-letterbox", name: "Letterbox flag", ms: 2550,
    feel: "Ask: a blue letterbox with a face pops up under Pip, a small letter with a heart peeks out over its top, and the red flag flips up with a click: may I send you a note now and then? Pip nods with a smile. Not now: the flag goes back down, the letter slips inside, the letterbox keeps smiling, and Pip breathes out with a warm face.",
    emitters: [
      ground(MB, GY + 10, 0.26, mbKeys),
      tr("b2-letter", [MB[0], MB[1] - 34], 0.2, [{ t: 0, s: 0 }, { t: PEEK, s: 1, y: 0, e: "hold" }, { t: PEEK + 260, y: px(-52), e: "back" }, { t: 1400, r: 0 }, { t: 1500, r: -9 }, { t: 1620, r: 8 }, { t: 1740, r: 0 }, { t: 2150, y: px(-52) }, { t: 2300, y: 0, e: "in" }, { t: 2310, s: 0, e: "hold" }]),
      tr("b2-mailbox", MB, MBS, mbKeys),
      tr("b2-flag", [MB[0] + 0.3 * MBS * W, MB[1] - 0.06 * MBS * W], MBS * 0.9, [...popIn(0, 300).map(k => ({ ...k, r: 90 })), { t: FLAG, r: 90 }, { t: FLAG + 130, r: -8, e: "in" }, { t: FLAG + 230, r: 4 }, { t: FLAG + 300, r: 0 }, { t: 2250, s: 1 }, { t: 2490, s: 0, e: "in" }]),
      glint([MB[0] + 50, MB[1] - 50], FLAG + 130, [RED, CREAM, SUN], 6, { speed: [0.1, 0.28] }),
    ],
    sounds: [{ name: "pop", at: 30, volume: 0.4 }, { name: "pop", at: PEEK, volume: 0.45 }, { name: "lab-lock-click-1", at: FLAG + 110, volume: 0.8 }],
    pip: [{ at: 0, look: [0, 1], face: "curious" }, { at: FLAG + 130, face: "smile", body: "nod" }, { at: 1900, look: "off", face: "warm" }] },
  // SYNC: the phone shakes on the two buzzes of lab-b2-phone-buzz-2 (500-820 and 980-1300 ms); the notification drops onto its
  // screen on "pop" (1360).
  { id: "pa-phone-buzz", name: "A friendly buzz", ms: 2500,
    feel: "Ask: a little phone with a face pops up under Pip, buzzes twice (it shakes, with buzz lines on both sides), and a small notification drops onto its screen: this is all it would be. It looks up at Pip, who listens, then turns warm. Not now: the notification slides away, the phone goes quiet and dozes, and Pip just smiles.",
    emitters: [
      ground(PH, GY + 6, 0.24, phoneKeys.map(k => ({ ...k, x: 0 }))),
      tr("b2-phone", PH, PHS, phoneKeys),
      tr("b2-banner", PH, PHS, [{ t: 0, s: 0 }, { t: NOTE, s: 1, y: px(-26), o: 0, e: "hold" }, { t: NOTE + 40, o: 1 }, { t: NOTE + 160, y: 0, e: "back" }, ...norm(phoneKeys).filter(k => k.t > NOTE + 160)]),
      ...BUZZ.flatMap(([a]) => [arcs(PH, 0.46, a, CREAM), arcs(PH, 0.46, a + 150, CREAM)]),
      glint([PH[0], PH[1] - 40], NOTE + 160, [OR, CREAM, SUN], 6, { speed: [0.1, 0.25] }),
    ],
    sounds: [{ name: "pop", at: 30, volume: 0.4 }, { name: "lab-b2-phone-buzz-2", at: 420, volume: 0.6 }, { name: "pop", at: NOTE, volume: 0.45 }],
    pip: [{ at: 0, look: [0, 1], face: "listening" }, { at: NOTE + 160, face: "smile", body: "hop" }, { at: 1950, look: "off", face: "warm" }] },
];

export const SAMPLES_B2B: Record<string, FxEffect[]> = {
  "welcome-first-launch": welcome,
  "onboarding-done": onboarding,
  "buddy-paired": buddy,
  "purchase-done": purchase,
  "error-safe": errorSafe,
  "waiting-empty": waiting,
  "permission-ask": permission,
};
