/**
 * A small Pip that peeks out from behind something (the quiz answer sheet's top edge) for one moment: he slides up from
 * behind the edge, plays the moment's effect or beats, and slides back down (or, with `stay`, stays on the edge while the
 * sheet is up: the quiz answer sheet). No text (the sheet says it). The quiz never waits for him.
 * No blob (founder, 2026-11-26): the edge hides his lower part, which is all the blob is for. The bottom of his picture
 * always stays behind the edge (PEEK_HIDE of his height, more than any of his quiz moves travel), and his full collar
 * always shows above it. No jelly (it would move his bottom).
 * Reduced motion: no particles (PipStage); he is simply there, his faces still change.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { Easing, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { PipStage } from "./fx/PipStage";
import type { PipStageHandle } from "./fx/PipStage";
import { FX_EFFECTS } from "./fx/library";
import { playSfx } from "./fx/sfx";
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
export function pipPeekSize(screenW: number, space = Infinity, big = false, max = Infinity, hide = PEEK_HIDE) {
  const fitH = (space - PEEK_HEADROOM) / (1 - hide);
  const size = Math.round(Math.min(screenW * (big ? 0.56 : 0.4), big ? 240 : 170, max, fitH * 372 / 322));
  if (!(size >= PEEK_MIN)) return null;
  const h = Math.round(size * 322 / 372);
  return { size, h, overlap: Math.round(h * hide) };
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** `hideBelow`: how far the thing he hides behind reaches below its top edge (a button's height). He is cut off there, so
 *  he never shows under it while sliding in or out. Default: a sheet (it reaches the bottom of the screen). */
/** `big`: a hero peek (a page's pocket). `extraHide`: more of him tucked behind the edge, for a curved edge that sits lower at
 *  his sides than in the middle. */
/** `max`: his width is never more than this (the quiz answer sheet: mock 03). `stay`: he does not slide back down after
 *  the moment; he stays on the edge (his own blinks and glances) until what he hides behind goes away.
 *  `hide`: the share of his height behind the edge (default PEEK_HIDE). Behind a sheet it can be small (zoneSheet's
 *  PIP_HIDE): his jacket is drawn on below his picture, so the edge still cuts through the jacket and the whole collar
 *  and tie are above it. */
export function PipPeek({ moment, sound = true, space, hideBelow, big, extraHide = 0, max, stay = false, hide }: { moment: PipMomentId; sound?: boolean; space?: number; hideBelow?: number; big?: boolean; extraHide?: number; max?: number; stay?: boolean; hide?: number }) {
  const { width } = useWindowDimensions();
  const fit = pipPeekSize(width, space, big, max, hide);
  return fit ? <Peek moment={moment} sound={sound} hideBelow={hideBelow} stay={stay} {...fit} overlap={fit.overlap + extraHide} /> : null;
}

function Peek({ moment, sound, size, h, overlap, hideBelow, stay }: { moment: PipMomentId; sound: boolean; size: number; h: number; overlap: number; hideBelow?: number; stay: boolean }) {
  const reduced = useReducedMotion();
  const stage = useRef<PipStageHandle>(null), alive = useRef(true);
  const def = pipMoment(moment);
  // a moment with an effect AND beats of its own: the effect's particles and sounds, Pip acts the moment's beats
  const effect = useMemo(() => {
    const fx = def.effect ? FX_EFFECTS.find(e => e.id === def.effect) ?? null : null;
    return fx && def.beats ? { ...fx, pip: def.beats } : fx;
  }, [def]);
  // slide: h = fully behind the edge, 0 = up (his bottom still PEEK_HIDE behind it)
  const y = useSharedValue(reduced ? 0 : h);
  useEffect(() => {
    alive.current = true;
    (async () => {
      await wait(120);                                                  // the sheet starts rising first
      if (!alive.current) return;
      y.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.back(0.8)) /* a small overshoot, well inside PEEK_HIDE */ });
      // a soft pop as he comes up, on every peek: "Not this one" has no effect of its own, so without it he arrived in
      // silence (founder, 2026-11-26)
      if (sound) void playSfx("pop", 0.5);
      await wait(400);
      if (!alive.current) return;
      if (effect) await stage.current?.fire();
      else if (def.beats) await stage.current?.pip?.perform(def.beats);
      if (!alive.current || reduced || stay) return;
      y.value = withTiming(h, { duration: 300, easing: Easing.in(Easing.cubic) });
    })();
    return () => { alive.current = false; };
  }, [effect, def.beats, h, reduced, stay, y]);
  return (
    // the negative margin hangs his lower PEEK_HIDE below the edge, behind the card
    <View style={{ marginBottom: -overlap }}>
      {/* only his figure slides (figureY) and is cut at the bottom of what hides him (figureClip); the stars stay free */}
      <PipStage ref={stage} blob={false} labNoCut jelly={false} stageW={size + 40} stageH={h} pipTop={0} effect={effect} sound={sound} size={size} face={def.face}
        figureY={y} figureClip={h - overlap + (hideBelow ?? h * 3)} />
    </View>);
}
