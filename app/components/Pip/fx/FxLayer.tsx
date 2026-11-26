/**
 * The effects engine: one layer of particles (behind or in front of Pip) for one effect.
 * - Every particle is a native view with a small SVG painted ONCE; the graphics chip moves it (transform + opacity only).
 * - All particles read ONE shared clock (ms since the effect started, -1 = idle) on the UI thread. No React render per frame.
 * - Particles are made up front (seeded, so an effect looks the same each time) and stay mounted, invisible, until fired:
 *   mounting 100 views at the moment of a celebration would stutter.
 */
import React, { memo, useMemo } from "react";
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import type { FxEffect, FxEmitter, FxShape } from "./types";

const KIND = { burst: 0, rain: 1, rise: 2, twinkle: 3, flicker: 4, rays: 5, ring: 6, pop: 7, arc: 3 } as const;   // arc moves like twinkle, placed along its arc

type Part = {
  k: number; t0: number; life: number; x0: number; y0: number; vx: number; vy: number; g: number; drag: number;
  size: number; rot0: number; spin: number; wob: number; sway: number; hz: number; ph: number; flip: number; fi: number; fo: number; op: number;
  shape: string; c1: string; c2: string;
};

/** A small seeded random (mulberry32), so an effect looks the same each time it plays. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Turn the effect's emitters for this layer into particles (JS thread, once). W/H = stage px; origin = Pip's centre (fractions). */
export function makeParticles(effect: FxEffect, layer: "back" | "front", W: number, H: number, pipOrigin: [number, number]): Part[] {
  const out: Part[] = [];
  effect.emitters.forEach((e: FxEmitter, ei) => {
    if ((e.layer ?? "front") !== layer) return;
    const r = rng(hash(effect.id + ":" + ei));
    const R = (v: [number, number] | undefined, d: [number, number]) => { const q = v ?? d; return q[0] + (q[1] - q[0]) * r(); };
    const k = KIND[e.kind];
    const single = e.kind === "rays" || e.kind === "ring" || e.kind === "pop";
    const n = e.count ?? (single ? 1 : 20);
    const o = e.origin ?? pipOrigin, area = e.area ?? [0, 0, 1, 1];
    const colors = e.colors && e.colors.length ? e.colors : ["#F76117"];
    for (let i = 0; i < n; i++) {
      const ci = Math.floor(r() * colors.length);
      const life0 = R(e.life, single ? [1600, 1600] : [900, 1500]);
      const t0 = (e.at ?? 0) + (e.stagger ? (e.kind === "arc" ? (n > 1 ? i / (n - 1) : 0) : r()) * e.stagger : 0);
      // every particle has faded out before the effect ends: nothing is left on screen, nothing is cut off mid-air
      const life = Math.min(life0, effect.ms - 40 - t0);
      if (life < 120) continue;
      const speed = R(e.speed, [0.6, 1.2]);
      let x0 = o[0], y0 = o[1], vx = 0, vy = 0;
      if (e.kind === "burst") {
        const ang = (R(e.spread, [-160, -20]) * Math.PI) / 180;
        vx = (speed * Math.cos(ang) * H) / W; vy = speed * Math.sin(ang);
      } else if (e.kind === "rain") { x0 = area[0] + (area[2] - area[0]) * r(); y0 = area[1]; vy = speed; }
      else if (e.kind === "rise") { x0 = area[0] + (area[2] - area[0]) * r(); y0 = area[3]; vy = speed; }
      else if (e.kind === "arc" || (e.kind === "pop" && e.arc)) {   // a pop with an arc sits at that angle and radius from Pip
        const a0 = e.arc ? e.arc[0] : 180, a1 = e.arc ? e.arc[1] : 360, th = ((a0 + (a1 - a0) * (n > 1 ? i / (n - 1) : 0.5)) * Math.PI) / 180, rad = R(e.radius, [0.35, 0.4]);
        x0 = o[0] + rad * Math.cos(th); y0 = o[1] + (rad * Math.sin(th) * W) / H; }
      else if (e.kind === "twinkle") { x0 = area[0] + (area[2] - area[0]) * r(); y0 = area[1] + (area[3] - area[1]) * r(); }
      else if (e.kind === "pop" && e.area) { x0 = area[0] + (area[2] - area[0]) * r(); y0 = area[1] + (area[3] - area[1]) * r(); }
      else if (e.kind === "flicker") { x0 = area[0] + (area[2] - area[0]) * (n > 1 ? i / (n - 1) : 0.5); y0 = area[1] + (area[3] - area[1]) * r(); }
      if ((e.kind === "twinkle" || e.kind === "arc") && e.speed) vy = -R(e.speed, [0, 0]);   // twinkle / arc may float up
      out.push({
        k, t0, life, x0, y0, vx, vy, g: e.gravity ?? 0, drag: e.drag ?? 0,
        size: R(e.size, single ? [0.5, 0.5] : [0.03, 0.05]) * W,
        rot0: e.tilt ? R(e.tilt, [0, 0]) : single || e.upright ? 0 : r() * 360, spin: e.upright ? 0 : R(e.spin, [0, 0]) * (r() < 0.5 && !single ? -1 : 1), wob: e.upright ? 8 : 0,
        sway: (e.sway ?? 0) * (0.6 + 0.8 * r()), hz: (e.swayHz ?? 0.6) * (0.7 + 0.6 * r()), ph: r() * Math.PI * 2,
        flip: e.flip ? 1 : 0, fi: Math.min(e.fadeIn ?? 120, life * 0.3), fo: Math.min(e.fadeOut ?? 300, life * 0.5), op: e.opacity ?? 1,
        shape: e.shapes[Math.floor(r() * e.shapes.length)], c1: colors[ci], c2: colors[(ci + 1) % colors.length],
      });
    }
  });
  return out;
}

const Particle = memo(function Particle({ p, clock, W, H, shape }: { p: Part; clock: SharedValue<number>; W: number; H: number; shape: FxShape | undefined }) {
  const st = useAnimatedStyle(() => {
    const t = clock.value, a = t - p.t0;
    if (t < 0 || a < 0 || a > p.life) return { opacity: 0, transform: [{ translateX: -10000 }] };
    const s = a / 1000;
    let x = p.x0, y = p.y0, rot = p.rot0, sc = 1, op = p.op, sy = 1;
    if (p.k === 0) {                       // burst
      const e = p.drag > 0 ? (1 - Math.exp(-p.drag * s)) / p.drag : s;
      x += p.vx * e; y += p.vy * e + 0.5 * p.g * s * s; rot += p.spin * s;
    } else if (p.k === 1 || p.k === 2) {   // rain / rise
      y += (p.k === 1 ? 1 : -1) * p.vy * s + 0.5 * p.g * s * s; x += p.sway * Math.sin(2 * Math.PI * p.hz * s + p.ph); rot += p.spin * s;
    } else if (p.k === 3) {                // twinkle
      sc = Math.pow(Math.sin((Math.PI * a) / p.life), 0.7); rot += p.spin * s;
      x += p.sway * Math.sin(2 * Math.PI * p.hz * s + p.ph); y += p.vy * s;   // twinkle / arc may drift (sway) and float (speed, up if negative)
    } else if (p.k === 4) {                // flicker
      sy = 1 + 0.14 * Math.sin(2 * Math.PI * 7.3 * s + p.ph) + 0.08 * Math.sin(2 * Math.PI * 11.7 * s + 2 * p.ph);
      sc = 1 + 0.05 * Math.sin(2 * Math.PI * 5.1 * s + p.ph); op *= 0.85 + 0.15 * Math.sin(2 * Math.PI * 9.3 * s + p.ph);
    } else if (p.k === 5) {                // rays
      rot += p.spin * s;
    } else if (p.k === 6) {                // ring
      const u = a / p.life; sc = 0.15 + 0.85 * (1 - (1 - u) * (1 - u)); op *= 1 - u;
    } else {                               // pop: spring in (300 ms), bob, pop out (220 ms)
      const inT = 300, outT = 220;
      if (a < inT) { const u = a / inT, c = 1.70158 * 1.4; sc = 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
      else if (a > p.life - outT) { const u = (a - (p.life - outT)) / outT; sc = 1 + 0.15 * u; op *= 1 - u; }
      else { sc = 1 + 0.025 * Math.sin(2 * Math.PI * 1.1 * s); y += 0.006 * Math.sin(2 * Math.PI * 0.8 * s); }
    }
    if (p.k !== 7 && p.k !== 6) { op *= Math.min(1, a / Math.max(1, p.fi)) * Math.min(1, (p.life - a) / Math.max(1, p.fo)); }
    if (p.flip) sy *= Math.cos(2 * Math.PI * 1.7 * s + p.ph);
    if (p.wob) rot += p.wob * Math.sin(2 * Math.PI * 0.9 * s + p.ph);
    return { opacity: op, transform: [{ translateX: x * W - p.size / 2 }, { translateY: y * H - p.size / 2 }, { rotate: rot + "deg" }, { scale: sc }, { scaleY: sy }] };
  });
  if (!shape) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.part, { width: p.size, height: p.size, opacity: 0, transform: [{ translateX: -10000 }] }, st]}>
      <Svg width={p.size} height={p.size} viewBox="0 0 100 100">
        {shape.paths.map((q, i) => {
          const col = (v?: string) => (v === "$c" ? p.c1 : v === "$c2" ? p.c2 : v);
          return <Path key={i} d={q.d} fill={col(q.fill) ?? "none"} stroke={col(q.stroke)} strokeWidth={q.sw} opacity={q.opacity} strokeLinecap="round" strokeLinejoin="round" />;
        })}
      </Svg>
    </Animated.View>);
});

/** One layer (back or front) of one effect. `clock` = ms since the effect fired, -1 when idle. */
export const FxLayer = memo(function FxLayer({ effect, layer, W, H, pipOrigin, clock, shapes }: {
  effect: FxEffect | null; layer: "back" | "front"; W: number; H: number; pipOrigin: [number, number]; clock: SharedValue<number>; shapes: Record<string, FxShape>;
}) {
  const parts = useMemo(() => (effect ? makeParticles(effect, layer, W, H, pipOrigin) : []), [effect, layer, W, H, pipOrigin]);
  return <>{parts.map((p, i) => <Particle key={i} p={p} clock={clock} W={W} H={H} shape={shapes[p.shape]} />)}</>;
});

const styles = StyleSheet.create({ part: { position: "absolute", left: 0, top: 0 } });
