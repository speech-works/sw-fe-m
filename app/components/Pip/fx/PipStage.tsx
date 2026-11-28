/**
 * Pip on a stage with effects: a layer of particles behind him, Pip, and a layer in front.
 * The stage is bigger than Pip (effects fly around him and may leave the stage). Give it the effect that will play
 * (so its particles and sounds are ready before the moment), then call fire().
 * Reduced motion: no particles; the sound still plays (it is not motion) and Pip's own faces still change.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Pip } from "../Pip";
import type { PipHandle, PipProps } from "../Pip";
import { FxLayer } from "./FxLayer";
import { FX_SHAPES } from "./library";
import { playSfx, preloadSfx } from "./sfx";
import type { SfxName } from "./sfx";
import type { FxEffect } from "./types";
import { fitFx } from "./fitFx";
import { useFxFront } from "./FxPortal";
import type { FxSpot } from "./fitFx";

export interface PipStageHandle {
  /** Pip himself (play, face, body, perform). */
  pip: PipHandle | null;
  /** Play the stage's effect from the start (particles, sounds and Pip's own beats). Resolves when it has finished. */
  fire: () => Promise<void>;
}
export interface PipStageProps extends PipProps {
  /** Stage size in px. Pip (size = his width) sits centred horizontally, his top at `pipTop`. */
  stageW: number;
  stageH: number;
  pipTop?: number;
  /** The effect this stage will fire (null = none). */
  effect: FxEffect | null;
  /** false = particles only, no sounds. */
  sound?: boolean;
  /** Peeking (PipPeek): Pip's figure is cut off below this line (px from the stage top), so while he slides behind a button
   *  or sheet he can never show below it. Only the figure is cut: the effect's particles stay free. */
  figureClip?: number;
  /** Peeking: moves Pip's figure down (px) inside the stage, under `figureClip`. */
  figureY?: SharedValue<number>;
  /** The visible screen in window px (default: the whole window). The web preview page puts a phone screen inside the browser window. */
  screen?: { x: number; y: number; width: number; height: number };
  /** The background effects (layer "back") end at this line, px from the screen's top: on a screen with a bottom sheet, the
   *  hero behind Pip changes (night, heat, rays) and the sheet stays as it is. */
  backClip?: number;
  /** true: the front layer ends at `backClip` too (a moment that stays in the orange zone, e.g. "further than ever"). */
  clipFront?: boolean;
  /** Where the effect was designed (its lab screen, momentFx.ts MOMENT_SPOT): its props are moved to where Pip really stands
   *  (fitFx.ts). None: the effect plays as written. */
  design?: FxSpot;
}

export const PipStage = forwardRef<PipStageHandle, PipStageProps>(function PipStage({ stageW, stageH, pipTop, effect: given, sound = true, screen, figureClip, figureY, backClip, clipFront, design, ...pip }, ref) {
  const reduced = useReducedMotion();
  const pipRef = useRef<PipHandle>(null);
  const clock = useSharedValue(-1), t0 = useSharedValue(-1), endMs = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const pipH = Math.round(pip.size * 322 / 372), top = pipTop ?? Math.round((stageH - pipH) / 2);
  // Effects are UNBOUNDED: their layers cover the whole window (not the stage), so confetti can fall from the top of the screen
  // past the bottom. Units for effects are fractions of the WINDOW. The stage's place in the window is measured after layout.
  const wd = useWindowDimensions(), win = screen ?? { x: 0, y: 0, width: wd.width, height: wd.height }, root = useRef<View>(null), [off, setOff] = useState<[number, number]>([0, 0]);
  const measure = useCallback(() => { root.current?.measureInWindow((x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) setOff(o => (o[0] === x && o[1] === y ? o : [x, y])); }); }, []);
  const origin = useMemo<[number, number]>(() => [(off[0] - win.x + stageW / 2) / win.width, (off[1] - win.y + top + pipH * 0.42) / win.height], [off, stageW, top, pipH, win.x, win.y, win.width, win.height]);
  // the effect fitted to Pip's real place (his centre in the screen and his width), once his place is measured
  const effect = useMemo(() => (given && design ? fitFx(given, design, { cx: origin[0] * win.width, cy: origin[1] * win.height, size: pip.size, W: win.width, H: win.height }) : given),
    [given, design, origin, pip.size, win.width, win.height]);
  // a screen with a sheet over Pip draws the front layer above its sheet (FxPortal): hand it over
  const front = useFxFront(), frontKey = useRef(`fx${Math.random().toString(36).slice(2)}`).current;
  const frontClipped = clipFront && backClip != null;
  useEffect(() => {
    if (!front) return;
    front.set(frontKey, (
      <View pointerEvents="none" style={{ position: "absolute", left: win.x, top: win.y, width: win.width, height: frontClipped ? Math.max(0, backClip ?? 0) : win.height, overflow: frontClipped ? "hidden" : "visible" }}>
        <FxLayer effect={effect} layer="front" W={win.width} H={win.height} pipOrigin={origin} clock={clock} shapes={FX_SHAPES} />
      </View>));
  }, [front, frontKey, effect, origin, clock, win.x, win.y, win.width, win.height, frontClipped, backClip]);
  useEffect(() => () => front?.set(frontKey, null), [front, frontKey]);
  const fxBox = { position: "absolute" as const, left: win.x - off[0], top: win.y - off[1], width: win.width, height: win.height };
  // run = 1 while an effect plays. Once it ends the clock stays at -1: a frame that still runs after the end must not
  // start the effect again (that left every particle frozen near its start point)
  const run = useSharedValue(0);
  const frame = useFrameCallback(info => {
    if (run.value !== 1) return;
    if (t0.value < 0) t0.value = info.timestamp;
    const t = info.timestamp - t0.value;
    if (t > endMs.value) { run.value = 0; clock.value = -1; t0.value = -1; } else clock.value = t;
  }, false);
  useEffect(() => { if (effect && sound) preloadSfx((effect.sounds ?? []).map(s => s.name as SfxName)); }, [effect, sound]);
  const fire = useCallback(() => new Promise<void>(res => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (!effect) { res(); return; }
    measure();
    if (sound) for (const s of effect.sounds ?? []) timers.current.push(setTimeout(() => playSfx(s.name, s.volume ?? 0.8), s.at));
    if (effect.pip && pipRef.current) pipRef.current.perform(effect.pip);
    if (!reduced) { endMs.value = effect.ms; t0.value = -1; clock.value = 0; run.value = 1; frame.setActive(true); }
    timers.current.push(setTimeout(() => { run.value = 0; clock.value = -1; frame.setActive(false); res(); }, effect.ms + 50));
  }), [effect, sound, reduced, frame, clock, t0, endMs, run, measure]);
  useImperativeHandle(ref, () => ({ get pip() { return pipRef.current; }, fire }), [fire]);
  const noShift = useSharedValue(0), shift = figureY ?? noShift;
  const figSt = useAnimatedStyle(() => ({ transform: [{ translateY: shift.value }] }));
  const figure = (
    <Animated.View style={[{ position: "absolute", left: Math.round((stageW - pip.size) / 2), top }, figSt]}>
      <Pip ref={pipRef} {...pip} scene={"scene" in pip ? pip.scene : effect?.scene ?? null} />
    </Animated.View>);
  return (
    // zIndex: the stage (and so its effects) floats above the screen's other content
    <View ref={root} onLayout={measure} style={{ width: stageW, height: stageH, zIndex: 50 }} pointerEvents="none">
      <View pointerEvents="none" style={[fxBox, backClip != null && { height: Math.max(0, backClip), overflow: "hidden" as const }]}>
        <FxLayer effect={effect} layer="back" W={win.width} H={win.height} pipOrigin={origin} clock={clock} shapes={FX_SHAPES} />
      </View>
      {figureClip == null ? figure : (
        // the cut box reaches far above and to the sides (raised hands, a hop), and ends exactly at figureClip
        <View pointerEvents="none" style={{ position: "absolute", left: -pip.size, top: -pip.size, width: stageW + 2 * pip.size, height: figureClip + pip.size, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: pip.size, top: pip.size }}>{figure}</View>
        </View>)}
      {front ? null : (
        <View pointerEvents="none" style={[fxBox, frontClipped && { height: Math.max(0, backClip ?? 0), overflow: "hidden" as const }]}>
          <FxLayer effect={effect} layer="front" W={win.width} H={win.height} pipOrigin={origin} clock={clock} shapes={FX_SHAPES} />
        </View>)}
    </View>);
});
