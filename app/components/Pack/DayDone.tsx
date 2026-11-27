/**
 * The program's "day done" screen (founder's pick: "Mock 3 · Two beats", 2026-11-26).
 *
 * BEAT 1, the moment: a warm orange zone, the heading ("Day 2 done") big, and Pip. He rises from behind the top edge of a
 * low sheet, looks proud, pops, laughs, and his Star burst plays. The sheet holds one button.
 * BEAT 2, the wrap-up (only when the program has goals to ask about): "Continue" lifts the sheet. Pip gets smaller and
 * rides the sheet's edge at the right, the heading moves to the left and gets smaller, and the sheet shows the goals
 * check, then (after a divider) the tomorrow lines, and "Back to home".
 * With no goals there is one beat: the sheet holds the tomorrow lines and "Back to home" from the start.
 *
 * RULES
 * - Pip acts with his real moves only (Pip.tsx). At rest he only does his own idle (blinks, glances). Nothing sways or loops.
 * - A goal tap (tick or untick) and "Not yet" get the SAME answer from Pip: a listening face, a nod, a warm face. Never a
 *   reward, never a difference (DailyLog: nothing hangs off a goal).
 * - "Not yet" takes the goals AND their divider away together. The tomorrow lines then sit at the sheet's normal top
 *   spacing (the sheet's edge comes down to them): no line or gap is left alone (founder).
 * - "Back to home": Pip waves (his real wave), slides down behind the edge, then the screen leaves. A second tap leaves at once.
 * - Pip (repo rule): full collar always above the edge, the bottom of his body never seen, nothing over his collar or face.
 *   The sheet is drawn over him and his figure is also cut at the edge (PipOnEdge), also mid-slide.
 * - Speed (Android): only transforms and opacity move; flat colours; no blur. The sheet is one full-height view that
 *   slides; nothing changes size while it moves.
 * - Reduced motion: no slides, no particles, no wave. Every change jumps to its end state; Pip's faces still change.
 * - Text is never cut: the heading wraps and is scaled to its room; a sheet taller than the screen allows scrolls inside.
 */
import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Button, Divider, Text, icons, radius, space, spacing, useTheme } from "../../design-system";
import { PipOnEdge, pipEdgeBox } from "../Pip/PipOnEdge";
import type { PipOnEdgeHandle } from "../Pip/PipOnEdge";
import { FX_EFFECTS, FX_SHAPES } from "../Pip/fx/library";
import type { FxEffect } from "../Pip/fx/types";
import { PIP_HALF_HEAD, PIP_HALF_WAVE, PIP_HIDE, ZONE_EASE, ZONE_TEXT_X, sheetFill } from "./zoneSheet";

export type DayDoneAnswer = "toggle" | "dismiss";

export interface DayDoneProps {
  /** dayDoneTitle(): "Day 2 done". */
  heading: string;
  /** dayCloseLine(): "Day 3 opens tomorrow morning." Only when the day just done was the last open one. */
  closeLine?: string | null;
  /** Tomorrow's day by its own title, under the close line. */
  nextTitle?: string | null;
  /** A next day is open now: "Start the next one" is the main button and "Back to home" the quiet one. */
  onNext?: (() => void) | null;
  /**
   * The goals check (DailyLog with layout="sheet", or the lab's stand-in). Give it only when there are goals to ask about:
   * with it the screen has two beats. Call `onAnswer` on every tick, untick ("toggle") and on "Not yet" ("dismiss").
   */
  goalsSlot?: ((api: { onAnswer: (kind: DayDoneAnswer) => void }) => React.ReactNode) | null;
  onHome: () => void;
  sound?: boolean;
  /** false: Pip waits behind the edge until play() (the labs). */
  autoPlay?: boolean;
  /** Web preview only: the phone screen inside the browser window, and its pretend safe area. */
  screen?: { x: number; y: number; width: number; height: number };
  insets?: { top: number; bottom: number };
}
export interface DayDoneHandle {
  /** Beat 1's moment (Pip rises, Star burst). */
  play: () => void;
  /** "Continue". */
  toBeat2: () => void;
}

const BUTTON_H = 56, BUTTON_GAP = spacing.md;
/** The sheet above its button when it holds nothing else (beat 1). */
const SHEET_BARE_TOP = 44;
/** The sheet's normal top spacing above its content, and the room between the content and the buttons. */
const SHEET_PAD_TOP = 28, SHEET_GAP = spacing["2xl"];
/** Text in the sheet and the heading start here; the goal rows reach out to the screen gutter. */
const TEXT_X = ZONE_TEXT_X;
/** Pip in beat 2: at most this share of his beat 1 size, and never less room than this above the sheet. */
const PIP_SMALL = 0.48, PIP_SMALL_ROOM = 150, PIP_HEADROOM = 24;
const MOVE_MS = 480, SETTLE_MS = 320;
// shared with the day screen's frame (zoneSheet.ts): Pip's cut at the edge, his reach, the slide curve, the sheet's fill
const EASE = ZONE_EASE;

// Star burst with two changes for this screen: red does not read on the orange zone, so those stars are cream (mock 3);
// and Pip's own beats are this moment's (proud, a pop, then a laugh; he ends on a smile).
const CREAM = "#FFF6E8", RED = "#FF2B2B";
const DAY_DONE_FX: FxEffect | null = (() => {
  const base = FX_EFFECTS.find(e => e.id === "star-burst");
  if (!base) return null;
  return {
    ...base,
    emitters: base.emitters.map(m => ({ ...m, colors: m.colors?.map(c => (c === RED ? CREAM : c)) })),
    pip: [{ at: 0, body: "pop", face: "proud", haptic: "success" }, { at: 950, face: "laugh" }, { at: 2300, face: "smile" }],
  };
})();

/** Beat 2's still stars round the small Pip: [x, y] from the point where his middle meets the edge, in units of his visible
 *  height; size in the same unit. All of them clear of his face, his collar and the heading. */
const STARS: { x: number; y: number; r: number; c: string }[] = [
  { x: -0.45, y: -1.14, r: 0.09, c: "#FF9BD8" },
  { x: 0.36, y: -1.1, r: 0.1, c: CREAM },
  { x: -0.56, y: -0.8, r: 0.12, c: "#FFC530" },
  { x: 0.4, y: -0.6, r: 0.08, c: "#DFFF2E" },
];
const STAR_D = FX_SHAPES.star?.paths[0]?.d ?? "";

export const DayDone = forwardRef<DayDoneHandle, DayDoneProps>(function DayDone(
  { heading, closeLine, nextTitle, onNext, goalsSlot, onHome, sound = true, autoPlay = true, screen, insets }, ref) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const safe = useContext(SafeAreaInsetsContext);
  const top = insets?.top ?? safe?.top ?? 0, bottomPad = Math.max(insets?.bottom ?? safe?.bottom ?? 0, 12) + 20;

  const twoBeats = !!goalsSlot, hasTomorrow = !!closeLine;
  const [beat, setBeat] = useState<1 | 2>(1);
  const [goalsGone, setGoalsGone] = useState(false);
  // measured: the screen, the sheet's content, the goals block (kept at its tallest so a tick never moves the lines under
  // it), the tomorrow lines, the heading
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [contentH, setContentH] = useState<number | null>(null);
  const [goalsMin, setGoalsMin] = useState(0);
  const [tom, setTom] = useState({ y: 0, h: 0 });
  const [head, setHead] = useState<{ w: number; h: number } | null>(null);
  const round = (e: LayoutChangeEvent) => ({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height), y: Math.round(e.nativeEvent.layout.y) });

  // ── geometry (px in the screen) ──
  const W = box?.w ?? 0, H = box?.h ?? 0;
  const finalButtons = onNext ? 2 : 1;
  const buttonsH = (n: number) => n * BUTTON_H + (n - 1) * BUTTON_GAP;
  const maxContent = Math.max(120, H - (top + PIP_HEADROOM + PIP_SMALL_ROOM) - SHEET_PAD_TOP - SHEET_GAP - buttonsH(finalButtons) - bottomPad);
  const sheetFor = (content: number) => (content > 0
    ? SHEET_PAD_TOP + Math.min(content, maxContent) + SHEET_GAP + buttonsH(finalButtons) + bottomPad
    : SHEET_BARE_TOP + buttonsH(finalButtons) + bottomPad);
  const fullSheet = sheetFor(contentH ?? 0);
  const finalSheet = goalsGone ? sheetFor(hasTomorrow ? tom.h : 0) : fullSheet;
  const firstSheet = twoBeats ? SHEET_BARE_TOP + BUTTON_H + bottomPad : fullSheet;
  const edge1 = H - firstSheet, edgeNow = H - (beat === 1 ? firstSheet : finalSheet);
  // Pip, beat 1: as big as the mock (a little over half of the zone, at most 95% of the width showing above the edge)
  const zone1 = edge1 - top;
  const visible1 = Math.round(Math.min(W * 0.95, zone1 * 0.56));
  const pipSize = Math.round(visible1 / (1 - PIP_HIDE) * 372 / 322);
  const pipBox = pipEdgeBox(pipSize, PIP_HIDE);
  const showPip = box != null && contentH != null && visible1 >= 110;
  // Pip, beat 2: smaller, at the right. The sheet's edge is only straight between its round corners, and every part of
  // him must end on that straight edge: his body, and the sleeve he raises to wave. So he stands a whole wave's reach
  // inside the corner. (Beside the corner the sleeve would end in a flat cut above the curve: founder, 2026-11-26.)
  // In beat 1 he is in the middle, where the same reach is clear of both corners down to a 310 wide screen.
  const small = Math.min(PIP_SMALL, Math.max(0.2, (H - fullSheet - top - PIP_HEADROOM) / Math.max(1, pipBox.visible)));
  const visible2 = pipBox.visible * small;
  const pipX2 = W - radius.sheet - 2 - PIP_HALF_WAVE * pipSize * small;
  // the heading: beat 1 centred in the top third above Pip; beat 2 at the left, level with Pip's face, scaled to its room
  const headH = head?.h ?? 44, headW = head?.w ?? 0;
  const headCy1 = top + Math.max(headH / 2 + 12, (zone1 - (showPip ? pipBox.visible : 0)) * (showPip ? 0.3 : 0.4));
  const headRoom = (showPip ? pipX2 - PIP_HALF_HEAD * pipSize * small - 12 : W - TEXT_X) - TEXT_X;
  const headScale = Math.min(0.76, headRoom / Math.max(1, headW));

  // ── motion: `edge` = the sheet's top edge (y); `p` = 0 in beat 1, 1 in beat 2; `gone` = the goals are away ──
  const edge = useSharedValue(0), p = useSharedValue(0), gone = useSharedValue(0);
  const ready = showPip || (box != null && contentH != null);
  const placed = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!placed.current || reduced) { placed.current = true; edge.value = edgeNow; return; }
    edge.value = withTiming(edgeNow, { duration: beat === 2 && !goalsGone ? MOVE_MS : SETTLE_MS, easing: EASE });
  }, [ready, edgeNow]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { p.value = reduced ? beat - 1 : withTiming(beat - 1, { duration: MOVE_MS, easing: EASE }); }, [beat]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { gone.value = reduced ? +goalsGone : withTiming(+goalsGone, { duration: SETTLE_MS, easing: EASE }); }, [goalsGone]);   // eslint-disable-line react-hooks/exhaustive-deps

  const pip = useRef<PipOnEdgeHandle>(null);
  const play = useCallback(() => { void pip.current?.rise(); }, []);
  const played = useRef(false);
  useEffect(() => {
    if (!showPip || !autoPlay || played.current) return;
    played.current = true;
    const h = setTimeout(play, 350);   // the screen is there first, then he comes up
    return () => clearTimeout(h);
  }, [showPip, autoPlay, play]);

  const beatAt = useRef(0);
  const toBeat2 = useCallback(() => {
    if (!twoBeats) return;
    beatAt.current = Date.now();
    setBeat(2);
  }, [twoBeats]);
  useImperativeHandle(ref, () => ({ play, toBeat2 }), [play, toBeat2]);

  const onAnswer = useCallback((kind: DayDoneAnswer) => {
    void pip.current?.react();   // the same for a tick, an untick and "Not yet"
    if (kind === "dismiss") setGoalsGone(true);
  }, []);
  const goals = useMemo(() => (goalsSlot ? goalsSlot({ onAnswer }) : null), [goalsSlot, onAnswer]);

  // leaving: Pip waves and goes down first; a second tap does not wait for him
  const leaving = useRef<"no" | "pip" | "gone">("no");
  // a double tap on "Continue" must not land on the button that replaces it
  const tooSoon = () => Date.now() - beatAt.current < 450;
  const leave = useCallback((go: () => void) => {
    if (tooSoon() || leaving.current === "gone") return;
    if (leaving.current === "pip" || !pip.current) { leaving.current = "gone"; go(); return; }
    leaving.current = "pip";
    void pip.current.leave().then(() => { if (leaving.current === "pip") { leaving.current = "gone"; go(); } });
  }, []);

  // ── animated styles (transforms and opacity only) ──
  const sheetSt = useAnimatedStyle(() => ({ transform: [{ translateY: edge.value }] }));
  const pipSt = useAnimatedStyle(() => {
    const s = 1 + (small - 1) * p.value;
    return { transform: [{ translateX: (pipX2 - W / 2) * p.value }, { translateY: pipBox.visible / 2 * (1 - s) }, { scale: s }] };
  }, [small, pipX2, W, pipBox.visible]);
  const headSt = useAnimatedStyle(() => {
    const s = 1 + (headScale - 1) * p.value;
    const cy2 = edge.value - visible2 * 0.5;
    return { transform: [{ translateX: (TEXT_X + headW * headScale / 2 - W / 2) * p.value }, { translateY: headCy1 + (cy2 - headCy1) * p.value - headH / 2 }, { scale: s }] };
  }, [headScale, visible2, headW, headH, headCy1, W]);
  const contentSt = useAnimatedStyle(() => ({ opacity: twoBeats ? interpolate(p.value, [0.35, 1], [0, 1], "clamp") : 1 }), [twoBeats]);
  const shiftSt = useAnimatedStyle(() => ({ transform: [{ translateY: -tom.y * gone.value }] }), [tom.y]);
  const starsSt = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.7, 1], [0, 1], "clamp") }));

  const sheetBg = sheetFill(colors, scheme);
  const onOrange = colors.action.onPrimary;
  const inBeat2 = beat === 2 || !twoBeats;
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { if (goalsGone) scroll.current?.scrollTo({ y: 0, animated: false }); }, [goalsGone]);

  return (
    <View style={[s.root, { backgroundColor: colors.action.primary }]} onLayout={e => { const b = round(e); setBox(o => (o && o.w === b.w && o.h === b.h ? o : { w: b.w, h: b.h })); }}>
      <StatusBar barStyle="dark-content" />

      {/* the heading: one text, moved and scaled between the beats */}
      <Animated.View pointerEvents="none" style={[s.headRow, { opacity: head && ready ? 1 : 0 }, headSt]}>
        <View onLayout={e => { const b = round(e); setHead(o => (o && o.w === b.w && o.h === b.h ? o : { w: b.w, h: b.h })); }}>
          <Text variant="screenTitle" color={onOrange} center accessibilityRole="header">{heading}</Text>
        </View>
      </Animated.View>

      {/* everything that rides on the sheet's edge: a line of no height at the edge */}
      {showPip ? (
        <Animated.View pointerEvents="none" style={[s.edgeLine, { width: W }, sheetSt]}>
          {twoBeats ? (
            <Animated.View style={[s.edgeLine, { left: pipX2 }, starsSt]}>
              {STARS.map((st, i) => {
                const d = Math.round(st.r * visible2 * 2);
                return (
                  <Svg key={i} width={d} height={d} viewBox="0 0 100 100" style={{ position: "absolute", left: Math.round(st.x * visible2 - d / 2), top: Math.round(st.y * visible2 - d / 2) }}>
                    <Path d={STAR_D} fill={st.c} stroke={st.c} strokeWidth={14} strokeLinejoin="round" />
                  </Svg>);
              })}
            </Animated.View>) : null}
          <Animated.View style={[s.pipFoot, { left: Math.round((W - pipSize) / 2), width: pipSize }, pipSt]}>
            <PipOnEdge ref={pip} key={pipSize} size={pipSize} hide={PIP_HIDE} effect={DAY_DONE_FX} sound={sound} screen={screen} clipBelow={radius.sheet + 2} />
          </Animated.View>
        </Animated.View>) : null}

      {/* the sheet: one full-height view that slides; it covers Pip below its edge */}
      <Animated.View style={[s.sheet, { height: Math.max(H, 1), backgroundColor: sheetBg, opacity: ready ? 1 : 0 }, sheetSt]}>
        <Animated.View style={[s.sheetBody, contentSt]} pointerEvents={inBeat2 ? "auto" : "none"}
          accessibilityElementsHidden={!inBeat2} importantForAccessibility={inBeat2 ? "auto" : "no-hide-descendants"}>
          <ScrollView ref={scroll} style={{ maxHeight: maxContent }} bounces={false} showsVerticalScrollIndicator={(contentH ?? 0) > maxContent}
            scrollEnabled={!goalsGone && (contentH ?? 0) > maxContent}>
            <Animated.View style={shiftSt} onLayout={e => { const b = round(e); setContentH(o => (o === b.h ? o : b.h)); }}>
              {twoBeats ? (
                // the goals and their divider are ONE block: "Not yet" takes both away together. The block keeps its
                // height (no layout change): the lines under it move up by a transform, and the sheet's edge comes down
                <View style={{ minHeight: goalsMin }} pointerEvents={goalsGone ? "none" : "auto"}
                  onLayout={e => { const b = round(e); setGoalsMin(o => Math.max(o, b.h)); }}>
                  {goals}
                  {hasTomorrow ? <View style={[s.divider, goalsGone && s.hidden]}><Divider /></View> : null}
                </View>) : null}
              {hasTomorrow ? (
                <View style={s.tomorrow} onLayout={e => { const b = round(e); setTom(o => (o.y === b.y && o.h === b.h ? o : { y: b.y, h: b.h })); }}>
                  <Text variant="bodySm" color="secondary">{closeLine}</Text>
                  {nextTitle ? <Text variant="h3" color="primary">{nextTitle}</Text> : null}
                </View>) : null}
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* the buttons stay at the bottom of the screen while the sheet moves under them */}
      <View style={[s.buttons, { bottom: bottomPad }]}>
        {!inBeat2 ? (
          <Button label="Continue" onPress={toBeat2} />
        ) : (
          <>
            {onNext ? <Button label="Start the next one" leftIcon={icons.play} onPress={() => { if (!tooSoon() && leaving.current !== "gone") { leaving.current = "gone"; onNext(); } }} /> : null}
            <Button label="Back to home" variant={onNext ? "ghost" : "primary"} onPress={() => leave(onHome)} />
          </>)}
      </View>
    </View>);
});

const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  // a row across the top; the transform puts the heading's middle where it belongs
  headRow: { position: "absolute", left: TEXT_X, right: TEXT_X, top: 0, alignItems: "center" },
  edgeLine: { position: "absolute", left: 0, top: 0, height: 0 },
  // Pip's box ends on the edge line; PipOnEdge hangs his hidden part below it
  pipFoot: { position: "absolute", bottom: 0 },
  sheet: { position: "absolute", left: 0, right: 0, top: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  sheetBody: { paddingTop: SHEET_PAD_TOP, paddingHorizontal: space.screenX },
  divider: { marginTop: spacing.xl, marginBottom: spacing["2xl"], marginHorizontal: TEXT_X - space.screenX },
  hidden: { opacity: 0 },
  tomorrow: { paddingHorizontal: TEXT_X - space.screenX, gap: spacing.xs },
  buttons: { position: "absolute", left: space.screenX, right: space.screenX, gap: BUTTON_GAP },
});
