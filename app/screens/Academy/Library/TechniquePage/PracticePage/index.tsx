import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, { useAnimatedScrollHandler } from "react-native-reanimated";

import { getTechniquePractice } from "../../../../../api/library";
import {
  EXERCISE_ITEM_TYPE_ENUM,
  PracticeMode,
  TechniquePracticeItem,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import PressableScale from "../../../../../components/PressableScale";

// Components
import { ToolType } from "../../../../../api/tools/types";
import { DAFTool, useDAF } from "../../../Tools/DAF";
import { VoiceHover } from "../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import Metronome, { useMetronome } from "../components/Metronome";
import SmartRecorder from "../../../DailyPractice/pages/ReadingPractice/StoryPractice/components/SmartRecorder";
import RecorderTools from "../../../DailyPractice/pages/ReadingPractice/StoryPractice/components/RecorderTools";
import {
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  space,
  zIndex,
  Sheet,
  FloatingControls,
  FloatingControlItem,
  floatingControlSurface,
  FLOATING_CONTROL_SIZE,
} from "../../../../../design-system";

interface PracticePageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
  header?: React.ReactNode;
  outerScrollY?: Animated.SharedValue<number>;
}

/** First-paint estimate of the fixed cluster (control stack + dock); replaced by the
 *  measured value on layout so the scroll always reserves the exact right space. */
const CLUSTER_ESTIMATE = 280;
/** Above this length an item reads as a passage, not a line — see `textStyleFor`. */
const PASSAGE_CHARS = 120;
/** Only items this short are vertically centred; longer ones top-align so they can
 *  never overflow a centred (flex-resolved) box and become unreachable. */
const CENTERABLE_CHARS = 60;

const isPassage = (item?: TechniquePracticeItem) =>
  item?.type !== EXERCISE_ITEM_TYPE_ENUM.WORD &&
  (item?.text?.length ?? 0) > PASSAGE_CHARS;

/**
 * Reading size follows the item, matching the standalone reading screens
 * (word 48 · line 26 · passage 19). A single 42pt hero size applied to a full
 * passage is what pushed the text off both ends of the stage.
 */
const textStyleFor = (item?: TechniquePracticeItem) => {
  if (item?.type === EXERCISE_ITEM_TYPE_ENUM.WORD) return styles.textWord;
  return isPassage(item) ? styles.textPassage : styles.textLine;
};

const PracticePage = ({
  techniqueId,
  header,
  outerScrollY,
}: PracticePageProps) => {
  const { colors } = useTheme();
  // Data State
  const [mode, setMode] = useState<PracticeMode>("READ_ALOUD");
  const [reflectionPrompt, setReflectionPrompt] = useState<string>("");
  const [exerciseItems, setExerciseItems] = useState<TechniquePracticeItem[]>(
    [],
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [completedItems, setCompletedItems] = useState<
    Array<TechniquePracticeItem>
  >([]);

  // Tool State
  const [selectedPracticeTool, setSelectedPracticeTool] = useState<string>("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // Recorder State
  const [voiceRecordingUri, setVoiceRecordingUri] = useState<string | null>(
    null,
  );

  // Measured height of the fixed cluster (control stack + dock), so the scroll can
  // reserve exactly enough room for the last line to clear the whole scrim fade.
  const [clusterH, setClusterH] = useState(CLUSTER_ESTIMATE);

  // Drives the parent's collapsing header (it owns the shared header above the pager).
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (outerScrollY) outerScrollY.value = e.contentOffset.y;
    },
  });

  // A new item always starts at its first line — never mid-passage where the last
  // one left off. Also re-shows the header, which follows this scroll offset.
  const scrollRef = useRef<Animated.ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (outerScrollY) outerScrollY.value = 0;
  }, [selectedIndex, outerScrollY]);

  // VoiceHover Config
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // Tool Hooks (for internal state management)
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME,
  );
  const dafState = useDAF(selectedPracticeTool !== ToolType.DAF);

  useEffect(() => {
    let cancelled = false;
    const fetchPractice = async () => {
      try {
        const res = await getTechniquePractice(techniqueId);
        if (cancelled) return;
        setMode(res.mode);
        setReflectionPrompt(res.reflectionPrompt ?? "");
        setExerciseItems(res.items ?? []);
        setSelectedIndex(0);
        setCompletedItems([]);
      } catch (e) {
        console.error("Failed to load technique practice", e);
      }
    };
    fetchPractice();
    return () => {
      cancelled = true;
    };
  }, [techniqueId]);

  const currentItem = exerciseItems[selectedIndex];

  // Actions
  const handleNext = () => {
    if (exerciseItems && exerciseItems.length > 0) {
      // Mark current as complete
      if (currentItem) {
        setCompletedItems((old) => [...old, currentItem]);
      }

      // Move to next
      setSelectedIndex((prevIndex) => (prevIndex + 1) % exerciseItems.length);

      // Reset states
      setVoiceRecordingUri(null);
      setVhIsPlaying(false);
    }
  };

  // Stepping back is pure navigation — unlike `handleNext` it does NOT mark the
  // item complete, so re-reading something never inflates the done count.
  const handlePrev = () => {
    if (selectedIndex <= 0) return;
    setSelectedIndex((prevIndex) => prevIndex - 1);
    setVoiceRecordingUri(null);
    setVhIsPlaying(false);
  };

  const onDeckLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - clusterH) > 1) setClusterH(h);
  };

  const isToolActive = (toolName: string) =>
    (toolName === ToolType.DAF &&
      selectedPracticeTool === toolName &&
      dafState.isDAFActive) ||
    (toolName === ToolType.CHORUS &&
      selectedPracticeTool === toolName &&
      vhIsPlaying) ||
    (toolName === ToolType.METRONOME &&
      selectedPracticeTool === toolName &&
      metronomeState.isPlaying);

  const stopTool = (toolName: string) => {
    if (toolName === ToolType.DAF && dafState.isDAFActive) {
      dafState.stopDAF();
    } else if (toolName === ToolType.METRONOME && metronomeState.isPlaying) {
      metronomeState.setIsPlaying(false);
    } else if (toolName === ToolType.CHORUS && vhIsPlaying) {
      setVhIsPlaying(false);
    }

    if (selectedPracticeTool === toolName) {
      setSelectedPracticeTool("");
    }
    setActiveToolSheet(null);
  };

  const handleToolSelect = (toolName: string) => {
    if (isToolActive(toolName)) {
      stopTool(toolName);
      return;
    }

    if (selectedPracticeTool && selectedPracticeTool !== toolName) {
      stopTool(selectedPracticeTool);
    }

    setSelectedPracticeTool(toolName);
    setActiveToolSheet(toolName);
  };

  // Renderers
  const renderToolSheetContent = () => {
    switch (activeToolSheet) {
      case ToolType.DAF:
        return (
          <DAFTool
            isDAFActive={dafState.isDAFActive}
            onToggleDAF={() => {
              void (async () => {
                if (dafState.isDAFActive) {
                  dafState.stopDAF();
                  return;
                }

                const started = await dafState.startDAF();
                if (started) {
                  setSelectedPracticeTool(ToolType.DAF);
                  setActiveToolSheet(null);
                }
              })();
            }}
            delayMs={dafState.delayMs}
            onDelayChange={dafState.setDelayMs}
            hasPermission={dafState.hasPermission}
            statusMessage={dafState.statusMessage}
            headsetConnected={dafState.headsetConnected}
            showHeadsetPrompt={dafState.showHeadsetPrompt}
            onDismissHeadsetPrompt={() => dafState.setShowHeadsetPrompt(false)}
            onRecheckHeadset={() => {
              void dafState.updateHeadsetStatus(true);
            }}
          />
        );
      case ToolType.METRONOME:
        return (
          <Metronome
            isPlaying={metronomeState.isPlaying}
            onTogglePlay={(val) => {
              metronomeState.setIsPlaying(val);
              if (val) {
                setSelectedPracticeTool(ToolType.METRONOME);
                setActiveToolSheet(null);
              }
            }}
            speed={metronomeState.speed}
            onSpeedChange={(val) => metronomeState.setSpeed(val)}
          />
        );
      case ToolType.CHORUS:
        return (
          <VoiceHoverConfigPanel
            baseRate={vhRate}
            setBaseRate={setVhRate}
            prePause={vhPrePause}
            setPrePause={setVhPrePause}
            gapBetweenChunks={vhGap}
            setGapBetweenChunks={setVhGap}
            isSpeaking={vhIsPlaying}
            onToggleSpeech={() => {
              const nextIsPlaying = !vhIsPlaying;
              setVhIsPlaying(nextIsPlaying);
              if (nextIsPlaying) {
                setSelectedPracticeTool(ToolType.CHORUS);
                setActiveToolSheet(null);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  // Cognitive / acceptance / desensitization techniques: a word drill is
  // clinically wrong here, so Practice is a single reflection prompt — no
  // reading list, no mic, no fluency tools (which also honours the
  // effort-not-fluency guardrail).
  if (mode === "REFLECTION") {
    return (
      <View style={styles.container}>
        <Animated.ScrollView
          contentContainerStyle={[styles.scrollContent, styles.reflectionScroll]}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {header}
          <View style={styles.stage}>
            <Text
              variant="label"
              color={colors.accentText.info}
              style={styles.eyebrow}
            >
              REFLECT
            </Text>
            <View
              style={[
                styles.reflectionCard,
                {
                  backgroundColor: colors.surface.control,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <Icon
                name={icons.star}
                size={22}
                color={colors.text.accent}
              />
              <Text
                variant="h3"
                color="primary"
                style={styles.reflectionText}
              >
                {reflectionPrompt || "Take a quiet moment with this technique."}
              </Text>
            </View>
            <Text variant="bodySm" color="secondary" style={styles.reflectionHint}>
              Nothing to record — this one is just for you.
            </Text>
          </View>
        </Animated.ScrollView>
      </View>
    );
  }

  const canCenter =
    currentItem?.type === EXERCISE_ITEM_TYPE_ENUM.WORD ||
    (currentItem?.text?.length ?? 0) <= CENTERABLE_CHARS;
  // The last line has to clear the WHOLE fixed cluster — controls and dock — so the
  // end of a passage is readable in the clear, not parked under the mic pill.
  const bottomReserve = clusterH + spacing["4xl"];
  const itemLabel = (currentItem?.type || "ITEM").toUpperCase();
  // One <Text> per paragraph: real paragraph rhythm for a long passage, and it keeps
  // each text node a size iOS measures reliably (one 5k-character node does not).
  const paragraphs = (currentItem?.text || "Loading...")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const controls: FloatingControlItem[] = [
    {
      // items[0] sits closest to the thumb — item navigation is the primary control.
      key: "pager",
      render: (
        <View
          style={[
            styles.pager,
            { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow },
          ]}
        >
          <PressableScale
            onPress={selectedIndex <= 0 ? undefined : handlePrev}
            style={[styles.pagerBtn, selectedIndex <= 0 && styles.pagerOff]}
            accessibilityLabel="Previous item"
          >
            <Icon name="chevron-up" size={20} color={colors.text.accent} />
          </PressableScale>
          <Text variant="label" color="secondary" style={styles.pagerCount}>
            {selectedIndex + 1}/{exerciseItems.length || "?"}
          </Text>
          <PressableScale
            onPress={handleNext}
            style={styles.pagerBtn}
            accessibilityLabel="Next item"
          >
            <Icon name="chevron-down" size={20} color={colors.text.accent} />
          </PressableScale>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {/* SCROLLING reading surface — nothing interactive lives here, so no content
          length can move a control (the shared "Clean Focus" split). */}
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          canCenter && styles.scrollContentCenter,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {header}
        <View
          style={[
            styles.stage,
            canCenter && styles.stageCenter,
            isPassage(currentItem) && styles.stageStretch,
          ]}
        >
          <Text variant="label" color={colors.accentText.info} style={styles.eyebrow}>
            {completedItems.length > 0
              ? `${itemLabel} · ${completedItems.length} DONE`
              : itemLabel}
          </Text>

          <View
            style={[
              styles.wordWrapper,
              isPassage(currentItem) && styles.wordWrapperInset,
            ]}
          >
            {selectedPracticeTool === ToolType.CHORUS && (
              <View
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <VoiceHover
                  text={currentItem?.text || ""}
                  rate={vhRate}
                  prePause={vhPrePause}
                  gap={vhGap}
                  isPlaying={vhIsPlaying}
                  onComplete={() => setVhIsPlaying(false)}
                />
              </View>
            )}
            {paragraphs.map((para, i) => (
              <Text
                key={i}
                variant={currentItem?.type === "WORD" ? "h1" : "h2"}
                color="primary"
                style={[
                  textStyleFor(currentItem),
                  i > 0 && styles.paragraphGap,
                ]}
              >
                {para}
              </Text>
            ))}
          </View>
        </View>

        {/* Explicit spacer, not padding — iOS miscalculates flex padding inside a
            flexGrow content container and bounces the last lines back. */}
        <View style={{ height: bottomReserve }} />
      </Animated.ScrollView>

      {/* FIXED control stack + dock — measured; nothing here ever moves. */}
      <View style={styles.deckFloat} pointerEvents="box-none" onLayout={onDeckLayout}>
        <FloatingControls inline items={controls} style={styles.deckStack} />
        <SmartRecorder
          onRecorded={setVoiceRecordingUri}
          prevRecordingUri={voiceRecordingUri || undefined}
          onSubmit={handleNext}
          onDiscard={() => setVoiceRecordingUri(null)}
          renderTools={() => (
            <RecorderTools
              activeToolId={selectedPracticeTool}
              isDafActive={dafState.isDAFActive}
              isGuideActive={vhIsPlaying}
              isTempoActive={metronomeState.isPlaying}
              onSelect={handleToolSelect}
            />
          )}
        />
      </View>

      {/* Settings Modal */}
      <Sheet
        visible={!!activeToolSheet}
        onClose={() => setActiveToolSheet(null)}
      >
        <Text variant="h2" center style={styles.sheetTitle}>
          {activeToolSheet === ToolType.CHORUS
            ? "Guide Settings"
            : `${activeToolSheet} Settings`}
        </Text>
        {renderToolSheetContent()}
      </Sheet>
    </View>
  );
};

export default PracticePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  reflectionCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    alignItems: "flex-start",
  },
  reflectionText: {
    lineHeight: 28,
  },
  reflectionHint: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
  // Reflection has no dock, so it reserves a plain bottom pad instead of a cluster.
  reflectionScroll: {
    paddingBottom: spacing["4xl"],
  },
  scrollContent: {
    paddingHorizontal: space.screenX,
  },
  // flexGrow ONLY for short items that vertically centre. On a long passage it makes
  // the content container resolve against the viewport, so the ScrollView reports a
  // contentSize far shorter than the text really is and the tail becomes unreachable.
  scrollContentCenter: {
    flexGrow: 1,
  },
  // Natural top-aligned flow by default so long items measure their TRUE height and
  // scroll fully. `stageCenter` adds flexGrow only for short items that can never
  // overflow — a flexGrow child inside a flexGrow scroll container is flex-resolved
  // to the viewport height, which clips overflow at BOTH ends and kills scroll.
  stage: {
    alignItems: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing["3xl"],
  },
  stageCenter: {
    flexGrow: 1,
    justifyContent: "center",
  },
  stageStretch: {
    alignItems: "stretch",
  },
  eyebrow: {
    letterSpacing: 1.2,
  },

  wordWrapper: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  // A passage runs the full height of the scroll, so it would otherwise pass BEHIND
  // the floating control stack and lose two words a line. Reserve the stack's gutter
  // so every line stays fully readable all the way down to the dock. Short items are
  // centred well clear of the controls and keep the full width.
  wordWrapperInset: {
    paddingRight: FLOATING_CONTROL_SIZE + spacing.md,
    alignItems: "stretch",
  },
  textWord: {
    textAlign: "center",
    fontSize: 48,
    lineHeight: 56,
  },
  textLine: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 38,
  },
  // Long passages read left-aligned — centred ragged text over many lines is hard
  // to track back to at the start of each line.
  textPassage: {
    textAlign: "left",
    fontSize: 19,
    lineHeight: 32,
  },
  paragraphGap: {
    marginTop: spacing.xl,
  },

  // Fixed cluster
  deckFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: zIndex.sticky + 1,
  },
  deckStack: {
    alignSelf: "stretch",
    paddingRight: space.screenX,
    marginBottom: spacing.md,
  },
  // Vertical pager pill — same footprint as the icon FABs, taller to house
  // prev / count / next in one control (matches the reading screens).
  pager: {
    ...floatingControlSurface,
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  pagerBtn: {
    width: FLOATING_CONTROL_SIZE,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerOff: {
    opacity: 0.3,
  },
  pagerCount: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  // Sheet
  sheetTitle: {
    marginBottom: spacing.xl,
  },
});
