/**
 * Pip standing behind an edge (a sheet's top edge) and STAYING there: PipPeek's sibling for screens where he is part of the
 * page (the program's day-done screen). The screen tells him what to do:
 *   rise()   he slides up from behind the edge (cut at the edge all the way), then the stage's effect plays (its particles,
 *            sounds and his own beats)
 *   react()  the quiet acknowledgement: a listening face, a nod, then a warm face. The same for every answer (app rule: an
 *            answer about a goal is never rewarded or marked)
 *   leave()  his real wave (h-wave), then he slides down behind the edge
 * Between calls he only does his own idle (blinks and glances from the face system). Nothing loops.
 *
 * Same hiding rules as PipPeek: no blob, no jelly; only his figure slides (figureY) and it is cut at the edge (figureClip),
 * so nothing of him ever shows below the edge, also mid-slide; `hide` of his height stays behind the edge so the bottom of
 * his body is never seen and his full collar is always above it.
 * Put this component with its BOTTOM `overlap` below the edge (it does that itself with a negative bottom margin).
 * Reduced motion: he is simply there (no slide, no particles, no wave); his faces still change.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { Easing, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import type { PipBeat, PipFace, PipHandle, PipVariant } from "./Pip";
import { PipStage } from "./fx/PipStage";
import type { PipStageHandle } from "./fx/PipStage";
import { playSfx } from "./fx/sfx";
import type { FxEffect } from "./fx/types";
import type { FxSpot } from "./fx/fitFx";

/** The share of his height that stays behind the edge (as PipPeek). */
export const PIP_EDGE_HIDE = 0.14;

/** His box for a width: the height, and how much of it sits behind the edge. */
export function pipEdgeBox(size: number, hide = PIP_EDGE_HIDE) {
  const h = Math.round(size * 322 / 372);
  return { h, overlap: Math.round(h * hide), visible: h - Math.round(h * hide) };
}

/** The acknowledgement (reduced motion: the two faces only). */
const ACK: PipBeat[] = [{ at: 0, face: "listening" }, { at: 180, body: "nod" }, { at: 760, face: "warm" }];
/** How long the wave shows before he starts to go down (the whole move is 4 s: too long to hold a "Back to home" tap). */
const WAVE_MS = 2100;

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export interface PipOnEdgeHandle {
  /** Slide up from behind the edge, then fire the effect. Resolves when the effect has finished.
   *  `quiet`: no pop sound (he comes back up after down(), the day screen's frame). */
  rise: (opts?: { quiet?: boolean }) => Promise<void>;
  /** The acknowledgement (see above). */
  react: () => Promise<void>;
  /** Wave, then slide down behind the edge. Resolves when he is hidden. */
  leave: () => Promise<void>;
  /** Slide down behind the edge with no wave (he steps aside: another Pip takes the moment, or the step changes).
   *  Resolves when he is hidden. Reduced motion: he is hidden at once. */
  down: () => Promise<void>;
  /** Play a moment's effect where he stands (he is up): its props, background, sounds and his acting. `design`: where the
   *  effect was designed (momentFx MOMENT_SPOT), so its props are fitted to him. Resolves when it has finished. */
  play: (effect: FxEffect, design?: FxSpot, opts?: { clipFront?: boolean }) => Promise<void>;
  /** Pip himself, for a face between the calls. */
  pip: PipHandle | null;
}
export interface PipOnEdgeProps {
  /** His width in px (the height follows: pipEdgeBox). */
  size: number;
  hide?: number;
  /** The effect rise() fires (null = he only comes up). */
  effect?: FxEffect | null;
  sound?: boolean;
  variant?: PipVariant;
  /** true = he is up from the start (no rise needed). */
  startUp?: boolean;
  /** The face he comes up with (default calm). */
  face?: PipFace;
  /** Web preview only: the phone screen inside the browser window. */
  screen?: { x: number; y: number; width: number; height: number };
  /** How far below the edge line the hiding thing is solid everywhere Pip can reach (a sheet's top corner radius + 2).
   *  He is cut there, not on the edge line: where a rounded corner curves away below the line, his sleeve runs on behind
   *  the curve instead of ending in a flat cut over an orange gap (founder, 2026-11-26: "there should be no gap"). */
  clipBelow?: number;
  /** The effects' background layer ends at this line (px from the screen's top): the orange zone above a sheet. */
  backClip?: number;
  /** Where `effect` was designed (fitFx). */
  design?: FxSpot;
}

export const PipOnEdge = forwardRef<PipOnEdgeHandle, PipOnEdgeProps>(function PipOnEdge({ size, hide = PIP_EDGE_HIDE, effect = null, sound = true, variant, startUp = false, face, screen, clipBelow = 0, backClip, design }, ref) {
  const reduced = useReducedMotion();
  const stage = useRef<PipStageHandle>(null), alive = useRef(true);
  const { h, overlap } = pipEdgeBox(size, hide);
  // slide: h = fully behind the edge, 0 = up (his bottom still `overlap` behind it)
  // fully hidden = his top below the cut line (h + clipBelow), so nothing shows in a corner's gap while he is down
  const down = h + clipBelow;
  const y = useSharedValue(startUp || reduced ? 0 : down);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // a moment played with play(): it replaces `effect` until the next play
  const [played, setPlayed] = useState<{ effect: FxEffect; design?: FxSpot; clipFront?: boolean } | null>(null);
  const fx = played?.effect ?? effect, fxDesign = played ? played.design : design;
  useImperativeHandle(ref, () => ({
    get pip() { return stage.current?.pip ?? null; },
    rise: async (opts) => {
      if (reduced) y.value = 0;
      else {
        y.value = withTiming(0, { duration: 460, easing: Easing.out(Easing.back(0.8)) /* a small overshoot, well inside `overlap` */ });
        if (sound && !opts?.quiet) void playSfx("pop", 0.5);
        await wait(380);
      }
      if (!alive.current) return;
      await stage.current?.fire();
    },
    react: async () => { await stage.current?.pip?.perform(ACK); },
    play: async (e, d, opts) => {
      setPlayed({ effect: e, design: d, clipFront: opts?.clipFront });
      await wait(80);                                                   // the stage has the new effect (its particles made)
      if (!alive.current) return;
      await stage.current?.fire();
    },
    leave: async () => {
      const pip = stage.current?.pip;
      if (reduced || !pip) { pip?.face("warm"); return; }
      void pip.play("h-wave");
      await wait(WAVE_MS);
      if (!alive.current) return;
      y.value = withTiming(down, { duration: 340, easing: Easing.in(Easing.cubic) });
      await wait(360);
    },
    down: async () => {
      if (reduced) { y.value = down; return; }
      y.value = withTiming(down, { duration: 300, easing: Easing.in(Easing.cubic) });
      await wait(320);
    },
  }), [reduced, sound, down, y]);
  return (
    // the negative margin hangs his lower part below the edge, behind the sheet
    <View pointerEvents="none" style={{ marginBottom: -overlap }}>
      <PipStage ref={stage} blob={false} labNoCut jelly={false} variant={variant} stageW={size} stageH={h} pipTop={0} effect={fx} sound={sound} size={size} face={face}
        screen={screen} figureY={y} figureClip={h - overlap + clipBelow} backClip={backClip} clipFront={played?.clipFront} design={fxDesign} />
    </View>);
});
