/**
 * Pip on a stage with effects: a layer of particles behind him, Pip, and a layer in front.
 * The stage is bigger than Pip (effects fly around him and may leave the stage). Give it the effect that will play
 * (so its particles and sounds are ready before the moment), then call fire().
 * Reduced motion: no particles; the sound still plays (it is not motion) and Pip's own faces still change.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useFrameCallback, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { Pip } from "../Pip";
import type { PipHandle, PipProps } from "../Pip";
import { FxLayer } from "./FxLayer";
import { FX_SHAPES } from "./library";
import { playSfx, preloadSfx } from "./sfx";
import type { SfxName } from "./sfx";
import type { FxEffect } from "./types";

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
  /** The visible screen in window px (default: the whole window). The web preview page puts a phone screen inside the browser window. */
  screen?: { x: number; y: number; width: number; height: number };
}

export const PipStage = forwardRef<PipStageHandle, PipStageProps>(function PipStage({ stageW, stageH, pipTop, effect, sound = true, screen, ...pip }, ref) {
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
  return (
    // zIndex: the stage (and so its effects) floats above the screen's other content
    <View ref={root} onLayout={measure} style={{ width: stageW, height: stageH, zIndex: 50 }} pointerEvents="none">
      <View pointerEvents="none" style={fxBox}>
        <FxLayer effect={effect} layer="back" W={win.width} H={win.height} pipOrigin={origin} clock={clock} shapes={FX_SHAPES} />
      </View>
      <View style={{ position: "absolute", left: Math.round((stageW - pip.size) / 2), top }}>
        <Pip ref={pipRef} {...pip} scene={"scene" in pip ? pip.scene : effect?.scene ?? null} />
      </View>
      <View pointerEvents="none" style={fxBox}>
        <FxLayer effect={effect} layer="front" W={win.width} H={win.height} pipOrigin={origin} clock={clock} shapes={FX_SHAPES} />
      </View>
    </View>);
});
