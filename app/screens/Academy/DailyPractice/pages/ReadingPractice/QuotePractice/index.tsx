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
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "../StoryPractice/components/SmartRecorder";
import RecorderTools from "../StoryPractice/components/RecorderTools";
import { ReadingStage } from "../shared/ReadingStage";
import HardModeToggle from "../../../components/HardModeToggle";
import FocusLamp from "../../../components/FocusLamp";

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
import { useQuotePractice } from "./useQuotePractice";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";

const QuotePractice = () => {
  const { state, actions } = useQuotePractice();
  const navigation = useNavigation<RDPStackNavigationProp<"QuotePractice">>();
  const { colors } = useTheme();
  const accent = readingPracticeAccents.quote;
  const accentColor = colors.accent[accent];
  const onAccentColor = colors.accentOn[accent];
  const highlightColor = withAlpha(onAccentColor, 0.14);

  /* State Destructuring */
  const {
    practiceComplete,
    currentQuote,
    currentActivityId,
    isStarting,
    selectedPracticeTool,
    activeToolSheet,
    voiceRecordingUri,
    hasHydrated,
    highlightRange,
    isLoading,
    hardMode,
    canUseHardMode,
  } = state;

  const route = useRoute<RDPStackRouteProp<"QuotePractice">>();
  const { packContext, from } = route.params || {};

  // --- VoiceHover Config State (Unused for quotes but kept for structure) ---
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // --- Persistent Tool State (Hooks) ---
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
    const practiceText = currentQuote?.textContent || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return (
        <DSText variant="h2" color={onAccentColor} style={styles.readingText}>
          {practiceText}
        </DSText>
      );
    }
    const before = practiceText.slice(0, start);
    const word = practiceText.slice(start, start + length);
    const after = practiceText.slice(start + length);

    return (
      <DSText variant="h2" color={onAccentColor} style={styles.readingText}>
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

    if (!requireConsent(toolName)) return;

    proceedToolSelect(toolName);
  };

  const runStart = async () => {
    actions.setIsStarting(true);
    try {
      await actions.markActivityStart();
    } catch (error) {
      console.error("[QuotePractice] ❌ Error in markActivityStart:", error);
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
        practiceName="quote practice"
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
        title="Quote Practice"
        description="Draw inspiration and practice expressive delivery through famous quotes."
        background={<FocusLamp focus={hardMode} />}
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
          {readingTips.quote.map((tip, index, arr) => (
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

  // Active Practice View — the shared "Clean Focus" reading stage (logic intact).
  return (
    <>
      <ReadingStage
        title="Quote Practice"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : actions.onBackPress()
        }
        category="QUOTE"
        accent={accentColor}
        onAccent={onAccentColor}
        onNext={actions.toggleIndex}
        focus={{
          active: hardMode,
          canUse: canUseHardMode,
          onToggle: actions.setHardMode,
        }}
        dock={
          <SmartRecorder
            onRecorded={actions.setVoiceRecordingUri}
            onToggle={actions.toggleIndex} // Next button logic
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
        {/* VoiceHover drives the highlight; the component itself is hidden. */}
        {selectedPracticeTool === ToolType.CHORUS && (
          <View style={{ height: 0, overflow: "hidden" }}>
            <VoiceHover
              text={currentQuote?.textContent || ""}
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
        <DSText variant="h3" color={withAlpha(onAccentColor, 0.68)} style={styles.authorText}>
          — {currentQuote?.author || "Unknown"}
        </DSText>
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

export default QuotePractice;

const styles = StyleSheet.create({
  // Reading Mode Styles
  readingText: {
    lineHeight: 36,
    fontSize: 24,
    textAlign: "center",
  },
  authorText: {
    fontStyle: "italic",
    marginTop: spacing.lg,
    textAlign: "center",
  },

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
