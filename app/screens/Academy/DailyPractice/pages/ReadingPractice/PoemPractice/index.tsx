import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";

import DonePractice from "../../../components/DonePractice";


// Tools
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "../StoryPractice/components/SmartRecorder"; // Reuse SmartRecorder
import RecorderTools from "../StoryPractice/components/RecorderTools";
import { ReadingStage } from "../shared/ReadingStage";
import HardModeToggle from "../../../components/HardModeToggle";

import { ToolType } from "../../../../../../api/tools/types";
import {
  Page,
  Button,
  Text as DSText,
  Sheet,
  useTheme,
  spacing,
  withAlpha,
} from "../../../../../../design-system";
import { readingPracticeAccents, readingTips } from "../data";

// API & Stores
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUIStore } from "../../../../../../stores/ui";
import { useUserStore } from "../../../../../../stores/user";
import { toPascalCase } from "../../../../../../util/functions/strings";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";

const PoemPractice = () => {
  const navigation = useNavigation<RDPStackNavigationProp<"PoemPractice">>();
  const { colors } = useTheme();
  const accent = readingPracticeAccents.poem;
  const accentColor = colors.accent[accent];
  const onAccentColor = colors.accentOn[accent];
  const highlightColor = withAlpha(onAccentColor, 0.14);
  const { setTabBarVisible } = useUIStore();
  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  // --- State ---
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allPoems, setAllPoems] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hardMode, setHardMode] = useState(false);
  const canUseHardMode = (user?.fearedSounds?.length ?? 0) > 0;
  const route = useRoute<RDPStackRouteProp<"PoemPractice">>();
  const packContext = route.params?.packContext;
  const from = route.params?.from;

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Highlight Range
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  // Tool State
  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // VoiceHover Config State
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // Persistent Tool Hooks
  // Mute logic if tool is NOT selected
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME,
  );
  const dafState = useDAF(selectedPracticeTool !== ToolType.DAF);

  // Over-reliance guardrails: consent gate, usage tracking, activity-start nudge.
  // `consumeToolsUsed` feeds the completion payload.
  const {
    consumeToolsUsed,
    consentTool,
    requireConsent,
    acknowledgeConsent,
    toolNudge,
    nudgeVisible,
    handleNudgeTryWithout,
    handleNudgeDismiss,
    focusMode,
    toolsExpanded,
    setToolsExpanded,
  } = useToolGuardrails(currentActivityId, {
    [ToolType.DAF]: dafState.isDAFActive,
    [ToolType.METRONOME]: metronomeState.isPlaying,
    [ToolType.CHORUS]: vhIsPlaying,
  });

  // --- Effects ---
  // Hide Tab Bar
  useFocusEffect(
    useCallback(() => {
      setTabBarVisible(false);
      return () => {
        setTabBarVisible(true);
      };
    }, [setTabBarVisible]),
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAllPoems = async () => {
      try {
        setIsLoading(true);
        const p = await getReadingPracticeByType(ReadingPracticeType.POEM, hardMode);
        setAllPoems(p);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = p.findIndex((poem) => poem.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(`[PoemPractice] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`);
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error("❌ Error fetching poems:", error);
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPoems();
  }, [hardMode]);

  useEffect(() => {
    const currentText = allPoems[selectedIndex]?.textContent || "";
    // Simple pagination split
    const paginated = currentText
      .split(/\n\s*\n/)
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
    setPages(paginated);
    setCurrentPage(0);
  }, [selectedIndex, allPoems]);



  // --- Actions ---

  const onBackPress = () =>
    from === "MOOD_CHECK"
      ? navigation.navigate("Root" as any, { screen: "HOME" })
      : navigation.goBack();

  const toggleIndex = () => {
    if (allPoems && allPoems.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allPoems.length);
    }
  };

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.READING_PRACTICE,
    contentId: allPoems[selectedIndex]?.id,
    contentTitle: allPoems[selectedIndex]?.title,
    initialActivity: (route.params as any)?.practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    onEarlyExit: () => setIsStarting(false),
    navigation,
    logTag: "PoemPractice",
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(">> PoemPractice: Missing userId, cannot complete activity");
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      toolsUsed: consumeToolsUsed(),
    });

    // Track activity completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      activityId,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allPoems[selectedIndex]?.title,
      isPackContext: !!packContext?.packId
    });

    updateActivity(activityId, { ...completedActivity });
    useUserStore.getState().fetchUser();
  };

  const onDonePress = async () => {
    if (!currentActivityId) return;
    await markActivityComplete(currentActivityId);
    await submitVoiceRecording({
      recordingSource: RecordingSourceType.ACTIVITY,
      activityId: currentActivityId,
    });
    setPracticeComplete(true);

    if (packContext && navigation.canGoBack()) {
      navigation.goBack();
    } else if (packContext) {
      navigation.navigate("PackModule", {
        packId: packContext.packId,
        moduleId: packContext.moduleId,
        initialBlockIndex: packContext.blockIndex,
      });
    }
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

  const proceedToolSelect = (toolName: string) => {
    if (selectedPracticeTool && selectedPracticeTool !== toolName) {
      stopTool(selectedPracticeTool);
    }

    setSelectedPracticeTool(toolName);
    setActiveToolSheet(toolName);
  };

  const handleToolSelect = (toolName: string) => {
    if (isToolActive(toolName)) {
      stopTool(toolName);
      return;
    }

    if (!requireConsent(toolName)) return;

    proceedToolSelect(toolName);
  };

  const runStart = async () => {
    setIsStarting(true);
    try {
      await markActivityStart();
    } catch (error) {
      console.error("❌ Error starting activity:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // --- Render Helpers ---

  const renderHighlightedText = () => {
    const practiceText = pages[currentPage] || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return (
        <DSText variant="body" color={onAccentColor} style={styles.readingText}>
          {practiceText}
        </DSText>
      );
    }
    const before = practiceText.slice(0, start);
    const word = practiceText.slice(start, start + length);
    const after = practiceText.slice(start + length);

    return (
      <DSText variant="body" color={onAccentColor} style={styles.readingText}>
        {before}
        <RNText
          style={{
            backgroundColor: highlightColor,
            color: onAccentColor,
          }}
        >
          {word}
        </RNText>
        {after}
      </DSText>
    );
  };

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
            accentColor={accentColor}
            onAccentColor={onAccentColor}
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
            accentColor={accentColor}
            onAccentColor={onAccentColor}
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
            accentColor={accentColor}
            onAccentColor={onAccentColor}
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
 // Ultra-compact clearance, allows slight overlap with dock for tight feel

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: practiceComplete,
    onSave: onDonePress,
    family: "Reading",
    from,
    packContext,
    accentColor,
    onAccentColor,
  });

  // --- View: Done Practice ---
  if (practiceComplete) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.READING_PRACTICE}
        practiceName="poem practice"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={
          packContext
            ? () =>
              navigation.navigate("PackModule", {
                packId: packContext.packId,
                moduleId: packContext.moduleId,
                initialBlockIndex: packContext.blockIndex,
              })
            : undefined
        }
        from={from}
      />
    );
  }

  // --- View: Pre-Practice (Tips) ---
  if (!currentActivityId) {
    return (
      <Page
        title="Poem Practice"
        description="Find your rhythm and express emotion through the art of poetry."
        onBack={onBackPress}
        footer={
          <Button
            label="Start Practice"
            onPress={() => runStart()}
            loading={isStarting || isLoading}
            disabled={isStarting || isLoading}
            style={isStarting || isLoading ? undefined : { backgroundColor: accentColor }}
          />
        }
      >
        {nudgeVisible && toolNudge && (
          <ToolNudge
            directive={toolNudge}
            onTryWithout={() => handleNudgeTryWithout(runStart)}
            onDismiss={handleNudgeDismiss}
          />
        )}

        <HardModeToggle
          value={hardMode}
          onValueChange={setHardMode}
          canUseHardMode={canUseHardMode}
          accent={accent}
        />

        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <DSText variant="h3" color="primary" style={styles.tipsHeading}>Tips</DSText>
          {readingTips.poem.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View style={[styles.tipDot, { backgroundColor: accentColor }]} />
                {index !== arr.length - 1 && (
                  <View style={[styles.tipLine, { backgroundColor: colors.border.default }]} />
                )}
              </View>
              <DSText variant="body" color="secondary" style={styles.tipText}>
                {tip}
              </DSText>
            </View>
          ))}
        </View>
      </Page>
    );
  }

  // --- View: Active Practice — the shared "Clean Focus" reading stage (logic intact). ---
  return (
    <>
      <ReadingStage
        title="Poem Practice"
        onBack={onBackPress}
        category="POEM"
        align="top"
        accent={accentColor}
        onAccent={onAccentColor}
        onNext={toggleIndex}
        pagination={{
          page: currentPage,
          count: pages.length,
          onPrev: () => setCurrentPage((p) => Math.max(0, p - 1)),
          onNext: () => setCurrentPage((p) => Math.min(pages.length - 1, p + 1)),
        }}
        focus={{
          active: hardMode,
          canUse: canUseHardMode,
          onToggle: setHardMode,
        }}
        dock={
          <SmartRecorder
            onRecorded={setVoiceRecordingUri}
            onToggle={toggleIndex}
            prevRecordingUri={voiceRecordingUri || undefined}
            onSubmit={async () => {
              setIsLoading(true);
              try {
                await onDonePress();
              } finally {
                setIsLoading(false);
              }
            }}
            onDiscard={() => setVoiceRecordingUri(null)}
            accentColor={accentColor}
            onAccentColor={onAccentColor}
            renderTools={() => (
              <RecorderTools
                activeToolId={selectedPracticeTool}
                isDafActive={dafState.isDAFActive}
                isGuideActive={vhIsPlaying}
                isTempoActive={metronomeState.isPlaying}
                onSelect={handleToolSelect}
                focusMode={focusMode}
                expanded={toolsExpanded}
                onExpand={() => setToolsExpanded(true)}
                accentColor={accentColor}
                onAccentColor={onAccentColor}
              />
            )}
          />
        }
      >
        <View style={styles.readingBlock}>
          <View style={styles.metaHead}>
            <DSText variant="h2" color={onAccentColor} center>
              {allPoems[selectedIndex]?.title}
            </DSText>
            <DSText variant="bodySm" color={withAlpha(onAccentColor, 0.68)} center>
              — {allPoems[selectedIndex]?.author} · Level{" "}
              {toPascalCase(allPoems[selectedIndex]?.difficulty)}
            </DSText>
          </View>

          {/* VoiceHover drives the highlight; the component itself is hidden. */}
          {selectedPracticeTool === ToolType.CHORUS && (
            <View style={{ height: 0, overflow: "hidden" }}>
              <VoiceHover
                text={pages[currentPage] || ""}
                onHighlightChange={(s, l) => setHighlightRange([s, l])}
                rate={vhRate}
                prePause={vhPrePause}
                gap={vhGap}
                isPlaying={vhIsPlaying}
                onComplete={() => setVhIsPlaying(false)}
              />
            </View>
          )}
          {renderHighlightedText()}

        </View>
      </ReadingStage>

      {/* Detail Sheet for Tools */}
      <Sheet visible={!!activeToolSheet} onClose={() => setActiveToolSheet(null)}>
        <DSText variant="h2" center style={styles.sheetTitle}>
          {activeToolSheet === ToolType.CHORUS
            ? "Guide Settings"
            : `${activeToolSheet} Settings`}
        </DSText>
        {renderToolSheetContent()}
      </Sheet>

      <ToolConsentModal
        visible={consentTool !== null}
        tool={consentTool}
        onAcknowledge={() => acknowledgeConsent(proceedToolSelect)}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </>
  );
};

export default PoemPractice;

const styles = StyleSheet.create({
  readingBlock: {
    width: "100%",
    gap: spacing["2xl"],
  },
  metaHead: {
    alignItems: "center",
    gap: spacing.xs,
  },

  // Reading Mode Styles
  readingText: {
    lineHeight: 32, // More breathability
    fontSize: 18,
  },

  // Action Dock
  // Sheet (renders on the shared DS Sheet's dark surface)
  sheetTitle: {
    marginBottom: spacing.xl,
  },
  // Pre-practice tips (dark)
  tipsHeading: {
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
  },
  tipTrack: {
    alignItems: "center",
    width: 20,
    marginRight: spacing.lg,
  },
  tipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
  },
  tipLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  tipText: {
    flex: 1,
    paddingBottom: spacing["2xl"],
    lineHeight: 24,
  },
});
