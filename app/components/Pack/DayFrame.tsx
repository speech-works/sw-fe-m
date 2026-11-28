/**
 * THE DAY FRAME: the one frame every step of a program day sits in (program screens redesign, 2026-11-27; the "two beats"
 * look of the day-done screen, DayDone).
 *
 *   ORANGE ZONE (top)   status bar, back disc, the day title + "Day N of 7 · Step N of M", the step bar in on-orange ink;
 *                       on a moment step also a large title and Pip.
 *   SHEET (rounded 28)  runs to the bottom. It holds the step's content and the dock (DayIslandDock, founder's pick "B4":
 *                       a steps button with a progress ring, a round Back, the action as the orange pill).
 *
 * THREE ZONE HEIGHTS (`zone`):
 *   "slim"    work steps (lesson, quiz, and every step that has no design of its own yet). No Pip.
 *   "medium"  a title in the zone (`zoneTitle`), Pip at the right (`pip` "large" or "small") or no Pip.
 *   "tall"    the step's one moment (practice card, log card): Pip in the centre (`pip` "hero").
 * A step only chooses the zone and fills the sheet (see dayStepFrame.ts for the steps that have chosen).
 * `compact` (a screen of its own that a step opens: the practice screen): a medium zone whose header row is the back disc
 * alone, with no step bar. The title starts right under the disc and Pip's head stands beside the disc row (mock 10).
 *
 * HOW IT IS BUILT (Android speed: only transforms and opacity move, flat colours, no blur)
 * - The sheet's fill is one full-height view that slides (translateY) when the zone height changes between steps.
 *   Nothing changes size while it moves. The content and the dock are laid out once at their new place.
 * - Pip stands on a line of no height at the sheet's top edge, drawn UNDER the sheet's fill. PipOnEdge cuts his figure a
 *   corner radius + 2 below the edge, where the sheet is solid, and he stands a whole wave's reach inside the rounded
 *   corner: the bottom of his body is never seen, there is no gap at a corner, and his full collar is above the edge.
 *   Nothing is drawn over him and nothing stands behind him.
 * - When the step changes, the Pip of the old step slides down behind the edge (his real way out) while the sheet moves,
 *   then the Pip of the new step comes up. Between his moves he only does his own idle (blinks, glances).
 * - The sheet's content can wait for Pip (`textDelay`), and fades in when the sheet has moved.
 * - Reduced motion: no slides and no fades, every change jumps to its end state; Pip's faces still change.
 * - Text is never cut: the header title and the zone title wrap, the zone grows with them, the sheet's content scrolls.
 * - Rule of the system: a part that can go takes its label, line and gap with it. The dock is anchored to the bottom and
 *   has no empty slot: with no "Back" the steps disc is at the left and the pill at the right.
 * - A launch card (practice, log) tells the frame its one button with <DayLaunch>. Where it is drawn is the launch layout
 *   (the founder's layout "A", the only one): the dock's pill is the card's own button until the step is done (then it
 *   is "Next"). Skip and "Do it again" are small links in the sheet (the card draws them). A step with no <DayLaunch>
 *   has the plain dock and no slot or gap.
 * - A medium zone with no Pip (the video step): the zone's text starts higher and its title starts at 26, so the sheet
 *   keeps the room for the video (mock 09).
 * - Markdown on the sheet uses the mocks' tight rows (SimpleMarkdown's MarkdownTight).
 */
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, { FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Button, Gradient, Icon, Text, fonts, haptics, icons, radius, space, useKeyboardInset, useTheme } from "../../design-system";
import type { IconName, PageScrollState } from "../../design-system";
import { PageScrollContext } from "../../design-system/pageScroll";
import type { PipFace } from "../Pip/Pip";
import { PipOnEdge, pipEdgeBox } from "../Pip/PipOnEdge";
import type { PipOnEdgeHandle } from "../Pip/PipOnEdge";
import { MOMENT_SPOT, momentFx } from "../Pip/fx/momentFx";
import { FxFront, FxFrontHost } from "../Pip/fx/FxPortal";
import type { MomentFxId } from "../Pip/fx/momentFx";
import { StepsBar } from "./DayChrome";
import { MarkdownTight } from "./SimpleMarkdown";
import type { DayPipKind, DayZone } from "./dayStepFrame";
import { zoneTitleSize } from "./dayStepFrame";
import { ON_ORANGE_DISC, ON_ORANGE_MUTED, PIP_HALF_HEAD, PIP_HALF_WAVE, PIP_HIDE, ZONE_EASE, ZONE_TEXT_X, sheetFill } from "./zoneSheet";

// ── the frame's numbers (system.md, 390 x 844 with a 44 status bar) ─────────────────────────────────────────────────────
/** Back disc: 8 under the status bar, 44 round. The bar: 14 under the disc. */
const HEAD_TOP = 8, DISC = 44, BAR_GAP = 14;
/** Slim: the sheet starts this far under the bar (134 in the mock), or under the disc when there is no bar (112). */
const SLIM_GAP = 19, SLIM_GAP_BARE = 16;
/** Medium: the zone's text starts here under the bar (with the day line above the title / with the title alone). */
const ZONE_TEXT_TOP = 31, ZONE_TITLE_ALONE = 30;
/** Medium with no Pip (the video step): the text starts here under the bar (short screen: tighter); its title's first size. */
const BARE_TEXT_TOP = 21, BARE_TEXT_TOP_SHORT = 12, BARE_TITLE_SIZE = 26;
/** Pip's head stays this far under the bar (medium / tall). */
const PIP_HEADROOM = 26, PIP_HEADROOM_SHORT = 12, HERO_HEADROOM = 45, HERO_HEADROOM_SHORT = 20;
/** Tall: the sheet's edge is never lower than this share of the screen (short screen: higher, so a launch card's title on
 *  two lines and four lines of text still fit above its button). */
const HERO_EDGE = 0.47, HERO_EDGE_SHORT = 0.43;
/** The zone's text ends at least this far above the sheet, and above Pip's shoulders (the lowest part of his figure that
 *  is wider than his head; a share of his visible height). */
const ZONE_TEXT_BOTTOM = 28, PIP_SHOULDER = 0.22;
/** Compact: the title starts this far under the back disc; Pip's head starts this far under the disc's top; the title
 *  takes at most this many lines before it goes down a size (mock 10: 24/30 on two lines, the sheet at 204). */
const COMPACT_TEXT_TOP = 12, COMPACT_PIP_TOP = 6, COMPACT_TITLE_LINES = 2;
/** Pip's widths at 390 wide, in his own picture (372): the mock's 186, 150 and 242 are of the 320 wide site picture. */
const PIP_W: Record<DayPipKind, number> = { large: 216, small: 174, hero: 281 };
const PIP_MIN: Record<DayPipKind, number> = { large: 150, small: 120, hero: 150 };
/** The sheet's content starts here; the fade above the dock. */
const SHEET_PAD_TOP = 24, TOP_FADE = 14, DOCK_FADE = 28, DOCK_PAD_TOP = 16;
const SLIDE_MS = 360, FADE_MS = 240;

export interface DayFrameApi {
  /** The Pip of this step (null on a step with no Pip, and until he is there). */
  pip: () => PipOnEdgeHandle | null;
  /** The step's own button (see DayLaunch). Null takes it away. */
  setLaunch: (launch: DayLaunchState | null) => void;
  /** Play one of Pip's final moments (momentFx.ts) where this step's Pip stands: its props are fitted to him and its
   *  background stays in the orange zone. Resolves when it has finished; at once on a step with no Pip. */
  playMoment: (id: MomentFxId, variant?: string) => Promise<void>;
}
const DayFrameContext = createContext<DayFrameApi | null>(null);
/** For a step's content: Pip in the zone (to let him answer a tap). Null outside the day frame. */
export const useDayFrame = () => useContext(DayFrameContext);

/** A launch card's one button: what it says and does, and whether the step is already done. */
export interface DayLaunchState { label: string; icon?: IconName; loading?: boolean; completed: boolean; onPress: () => void }
const DayLaunchContext = createContext<DayLaunchState | null>(null);

/**
 * A launch card tells the day frame its one button ("Start practice", "Start writing"; `completed`: the step is done
 * and the button starts it again). It draws nothing itself: the frame and the dock draw the button where the launch
 * layout puts it. When it unmounts the button goes. Outside the day frame it does nothing.
 */
export function DayLaunch(props: DayLaunchState) {
  const frame = useDayFrame();
  useLayoutEffect(() => { frame?.setLaunch(props); });
  useLayoutEffect(() => () => frame?.setLaunch(null), [frame]);
  return null;
}

export interface DayFrameProps {
  zone: DayZone;
  /** The day's title and its "Day N of 7 · Step N of M" line. */
  title: string;
  meta: string;
  onBack: () => void;
  /** The step bar (null = a day with no steps). */
  bar?: { count: number; current: number; fill: number } | null;
  /** true: the day title and the meta line sit beside the back disc. false: the row holds the back disc alone. */
  headerText?: boolean;
  /** Medium zone of a screen with no step bar and no header text: the title right under the back disc, Pip's head beside
   *  the disc row (see the note at the top). Default false: nothing changes for the day's steps. */
  compact?: boolean;
  /** Medium zone: the large title. */
  zoneTitle?: string | null;
  /** Medium zone: the meta line sits above the large title (for a step whose header row does not show it). */
  zoneMeta?: boolean;
  pip?: DayPipKind | null;
  /** The face Pip comes up with. */
  pipFace?: PipFace;
  /** How far his hands reach toward the zone's text in this step's moves (share of his width from his middle; see
   *  dayStepFrame). The text keeps clear of it, so nothing is ever drawn over or under his hands. */
  pipReach?: number;
  /** Called once when the step's Pip has come up. */
  onPipUp?: (pip: PipOnEdgeHandle) => void;
  sound?: boolean;
  /** The step: a new key is a new step (a new Pip, the content may fade in). */
  contentKey: string | number;
  /** Back to the top when this changes (a lesson part inside the same step). */
  scrollResetKey?: string | number;
  /** ms the sheet's content waits before it fades in (the start step: after Pip has settled). */
  textDelay?: number;
  /** DayDock. */
  dock: React.ReactNode;
  /** Sheets and other things that draw over the screen. */
  overlays?: React.ReactNode;
  /** The frame's API for the screen that draws it (the step's content gets it from useDayFrame). */
  apiRef?: React.MutableRefObject<DayFrameApi | null>;
  children?: React.ReactNode;
}

type PipSlot = { key: string; kind: DayPipKind; face: PipFace; hold: number | null };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clearOf = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return "transparent"; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},0)`; };

export function DayFrame({ zone, title, meta, onBack, bar = null, headerText = true, compact = false, zoneTitle = null, zoneMeta = false, pip = null, pipFace = "calm", pipReach = 0,
  onPipUp, sound = true, contentKey, scrollResetKey, textDelay = 0, dock, overlays, apiRef, children }: DayFrameProps) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const safe = useContext(SafeAreaInsetsContext);
  const keyboardInset = useKeyboardInset();
  const top = safe?.top ?? 0, bottom = safe?.bottom ?? 0;
  const sheetBg = sheetFill(colors, scheme), ink = colors.action.onPrimary;

  // measured: the screen, the header (down to the bar's bottom), the zone's text
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [headH, setHeadH] = useState<number | null>(null);
  const [zoneText, setZoneText] = useState<{ key: string; h: number } | null>(null);
  const size = (e: LayoutChangeEvent) => ({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) });

  // ── geometry (px in the screen) ──
  const W = box?.w ?? 0, H = box?.h ?? 0;
  const headB = headH ?? top + HEAD_TOP + DISC + (bar ? BAR_GAP + 5 : 0);
  const medium = zone === "medium" && !!zoneTitle, tall = zone === "tall";
  const pipKind: DayPipKind | null = !box ? null : tall ? pip ?? "hero" : medium ? pip : null;
  // Pip is smaller on a smaller screen (the sheet keeps its room for the step's text and answers); the hero also never
  // takes more than 47% of the height with the header (43% on a short screen). On a short screen the zone is tighter above
  // his head and its title.
  const k = clamp(Math.min(W / 390, H / 844), 0.7, 1);
  const short = H < 780, headroom = short ? PIP_HEADROOM_SHORT : PIP_HEADROOM, heroHeadroom = short ? HERO_HEADROOM_SHORT : HERO_HEADROOM;
  const pipSizeOf = (kind: DayPipKind) => {
    const byScreen = Math.round(PIP_W[kind] * k);
    if (kind !== "hero") return Math.max(PIP_MIN[kind], byScreen);
    const room = H * (short ? HERO_EDGE_SHORT : HERO_EDGE) - headB - heroHeadroom;
    return clamp(Math.round(room / (1 - PIP_HIDE) * 372 / 322), PIP_MIN.hero, byScreen);
  };
  // The sheet's edge is only straight between its round corners, and every part of Pip must end on that straight edge:
  // his body, and the sleeve he raises to wave. So at the right he stands a whole wave's reach inside the corner (DayDone).
  const pipXOf = (kind: DayPipKind, sz: number) => (kind === "hero" ? W / 2 : W - radius.sheet - 2 - PIP_HALF_WAVE * sz);
  const pipSize = pipKind ? pipSizeOf(pipKind) : 0, pipVisible = pipKind ? pipEdgeBox(pipSize, PIP_HIDE).visible : 0;
  const pipX = pipKind ? pipXOf(pipKind, pipSize) : 0;
  // the zone's text: beside Pip (clear of his head), or the full width
  const textRoom = Math.max(120, (pipKind && pipKind !== "hero" ? pipX - Math.max(PIP_HALF_HEAD, pipReach) * pipSize - 12 : W - ZONE_TEXT_X) - ZONE_TEXT_X);
  const bare = medium && !pipKind && !compact;
  const titleType = useMemo(() => zoneTitleSize(zoneTitle ?? "", textRoom, compact ? COMPACT_TITLE_LINES : undefined, bare ? BARE_TITLE_SIZE : undefined), [zoneTitle, textRoom, compact, bare]);
  const zoneTextKey = `${zoneTitle}|${zoneMeta}|${textRoom}|${titleType.fontSize}`;
  const zoneTextTop = compact ? headB + COMPACT_TEXT_TOP
    : bare ? headB + (short ? BARE_TEXT_TOP_SHORT : BARE_TEXT_TOP)
    : headB + ZONE_TEXT_TOP - (PIP_HEADROOM - headroom) + (zoneMeta || !pipKind ? 0 : Math.round(ZONE_TITLE_ALONE * k));
  // where Pip's head starts: under the header, or (compact) beside the back disc
  const pipTopY = compact ? top + HEAD_TOP + COMPACT_PIP_TOP : headB + headroom;
  // until it is measured: a guess from the estimate (it is nearly always right, so the sheet does not move twice)
  const zoneTextH = zoneText?.key === zoneTextKey ? zoneText.h : (zoneMeta ? 18 + 8 : 0) + titleType.lines * titleType.lineHeight;
  const edgeY = !box ? 0
    : tall ? headB + heroHeadroom + pipVisible
    : medium ? Math.max(pipKind ? pipTopY + pipVisible : 0, zoneTextTop + zoneTextH + Math.max(ZONE_TEXT_BOTTOM, Math.round(pipVisible * PIP_SHOULDER)))
    : headB + (bar ? SLIM_GAP : SLIM_GAP_BARE);
  const ready = box != null;

  // ── motion: `edge` = the sheet's top edge (y) ──
  const edge = useSharedValue(0);
  const placed = useRef(false), lastEdge = useRef(0);
  useEffect(() => {
    if (!ready) return;
    if (!placed.current || reduced) { placed.current = true; edge.value = edgeY; } else edge.value = withTiming(edgeY, { duration: SLIDE_MS, easing: ZONE_EASE });
    lastEdge.current = edgeY;
  }, [ready, edgeY]);   // eslint-disable-line react-hooks/exhaustive-deps
  const sheetSt = useAnimatedStyle(() => ({ transform: [{ translateY: edge.value }] }));

  // the content of a new step fades in when the sheet has moved for it, or when it waits for Pip (decided once per step)
  const fade = useMemo(() => {
    if (reduced || !placed.current && !textDelay) return null;
    const moved = placed.current && Math.abs(lastEdge.current - edgeY) > 1;
    return moved || textDelay ? FadeIn.delay(Math.max(textDelay, moved ? 180 : 0)).duration(FADE_MS) : null;
  }, [contentKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pip: one per step; the old one goes down behind the edge, then the new one comes up ──
  const pipKey = pipKind ? `${contentKey}:${pipKind}` : null;
  const [slots, setSlots] = useState<PipSlot[]>([]);
  const handles = useRef<Record<string, PipOnEdgeHandle | null>>({}), risen = useRef<Record<string, boolean>>({});
  const upCb = useRef(onPipUp); upCb.current = onPipUp;
  useEffect(() => {
    setSlots(list => {
      const kept = list.map(s => (s.key === pipKey || s.hold != null ? s : { ...s, hold: lastEdge.current }));
      return pipKey && pipKind && !kept.some(s => s.key === pipKey) ? [...kept, { key: pipKey, kind: pipKind, face: pipFace, hold: null }] : kept;
    });
  }, [pipKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const s of slots) {
      if (s.hold != null) {
        // on his way out: down behind the edge, then he is taken away
        void handles.current[s.key]?.down();
        timers.push(setTimeout(() => { delete handles.current[s.key]; delete risen.current[s.key]; setSlots(l => l.filter(x => x.key !== s.key)); }, reduced ? 0 : 340));
      } else if (!risen.current[s.key]) {
        // the screen (and the sheet's slide) first, then he comes up
        timers.push(setTimeout(() => {
          const h = handles.current[s.key];
          if (!h) return;
          risen.current[s.key] = true;
          void h.rise().then(() => { if (handles.current[s.key] === h) upCb.current?.(h); });
        }, slots.length > 1 ? 400 : 300));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [slots, reduced]);
  // the step's own button (DayLaunch). The newest handler is kept in a ref, so a new render of the card does not draw the
  // frame again.
  const [launch, setLaunchState] = useState<DayLaunchState | null>(null);
  const launchPress = useRef<(() => void) | null>(null);
  const api = useMemo<DayFrameApi>(() => ({
    pip: () => (pipKey ? handles.current[pipKey] ?? null : null),
    playMoment: async (id, variant) => {
      const h = pipKey ? handles.current[pipKey] : null;
      if (!h) return;
      await h.play(await momentFx(id, variant), MOMENT_SPOT[id]);
    },
    setLaunch: next => {
      launchPress.current = next?.onPress ?? null;
      setLaunchState(old => {
        if (!next) return null;
        if (old && old.label === next.label && old.icon === next.icon && !!old.loading === !!next.loading && old.completed === next.completed) return old;
        return { label: next.label, icon: next.icon, loading: !!next.loading, completed: next.completed, onPress: () => launchPress.current?.() };
      });
    },
  }), [pipKey]);
  if (apiRef) apiRef.current = api;

  // ── the scroll body (what Page gives its children: QuizRunner scrolls to its explanation, useInView) ──
  const scrollY = useSharedValue(0);
  const scroll = useRef<Animated.ScrollView>(null);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });
  const [bodyH, setBodyH] = useState(0);
  useEffect(() => { scrollY.value = 0; if (scrollResetKey !== undefined) (scroll.current as any)?.scrollTo?.({ y: 0, animated: false }); }, [scrollResetKey, contentKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  // scrolled text dissolves under the sheet's top edge too (it is not there while the content is at its top)
  const topFadeSt = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, scrollY.value / 12)) }));
  const pageScroll = useMemo<PageScrollState>(() => ({
    scrollY, viewportTop: edgeY, viewportHeight: bodyH, occludedBottom: 0,
    scrollToEnd: () => (scroll.current as any)?.scrollToEnd?.({ animated: true }),
  }), [scrollY, edgeY, bodyH]);

  const onBox = useCallback((e: LayoutChangeEvent) => { const b = size(e); setBox(o => (o && o.w === b.w && o.h === b.h ? o : b)); }, []);

  return (
    <DayFrameContext.Provider value={api}>
      <FxFront>
      <DayLaunchContext.Provider value={launch}>
      <PageScrollContext.Provider value={pageScroll}>
        <View style={[s.root, { backgroundColor: colors.action.primary }]} onLayout={onBox}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

          {/* the header: back disc, the day title and its line, the step bar. It grows with a long title. */}
          <View style={[s.head, { paddingTop: top + HEAD_TOP }]} onLayout={e => { const b = size(e); setHeadH(o => (o === b.h ? o : b.h)); }}>
            <View style={s.headRow}>
              <Pressable onPress={() => { haptics.light(); onBack(); }} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}
                style={({ pressed }) => [s.disc, pressed && s.pressed]}>
                <Icon name="arrow-left" size={22} color={ink} />
              </Pressable>
              {headerText ? (
                <View style={s.headText}>
                  <Text style={[s.headTitle, { color: ink }]} accessibilityRole="header">{title}</Text>
                  <Text style={s.metaLine}>{meta}</Text>
                </View>) : null}
            </View>
            {bar ? <View style={s.bar}><StepsBar count={bar.count} current={bar.current} fill={bar.fill} /></View> : null}
          </View>

          {/* the zone's text (medium): the day line and the large title, beside Pip */}
          {medium && ready ? (
            <Animated.View key={zoneTextKey} entering={reduced ? undefined : FadeIn.duration(FADE_MS)} pointerEvents="none"
              style={[s.zoneText, { top: zoneTextTop, width: textRoom }]}
              onLayout={e => { const b = size(e); setZoneText(o => (o && o.key === zoneTextKey && o.h === b.h ? o : { key: zoneTextKey, h: b.h })); }}>
              {zoneMeta ? <Text style={[s.metaLine, s.zoneMeta]}>{meta}</Text> : null}
              <Text style={[s.zoneTitle, { fontSize: titleType.fontSize, lineHeight: titleType.lineHeight, color: ink }]} accessibilityRole="header">{zoneTitle}</Text>
            </Animated.View>) : null}

          {/* Pip on the sheet's edge, under the sheet's fill */}
          {slots.map(slot => {
            const sz = pipSizeOf(slot.kind);
            return (
              <EdgePip key={slot.key} edge={edge} hold={slot.hold} width={W} left={Math.round(pipXOf(slot.kind, sz) - sz / 2)} size={sz}>
                <PipOnEdge ref={h => { handles.current[slot.key] = h; }} key={sz} size={sz} hide={PIP_HIDE} face={slot.face} sound={sound}
                  startUp={!!risen.current[slot.key]} clipBelow={radius.sheet + 2} backClip={edgeY} />
              </EdgePip>);
          })}

          {/* the sheet's fill: one full-height view that slides; it covers Pip below its edge */}
          <Animated.View pointerEvents="none" style={[s.sheet, { height: Math.max(H, 1), backgroundColor: sheetBg, opacity: ready ? 1 : 0 }, sheetSt]} />

          {/* the sheet's content and the dock, laid out at the sheet's place */}
          {ready ? (
            <View style={[s.body, { top: edgeY }]}>
              <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <Animated.View key={contentKey} entering={fade ?? undefined} style={s.fill} onLayout={e => setBodyH(Math.round(e.nativeEvent.layout.height))}>
                  <Animated.ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={16}
                    style={s.fill} contentContainerStyle={s.content}>
                    <MarkdownTight.Provider value>{children}</MarkdownTight.Provider>
                  </Animated.ScrollView>
                  <Animated.View pointerEvents="none" style={[s.topFade, topFadeSt]}>
                    <Gradient colors={[sheetBg, clearOf(sheetBg)]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.fill} />
                  </Animated.View>
                  {/* the text dissolves into the sheet above the dock */}
                  <Gradient colors={[clearOf(sheetBg), sheetBg]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} pointerEvents="none" style={s.fade} />
                </Animated.View>
              </KeyboardAvoidingView>
              <View style={[s.dock, { paddingBottom: Math.max(bottom, 16) + keyboardInset, backgroundColor: sheetBg }]}>
                {dock}
              </View>
            </View>) : null}
          {/* a moment's props that act on the sheet (the pencil, the check) are drawn over it */}
          <FxFrontHost />
          {overlays}
        </View>
      </PageScrollContext.Provider>
      </DayLaunchContext.Provider>
      </FxFront>
    </DayFrameContext.Provider>);
}

/** Pip's place: a line of no height at the sheet's edge. A Pip on his way out (`hold`) never rides the edge UP: the sheet
 *  then slides over him where he stood; he does follow it down, so his cut is always behind the sheet. */
function EdgePip({ edge, hold, width, left, size, children }: { edge: SharedValue<number>; hold: number | null; width: number; left: number; size: number; children: React.ReactNode }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: hold == null ? edge.value : Math.max(edge.value, hold) }] }), [hold]);
  return (
    <Animated.View pointerEvents="none" style={[s.edgeLine, { width }, st]}>
      <View style={[s.pipFoot, { left, width: size }]}>{children}</View>
    </Animated.View>);
}

export interface DayDockProps {
  /** The steps disc: its badge ("2/8", or a lesson's "1/3") and what it opens. Null = no disc (a day with no steps). */
  steps?: { badge: string; accessibilityLabel: string; onPress: () => void } | null;
  /** "Back" (null on the first step: the dock keeps the disc at the left and the pill at the right, no empty slot). */
  onBack?: (() => void) | null;
  /** The one pill. "secondary" = an outline (Skip). */
  label: string;
  icon?: IconName;
  variant?: "primary" | "secondary";
  loading?: boolean;
  onPress: () => void;
}

/**
 * The dock at the bottom of the sheet: steps disc (left), "Back" (middle), one pill (right, 158 wide).
 * On a launch card (DayLaunch), while the step is not done, the pill is the card's own button, filled, and as wide as its
 * label needs; "Back" gives up its side padding so the label is never cut.
 */

/**
 * The day's dock, founder's pick "B4 · two islands" (2026-11-27): no capsule. At the left two round buttons: the steps
 * button (the list icon on its own disc, with an orange progress ring round it that fills step by step; no digits: the
 * exact number is in the header and the steps sheet) and Back (a chevron on the same disc; absent on step 1, no empty
 * slot). At the right the action as the orange pill (Next, Next part, Check, Finish, Start practice, ...). "Skip"
 * (variant "secondary") is the same pill as a soft filled one in the control tone. The icon is full contrast (founder).
 */
const RING = 52, RING_W = 3.5, RING_R = (RING - RING_W) / 2, RING_C = 2 * Math.PI * RING_R, ROUND = 48;
function progressOf(badge: string) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(badge.trim());
  return m ? Math.max(0, Math.min(1, Number(m[1]) / Math.max(1, Number(m[2])))) : 0;
}
export function DayIslandDock({ steps = null, onBack = null, label, icon, variant = "primary", loading, onPress }: DayDockProps) {
  const { colors } = useTheme();
  const launch = useContext(DayLaunchContext);
  const own = launch && !launch.completed;
  const disc = { backgroundColor: colors.surface.control, borderColor: colors.border.default };
  const pct = steps ? progressOf(steps.badge) : 0;
  return (
    <View style={s.dockRow}>
      <View style={s3.left}>
        {steps ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${steps.accessibilityLabel}, step ${steps.badge}`} hitSlop={4}
            onPress={() => { haptics.light(); steps.onPress(); }} style={({ pressed }) => [s3.ring, pressed && s.pressed]}>
            <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
              <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={colors.border.default} strokeWidth={RING_W} fill="none" />
              {pct > 0 ? (
                <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={colors.action.primary} strokeWidth={RING_W} fill="none" strokeLinecap="round"
                  strokeDasharray={`${(pct * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`} transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />) : null}
            </Svg>
            <View style={[s3.inner, disc]}><Icon name="list" size={22} color={colors.text.primary} /></View>
          </Pressable>) : null}
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={4} onPress={() => { haptics.light(); onBack(); }}
            style={({ pressed }) => [s3.round, disc, pressed && s.pressed]}>
            <Icon name={icons.chevronLeft} size={22} color={colors.text.primary} />
          </Pressable>) : null}
      </View>
      <View style={[own ? s.pillOwn : s.pill, !steps && !onBack && s.pillAlone]}>
        {own
          ? <Button label={launch.label} leftIcon={launch.icon} loading={launch.loading} onPress={launch.onPress} style={s2.ownPad} />
          : <Button label={label} variant={variant} leftIcon={icon} loading={loading} onPress={onPress}
              style={variant === "secondary" ? { backgroundColor: colors.surface.control, borderWidth: 0 } : undefined} />}
      </View>
    </View>);
}
const s3 = StyleSheet.create({
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  ring: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  inner: { width: RING - 2 * (RING_W + 3), height: RING - 2 * (RING_W + 3), borderRadius: RING, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
});


// "Skip" is an outline on the sheet (mock 04): the secondary button's ink and edge, with no fill
// With the card's own (wider) button in the pill, "Back" gives up its side padding so the pill's label is never cut.
const s2 = StyleSheet.create({ outline: { backgroundColor: "transparent" }, tight: { paddingHorizontal: 8 }, ownPad: { paddingHorizontal: 20 } });
const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  fill: { flex: 1 },
  head: { paddingHorizontal: space.screenX },
  headRow: { flexDirection: "row", alignItems: "center", minHeight: DISC, gap: 12 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: ON_ORANGE_DISC, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.96 }] },
  headText: { flex: 1 },
  headTitle: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 16, lineHeight: 21, letterSpacing: -0.1 },
  metaLine: { fontFamily: fonts.medium, fontWeight: "500", fontSize: 13, lineHeight: 18, color: ON_ORANGE_MUTED },
  zoneMeta: { fontFamily: fonts.semibold, fontWeight: "600", marginBottom: 8 },
  bar: { marginTop: BAR_GAP },
  zoneText: { position: "absolute", left: ZONE_TEXT_X },
  zoneTitle: { fontFamily: fonts.extrabold, letterSpacing: -0.7 },
  edgeLine: { position: "absolute", left: 0, top: 0, height: 0 },
  // Pip's box ends on the edge line; PipOnEdge hangs his hidden part below it
  pipFoot: { position: "absolute", bottom: 0 },
  sheet: { position: "absolute", left: 0, right: 0, top: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  // the content is cut by the sheet's own round corners
  body: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: "hidden" },
  content: { paddingTop: SHEET_PAD_TOP, paddingHorizontal: space.screenX, paddingBottom: DOCK_FADE, flexGrow: 1 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: DOCK_FADE },
  topFade: { position: "absolute", left: 0, right: 0, top: 0, height: TOP_FADE },
  dock: { paddingHorizontal: space.screenX, paddingTop: DOCK_PAD_TOP },
  // space-between: with no "Back" the disc is at the left and the pill at the right; with no disc the pill stays right
  dockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56 },
  pill: { width: 158 },
  // the card's own button: never narrower than the pill, and as wide as its label needs (the text is never cut)
  pillOwn: { minWidth: 158, flexShrink: 0 },
  pillAlone: { marginLeft: "auto" },
});
