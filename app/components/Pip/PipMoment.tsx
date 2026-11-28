/**
 * One Pip moment over the screen (pipMoments.ts): Pip comes in, his effect (or his own beats), the moment's text, he leaves.
 *
 * backdrop "dim": a dark scrim fades over the screen; Pip and the text sit in the middle; a tap ends it early.
 * backdrop "none": the screen stays as it is and stays usable. A final moment's words are laid out as on the dimmed moments
 * (no box: founder 2026-11-28, P15/P17/P20), with a soft shadow in the canvas colour so they stay readable over the screen.
 * An older moment (avatar saved) keeps its soft card.
 * A final moment (momentFx.ts) was designed with Pip on his blob at the lab's stage spot (x 75, y 250, 240 wide on 390 x 844)
 * and its props acting UNDER him: he stands at that spot as a share of the screen, and the words go ABOVE him, so nothing
 * covers the props or him. A moment whose props act above his head and none under him (level up's bonus block) has its
 * words UNDER him instead (wordsBelow). An older moment (avatar saved) keeps its layout: the figure, the words under it.
 * The text always fits: centred, at most 340 wide, inside the safe area, wrapping onto more lines rather than running off an edge.
 * Reduced motion: no particles (PipStage), Pip's faces still change, the text still shows.
 */
import React, { useCallback, useContext, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { typography } from "../../design-system/primitives/typography";
import { PIP_IN, PIP_OUT } from "./Pip";
import type { PipVariant } from "./Pip";
import { PipStage } from "./fx/PipStage";
import type { PipStageHandle } from "./fx/PipStage";
import { FX_EFFECTS } from "./fx/library";
import { LAB_SPOTS, momentFx, MOMENT_SPOT } from "./fx/momentFx";
import { DESIGN_H, DESIGN_W } from "./fx/fitFx";
import type { FxEffect } from "./fx/types";
import type { PipMomentDef } from "./pipMoments";
import type { AvatarManifest } from "../../types/avatar";
import { kitKey } from "../KitAvatar/kitLook";

export type PipBackdrop = "dim" | "none";
/** A moment to play. `look`: the user's avatar for a moment whose figure is "user" (default: the signed-in user's). */
export type PipMomentPlay = PipMomentDef & { look?: AvatarManifest | null; /** The final's variant (momentFx). */ variant?: string };
export interface PipMomentHandle { play: (m: PipMomentPlay) => Promise<void> }
export interface PipMomentProps {
  /** Override the moment's own backdrop (the preview page compares the two); default: the moment's (pipMoments.ts). */
  backdrop?: PipBackdrop;
  variant?: PipVariant;
  dark?: boolean;
  sound?: boolean;
  /** The visible screen in window px (web preview only; default the whole window). */
  screen?: { x: number; y: number; width: number; height: number };
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const ease = Easing.out(Easing.cubic);

export const PipMoment = forwardRef<PipMomentHandle, PipMomentProps>(function PipMoment({ backdrop, variant = "pip", dark = true, sound = true, screen }, ref) {
  // the safe-area context when there is one (the app); none on the web preview page
  const win = useWindowDimensions(), ins = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const W = screen?.width ?? win.width, H = screen?.height ?? win.height;
  const stage = useRef<PipStageHandle>(null), skip = useRef(false);
  const [m, setM] = useState<(PipMomentPlay & { fxNow?: FxEffect | null }) | null>(null);
  const scrim = useSharedValue(0), txt = useSharedValue(0);
  const effect = m?.fxNow ?? (m?.effect ? FX_EFFECTS.find(e => e.id === m.effect) ?? null : null);

  const play = useCallback(async (def: PipMomentPlay) => {
    skip.current = false;
    // a final moment: which of its finals plays now (level-up takes turns)
    const fxNow = def.fx ? await momentFx(def.fx, def.variant) : null;
    setM({ ...def, fxNow });
    await wait(50);                                                    // the stage mounts with this moment's effect
    if ((backdrop ?? def.backdrop) === "dim") scrim.value = withTiming(1, { duration: 260, easing: ease });
    await stage.current?.pip?.body(PIP_IN);
    const fx = fxNow ?? (def.effect ? FX_EFFECTS.find(e => e.id === def.effect) : null);
    const len = fx ? fx.ms : Math.max(0, ...(def.beats ?? []).map(b => b.at)) + 1200;
    const hold = (def.title || def.body) ? Math.max(len, 2600) : len;  // text stays long enough to read
    if (def.title || def.body) setTimeout(() => { txt.value = withTiming(1, { duration: 280, easing: ease }); }, 160);
    if (fx) stage.current?.fire(); else if (def.beats) stage.current?.pip?.perform(def.beats);
    const t0 = Date.now(); while (Date.now() - t0 < hold && !skip.current) await wait(60);
    txt.value = withTiming(0, { duration: 200 });
    await stage.current?.pip?.body(PIP_OUT);
    scrim.value = withTiming(0, { duration: 240 });
    await wait(240); setM(null);
  }, [backdrop, scrim, txt]);
  useImperativeHandle(ref, () => ({ play }), [play]);
  useEffect(() => () => { skip.current = true; }, []);

  const scrimSt = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const txtSt = useAnimatedStyle(() => ({ opacity: txt.value, transform: [{ translateY: (1 - txt.value) * 10 }] }));
  if (!m) return null;

  const fin = !!m.fxNow;
  // a final: Pip at the stage spot (a share of the screen), the words above him; an older moment: centred, words under him
  // he always stands at the lab's stage spot; `design` is where this moment's props were placed (fitted to him)
  const spot = m.fx ? MOMENT_SPOT[m.fx] : null, stageSpot = LAB_SPOTS.stage;
  const size = fin ? Math.round(W * stageSpot.size / DESIGN_W) : Math.round(Math.min(W * 0.6, 250)), pipH = Math.round(size * 322 / 372), stageH = Math.round(pipH * 1.1);
  const pipTopY = fin ? Math.round(H * stageSpot.y / DESIGN_H) : 0;
  const below = fin && effect ? wordsBelow(effect, stageSpot) : false;
  const textW = Math.min(W - 48, 340);
  const hasText = !!(m.title || m.body);
  // dim: the group (Pip + text) is centred, a little above the middle. none: anchored above the bottom edge. Both are laid out
  // from the edges, so a longer text grows the group inward and never runs off the screen.
  const onDim = (backdrop ?? m.backdrop) === "dim";
  const fg = onDim ? "#FFFFFF" : dark ? "#F7F4EE" : "#141311", sub = onDim ? "rgba(255,255,255,0.82)" : dark ? "#CFC8BD" : "#4E4840";

  // no box on the screen (fin, no dim): a soft shadow in the canvas colour keeps the words clear of what is behind them
  const halo = fin && !onDim ? { textShadowColor: dark ? "rgba(20,19,17,0.95)" : "rgba(247,244,238,0.95)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } } : null;
  const words = hasText ? (
    <Animated.View style={[{ width: textW, alignItems: "center", zIndex: 60 /* above the effect's particles (stage zIndex 50): text stays readable */ }, !fin && { marginTop: 14 }, !onDim && !fin && [s.card, { backgroundColor: dark ? "#23211E" : "#FFFFFF", borderColor: dark ? "#3A3733" : "#DDD6C8" }], txtSt]}
      accessibilityLiveRegion="polite">
      {m.title ? <Text style={[typography.h2, { color: fg, textAlign: "center" }, halo]}>{m.title}</Text> : null}
      {m.body ? <Text style={[typography.body, { color: sub, textAlign: "center", marginTop: 6 }, halo]}>{m.body}</Text> : null}
    </Animated.View>) : null;
  if (fin) {
    const stageEl = <PipStage ref={stage} key={m.id + ":" + variant + ":" + effect?.id} startHidden screen={screen} stageW={size} stageH={pipH} pipTop={0} effect={effect} sound={sound} variant={variant} size={size} design={spot ?? undefined} />;
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents={onDim ? "auto" : "box-none"}>
        {onDim ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,7,6,0.86)" }, scrimSt]} /> : null}
        {onDim ? <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={() => { skip.current = true; }} /> : null}
        {/* the words: in the room above Pip, centred in it (they grow upward and downward, never into him) */}
        {words ? (below
          ? <View pointerEvents="none" style={{ position: "absolute", left: 0, width: W, top: pipTopY + pipH + 20, alignItems: "center" }}>{words}</View>
          : <View pointerEvents="none" style={{ position: "absolute", left: 0, width: W, top: ins.top + 12, height: Math.max(0, pipTopY - ins.top - 24), alignItems: "center", justifyContent: "center" }}>{words}</View>) : null}
        <View pointerEvents="none" style={{ position: "absolute", left: Math.round((W - size) / 2), top: pipTopY }}>{stageEl}</View>
      </View>);
  }
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents={onDim ? "auto" : "box-none"}>
      {onDim ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,7,6,0.86)" /* dark enough that the screen behind never competes with the text (S22 check 2026-11-26) */ }, scrimSt]} /> : null}
      {onDim ? <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={() => { skip.current = true; }} /> : null}
      <View pointerEvents="none" style={onDim
        ? { position: "absolute", left: 0, width: W, top: ins.top + 24, bottom: ins.bottom + 24 + H * 0.08, alignItems: "center", justifyContent: "center" }
        : { position: "absolute", left: 0, width: W, bottom: ins.bottom + 40, alignItems: "center" }}>
        {m.figure === "user"
          // the user's own avatar in Pip's place: the same stage, effect, beats, entry and exit; drawn on the user's blob
          ? <PipStage ref={stage} key={m.id + ":user:" + kitKey(m.look)} startHidden screen={screen} stageW={W} stageH={stageH} effect={effect} sound={sound} look={m.look ?? null} size={size} />
          : <PipStage ref={stage} key={m.id + ":" + variant} startHidden screen={screen} stageW={W} stageH={stageH} effect={effect} sound={sound} variant={variant} size={size} />}
        {words}
      </View>
    </View>);
});

/** Props that act above his head and none under him: the words go under him (fractions of a 390 x 844 screen). */
function wordsBelow(fx: FxEffect, at: { y: number; size: number }) {
  const top = at.y / DESIGN_H, bottom = (at.y + at.size * 322 / 372) / DESIGN_H;
  const props = fx.emitters.filter(e => (e.kind === "track" || e.kind === "pop") && e.origin);
  return props.some(e => e.origin![1] < top) && !props.some(e => e.origin![1] > bottom);
}

const s = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 20, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
