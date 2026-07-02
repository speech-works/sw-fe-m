// StoryPractice.tsx (Redesigned)
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import {
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";

import DonePractice from "../../../components/DonePractice";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";


// Tools
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome"; // Updated import
import { DAFTool, useDAF } from "../../../../Tools/DAF"; // Updated import
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "./components/SmartRecorder";
import RecorderTools from "./components/RecorderTools";
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
import { useStoryPractice } from "./useStoryPractice";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";

const StoryPractice = () => {
  const { state, actions } = useStoryPractice();
  const { colors } = useTheme();
  const accent = readingPracticeAccents.story;
  const accentColor = colors.accent[accent];
  const onAccentColor = colors.accentOn[accent];
  const highlightColor = withAlpha(onAccentColor, 0.14);
  /* State Destructuring */
  const {
    practiceComplete,
    currentStory,
    pages,
    currentPage,
    highlightRange,
    currentActivityId,
    isStarting,
    selectedPracticeTool,
    activeToolSheet,
    voiceRecordingUri,
    hasHydrated,
    isLoading,
    hardMode,
    canUseHardMode,
  } = state;

  const route = useRoute<RDPStackRouteProp<"StoryPractice">>();
  const { packContext, from } = route.params || {};
  const navigation = useNavigation<RDPStackNavigationProp<"StoryPractice">>();

  // --- VoiceHover Config State ---
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // --- Persistent Tool State (Hooks) ---
  // Mute logic if tool is NOT selected. If selected, logic runs regardless of sheet visibility.
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME,
  );
  const dafState = useDAF(selectedPracticeTool !== ToolType.DAF);

  // Over-reliance guardrails: consent gate, usage tracking, activity-start nudge.
  const {
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

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: practiceComplete,
    onSave: actions.onDonePress,
    family: "Reading",
    from,
    packContext,
    accentColor,
    onAccentColor,
  });

  // --- Rendering Helpers ---

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
      actions.setSelectedPracticeTool("");
    }
    actions.setActiveToolSheet(null);
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
                  actions.setSelectedPracticeTool(ToolType.DAF);
                  actions.setActiveToolSheet(null);
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
                actions.setSelectedPracticeTool(ToolType.METRONOME);
                actions.setActiveToolSheet(null);
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
                actions.setSelectedPracticeTool(ToolType.CHORUS);
                actions.setActiveToolSheet(null);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  const proceedToolSelect = (toolName: string) => {
    if (selectedPracticeTool && selectedPracticeTool !== toolName) {
      stopTool(selectedPracticeTool);
    }

    actions.setSelectedPracticeTool(toolName);
    actions.setActiveToolSheet(toolName);
  };

  const handleToolSelect = (toolName: string) => {
    if (isToolActive(toolName)) {
      stopTool(toolName);
      return;
    }

    // First-time educational consent gate for monitored fluency aids.
    if (!requireConsent(toolName)) return;

    proceedToolSelect(toolName);
  };

  const runStart = async () => {
    actions.setIsStarting(true);
    try {
      await actions.markActivityStart();
    } catch (error) {
      console.error("[StoryPractice] ❌ Error in markActivityStart:", error);
    } finally {
      actions.setIsStarting(false);
    }
  };

  // --- Main Render ---

  if (practiceComplete) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.READING_PRACTICE}
        practiceName="story practice"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={
          packContext
            ? () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("PackModule", {
                    packId: packContext.packId,
                    moduleId: packContext.moduleId,
                    initialBlockIndex: packContext.blockIndex,
                  });
                }
              }
            : undefined
        }
        from={from}
      />
    );
  }

  // Pre-Practice (Tips) View
  if (!currentActivityId) {
    return (
      <Page
        title="Story Practice"
        description="Develop stamina and narrative flow through engaging stories."
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : actions.onBackPress()
        }
        footer={
          <Button
            label="Start Practice"
            onPress={() => runStart()}
            loading={isStarting || isLoading || !hasHydrated}
            disabled={isStarting || !hasHydrated || isLoading}
            style={
              isStarting || !hasHydrated || isLoading
                ? undefined
                : { backgroundColor: accentColor }
            }
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
          onValueChange={actions.setHardMode}
          canUseHardMode={canUseHardMode}
          accent={accent}
        />

        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <DSText variant="h3" color="primary" style={styles.tipsHeading}>Tips</DSText>
          {readingTips.story.map((tip, index, arr) => (
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

  // Calculate dynamic bottom padding based on recorder state
  // Idle: ~60px dock + spacing -> 120px safe
  // Expanded: ~80px wave + 100px controls + spacing -> 300px safe
  // We can't easily access internal VoiceRecorder mode, but we know if we have a URI it shows "Finish".
  // Actually, VoiceRecorder expands when we interact.
  // The safest bet is: Always ample padding, OR if we want to be fancy, just use a large padding (350) which is safe for max expansion.
  // Given the "Immersive" goal, having extra scroll space at bottom is fine. // Ultra-compact clearance, allows slight overlap with dock for tight feel

  // Active Practice View — the shared "Clean Focus" reading stage (logic intact).
  return (
    <>
      <ReadingStage
        title="Story Practice"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : actions.onBackPress()
        }
        category="STORY"
        align="top"
        accent={accentColor}
        onAccent={onAccentColor}
        onNext={actions.toggleIndex}
        pagination={{
          page: currentPage,
          count: pages.length,
          onPrev: () => actions.setCurrentPage((p) => Math.max(0, p - 1)),
          onNext: () =>
            actions.setCurrentPage((p) => Math.min(pages.length - 1, p + 1)),
        }}
        focus={{
          active: hardMode,
          canUse: canUseHardMode,
          onToggle: actions.setHardMode,
        }}
        dock={
          <SmartRecorder
            onRecorded={actions.setVoiceRecordingUri}
            onToggle={actions.toggleIndex}
            prevRecordingUri={voiceRecordingUri || undefined}
            onSubmit={async () => {
              actions.setIsLoading(true);
              try {
                await actions.onDonePress();
              } finally {
                actions.setIsLoading(false);
              }
            }}
            onDiscard={() => {
              actions.setVoiceRecordingUri(null);
            }}
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
              {currentStory?.title}
            </DSText>
            <DSText variant="bodySm" color={withAlpha(onAccentColor, 0.68)} center>
              — {currentStory?.author}
            </DSText>
          </View>

          {/* VoiceHover drives the highlight; the component itself is hidden. */}
          {selectedPracticeTool === ToolType.CHORUS && (
            <View style={{ height: 0, overflow: "hidden" }}>
              <VoiceHover
                text={pages[currentPage] || ""}
                onHighlightChange={(s, l) => actions.setHighlightRange([s, l])}
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
      <Sheet visible={!!activeToolSheet} onClose={() => actions.setActiveToolSheet(null)}>
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

export default StoryPractice;

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
