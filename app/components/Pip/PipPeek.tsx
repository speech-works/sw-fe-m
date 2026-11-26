/**
 * A small Pip that peeks out from behind something (the quiz answer sheet's top edge) for one moment: he slides up from
 * behind the edge, plays the moment's effect or beats, and slides back down. No text (the sheet says it). The quiz never
 * waits for him.
 * No blob (founder, 2026-11-26): the edge hides his lower part, which is all the blob is for. The bottom of his picture
 * always stays behind the edge (PEEK_HIDE of his height, more than any of his quiz moves travel), and his full collar
 * always shows above it. No jelly (it would move his bottom).
 * Reduced motion: no particles (PipStage); he is simply there, his faces still change.
 */
import React, { useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { PipStage } from "./fx/PipStage";
import type { PipStageHandle } from "./fx/PipStage";
import { FX_EFFECTS } from "./fx/library";
import { pipMoment } from "./pipMoments";
import type { PipMomentId } from "./pipMoments";

/** The share of his height that always stays behind the edge. */
const PEEK_HIDE = 0.14;

/** Below this width he would read as a speck: he steps aside instead. */
const PEEK_MIN = 90;
/** Room kept free between his head and the status bar. */
const PEEK_HEADROOM = 16;

/** Pip's width for a peek, his height and how much of it hides behind the edge. `space` = the free height above the edge
 *  (from the sheet): he shrinks to fit it, so a tall sheet never pushes him under the status bar; null = no room, no Pip. */
export function pipPeekSize(screenW: number, space = Infinity) {
  const fitH = (space - PEEK_HEADROOM) / (1 - PEEK_HIDE);
  const size = Math.round(Math.min(screenW * 0.4, 170, fitH * 372 / 322));
  if (!(size >= PEEK_MIN)) return null;
  const h = Math.round(size * 322 / 372);
  return { size, h, overlap: Math.round(h * PEEK_HIDE) };
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function PipPeek({ moment, sound = true, space }: { moment: PipMomentId; sound?: boolean; space?: number }) {
  const { width } = useWindowDimensions();
  const fit = pipPeekSize(width, space);
  return fit ? <Peek moment={moment} sound={sound} {...fit} /> : null;
}

function Peek({ moment, sound, size, h, overlap }: { moment: PipMomentId; sound: boolean; size: number; h: number; overlap: number }) {
  const reduced = useReducedMotion();
  const stage = useRef<PipStageHandle>(null), alive = useRef(true);
  const def = pipMoment(moment);
  const effect = def.effect ? FX_EFFECTS.find(e => e.id === def.effect) ?? null : null;
  // slide: h = fully behind the edge, 0 = up (his bottom still PEEK_HIDE behind it)
  const y = useSharedValue(reduced ? 0 : h);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  useEffect(() => {
    alive.current = true;
    (async () => {
      await wait(120);                                                  // the sheet starts rising first
      if (!alive.current) return;
      y.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.back(0.8)) /* a small overshoot, well inside PEEK_HIDE */ });
      await wait(400);
      if (!alive.current) return;
      if (effect) await stage.current?.fire();
      else if (def.beats) await stage.current?.pip?.perform(def.beats);
      if (!alive.current || reduced) return;
      y.value = withTiming(h, { duration: 300, easing: Easing.in(Easing.cubic) });
    })();
    return () => { alive.current = false; };
  }, [effect, def.beats, h, reduced, y]);
  return (
    // the negative margin hangs his lower PEEK_HIDE below the edge, behind the card
    <Animated.View style={[{ marginBottom: -overlap }, st]}>
      <PipStage ref={stage} blob={false} labNoCut jelly={false} stageW={size + 40} stageH={h} pipTop={0} effect={effect} sound={sound} size={size} />
    </Animated.View>);
}
