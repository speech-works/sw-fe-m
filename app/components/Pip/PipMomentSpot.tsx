/**
 * Pip in his own spot ON a screen, playing one of the founder's final moments there (momentFx.ts; placement in
 * MOMENTS-PLACEMENT.md): the practice done page, Home's greeting, the welcome screen, the day that is not open yet, the error
 * sheet, a loading screen or an empty list. The screen stays as it is and stays usable (no dim).
 *
 * Pip stands on his blob (the kit cuts his body to the blob's curve: full collar, no bottom edge). The moment's props were
 * designed around him on a lab screen; PipStage fits them to where he really stands (fitFx). Leave room under him: most
 * props act below his feet (about 1.1 of his width down, see `PROP_ROOM`).
 *
 *   play         "mount": plays once when the screen opens (after `delay`); "manual": the screen calls play() itself.
 *   loop         plays again and again while it is shown (loading, an empty list). Sounds stop after `loopSound` loops.
 *   enter        he comes in first (PIP_IN), for a screen where he was not there before.
 * Reduced motion: no particles (PipStage), he is simply there; his faces still change, the sounds still play once.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { PIP_IN } from "./Pip";
import type { PipFace, PipVariant } from "./Pip";
import { PipStage } from "./fx/PipStage";
import type { PipStageHandle } from "./fx/PipStage";
import { MOMENT_SPOT, momentFx } from "./fx/momentFx";
import type { MomentFxId } from "./fx/momentFx";
import type { FxEffect } from "./fx/types";

/** How far below Pip's picture the props of a final reach, as a share of his width (the lab's stage: props to y ~ 700 of a
 *  Pip 240 wide whose picture ends at 458). A screen keeps this much free under him (or lets the props run over its content). */
export const PROP_ROOM = 1.1;
/** With no Pip drawn (figure false), the props of a stage moment fill this band under where he would stand: from PROPS_TOP
 *  to PROPS_TOP + PROPS_H of his width below his picture's top. A screen shows only that band (PropsOnly). */
export const PROPS_TOP = 1.08, PROPS_H = 0.85;

/** A moment's props with no Pip, in a box that holds just the props (loading, the notification ask). */
export function PropsOnly(props: Omit<PipMomentSpotProps, "figure"> & { spotRef?: React.Ref<PipMomentSpotHandle> }) {
  const { spotRef, size, ...rest } = props;
  return (
    <View pointerEvents="none" style={{ width: size, height: Math.round(size * PROPS_H) }}>
      <View style={{ position: "absolute", left: 0, top: -Math.round(size * PROPS_TOP) }}>
        <PipMomentSpot ref={spotRef} size={size} {...rest} figure={false} />
      </View>
    </View>);
}

export interface PipMomentSpotHandle {
  /** Play the moment (again). `variant`: momentFx's variant (waiting-empty: goldfish / snail; permission-ask: not-now). */
  play: (variant?: string) => Promise<void>;
}
export interface PipMomentSpotProps {
  moment: MomentFxId;
  /** His width in px. */
  size: number;
  variant?: string;
  play?: "mount" | "manual";
  /** ms after mount before a "mount" moment plays. */
  delay?: number;
  loop?: boolean;
  /** Loops that have sound (default 2: the sand timer's tick goes quiet on a long wait). */
  loopSound?: number;
  /** Loops before he stops and just idles (default: for ever while shown). */
  maxLoops?: number;
  enter?: boolean;
  /** false: Pip is not drawn, only the moment's props play (they still sit where they would around him). */
  figure?: boolean;
  blob?: boolean;
  face?: PipFace;
  pip?: PipVariant;
  sound?: boolean;
  onDone?: () => void;
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export const PipMomentSpot = forwardRef<PipMomentSpotHandle, PipMomentSpotProps>(function PipMomentSpot(
  { moment, size, variant, play = "mount", delay = 350, loop = false, loopSound = 2, maxLoops, enter = false, figure = true, blob = true, face, pip = "pip", sound = true, onDone }, ref) {
  const reduced = useReducedMotion();
  const stage = useRef<PipStageHandle>(null), alive = useRef(true), entered = useRef(!enter || !figure);
  const [effect, setEffect] = useState<FxEffect | null>(null);
  const [withSound, setWithSound] = useState(sound);
  const doneCb = useRef(onDone); doneCb.current = onDone;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const run = useCallback(async (v?: string) => {
    const fx = await momentFx(moment, v ?? variant);
    if (!alive.current) return;
    setEffect(fx);
    await wait(80);                                                      // the stage has the effect (its particles made)
    if (!alive.current) return;
    if (!entered.current) { entered.current = true; await stage.current?.pip?.body(PIP_IN); }
    let n = 0;
    do {
      if (!alive.current) return;
      if (loop && n >= loopSound) setWithSound(false);
      await stage.current?.fire();
      n++;
    } while (loop && !reduced && alive.current && (maxLoops == null || n < maxLoops));
    if (alive.current) doneCb.current?.();
  }, [moment, variant, loop, loopSound, maxLoops, reduced]);
  useImperativeHandle(ref, () => ({ play: run }), [run]);
  const runNow = useRef(run); runNow.current = run;
  useEffect(() => {
    if (play !== "mount") return;
    const h = setTimeout(() => { void runNow.current(); }, delay);
    return () => clearTimeout(h);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const h = Math.round(size * 322 / 372);
  return (
    <View pointerEvents="none" style={{ width: size, height: h }}>
      <PipStage ref={stage} stageW={size} stageH={h} pipTop={0} size={size} variant={pip} blob={blob && figure} face={face} startHidden={enter && figure} hideFigure={!figure}
        effect={effect} sound={withSound} design={MOMENT_SPOT[moment]} />
    </View>);
});
