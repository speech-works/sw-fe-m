// Easing curves. Copied 1:1 from web/scripts/hands/hands-rig.js (line 6 to 10), web/scripts/fx.js (E.inout) and web/scripts/live.js (sio).
// Every function is a plain function. The 'worklet' line lets Reanimated run it on the UI thread; Node and browsers ignore it.
export const D = Math.PI / 180;
export function clamp(v        , a        , b        )         { 'worklet'; return Math.max(a, Math.min(b, v)); }
export function seg(t        , a        , b        )         { 'worklet'; return clamp((t - a) / (b - a), 0, 1); }
export function outBack(x        , c        )         { 'worklet'; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
export function inC(x        )         { 'worklet'; return x * x * x; }
export function io(x        )         { 'worklet'; return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
export function bump(x        )         { 'worklet'; return Math.sin(Math.PI * x); }
/** hands-rig.js up2: starts from rest, small overshoot, soft exit. */
export function up2(ms        , T        , i        , o        )         { 'worklet'; return ms < T - o ? outBack(Math.pow(seg(ms, 0, i), 1.6), 1.5) : 1 - io(seg(ms, T - o, T)); }
/** pm.js sm (smoothstep). */
export function smooth(x        )         { 'worklet'; x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
/** fx.js E.inout. */
export function inOutCubic(t        )         { 'worklet'; return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
/** live.js sio (face change). */
export function sio(t        )         { 'worklet'; return t <= 0 ? 0 : t >= 1 ? 1 : .5 - .5 * Math.cos(Math.PI * t); }
