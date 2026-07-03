import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";

import DonePractice from "../../../components/DonePractice";

import SmartRecorder from "../../ReadingPractice/StoryPractice/components/SmartRecorder";
import RecorderTools from "../../ReadingPractice/StoryPractice/components/RecorderTools";
import { ReadingStage } from "../../ReadingPractice/shared/ReadingStage";
import HardModeToggle from "../../../components/HardModeToggle";

import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import {
  Page,
  Button,
  Text,
  useTheme,
  spacing,
  Sheet,
  withAlpha,
} from "../../../../../../design-system";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";

import { ToolType } from "../../../../../../api/tools/types";
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";

import {
  TwisterFDPStackNavigationProp,
  TwisterFDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/TwisterPracticeStack/types";

const Twister = () => {
  const navigation =
    useNavigation<TwisterFDPStackNavigationProp<"TwisterExercise">>();
  const { colors } = useTheme();
  // Tongue Twisters = the "success" (green) accent on the Fun Practice list; the
  // whole practice inherits that identity (like CVExercise's purple) so the stage,
  // focus, dock tools and done screen all read green — mirroring the reading pages.
  const accentRole = "success" as const;
  const accentColor = colors.accent[accentRole];
  const onAccentColor = colors.accentOn[accentRole];
  const highlightColor = withAlpha(onAccentColor, 0.14);
  const route = useRoute<TwisterFDPStackRouteProp<"TwisterExercise">>();
  const { packContext, from } = route.params || {};
  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const canUseHardMode = (user?.fearedSounds?.length ?? 0) > 0;
  const {
    voiceRecordingUri,
    setVoiceRecordingUri,
    submitVoiceRecording,
    resetRecording,
  } = useRecordedVoice(user?.id);

  const [selectedPracticeTool, setSelectedPracticeTool] = useState<string>("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // --- Tools Hooks ---
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME,
  );
  const dafState = useDAF(selectedPracticeTool !== ToolType.DAF);

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

  // --- State ---
  const [twisters, setTwisters] = useState<FunPractice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hardMode, setHardMode] = useState(false);

  // --- VoiceHover Config State ---
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

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

  const runStart = async () => {
    if (!twisters || twisters.length === 0) {
      console.warn("Cannot start activity: Tongue twisters not yet loaded.");
      return;
    }
    setIsStarting(true);
    try {
      await markActivityStart();
    } finally {
      setIsStarting(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    const fetchTwisters = async () => {
      try {
        setIsLoading(true);
        const ts = await getFunPracticeByType(FunPracticeType.TONGUE_TWISTER, hardMode);
        setTwisters(ts);

        const targetId = route.params?.id;
        if (targetId && !hardMode) {
          const foundIndex = ts.findIndex((t) => t.id === targetId);
          if (foundIndex !== -1) {
            setCurrentIndex(foundIndex);
          } else {
            setCurrentIndex(0);
          }
        } else if (ts.length > 0) {
          if (!hardMode) {
            setCurrentIndex(Math.floor(Math.random() * ts.length));
          } else {
            setCurrentIndex(0);
          }
        }
      } catch (error: any) {
        console.error("Error fetching twisters:", error);
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
        setHasHydrated(true);
      }
    };
    fetchTwisters();
  }, [route.params?.id, hardMode]);

  // Hide Bottom Tab Bar unconditionally when on this screen
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // --- Actions ---

  const toggleIndex = () => {
    if (twisters && twisters.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % twisters.length);
      // Reset recording when switching
      resetRecording();
    }
  };

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.FUN_PRACTICE,
    contentId: twisters[currentIndex]?.id,
    initialActivity: route.params?.practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    // Attach the current tongue-twister to the stored activity.
    decorateActivity: (activity) => ({
      ...activity,
      funPractice: twisters[currentIndex],
    }),
    navigation,
    logTag: "Twister",
    // Twister historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(">> Twister: Missing userId, cannot complete activity");
      return;
    }

    console.log(">> Twister: Completing activity", activityId);
    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      toolsUsed: consumeToolsUsed(),
    });
    console.log(
      "<< Twister: Activity completed successfully",
      completedActivity.id,
    );
    updateActivity(activityId, {
      ...completedActivity,
      funPractice: twisters[currentIndex],
    });
    useUserStore.getState().fetchUser();

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

  const onDonePress = async () => {
    try {
      if (!currentActivityId) {
        throw new Error("Activity could not be started");
      }
      console.log(
        ">> Twister: User clicked Done, submitting recording and completing activity",
      );
      await markActivityComplete(currentActivityId);
      if (voiceRecordingUri) {
        console.log(
          ">> Twister: Submitting voice recording for activity",
          currentActivityId,
        );
        await submitVoiceRecording({
          recordingSource: RecordingSourceType.ACTIVITY,
          activityId: currentActivityId,
        });
      }
      setPracticeComplete(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  // --- Render Helpers ---

  const renderHighlightedText = () => {
    const text = twisters[currentIndex]?.tongueTwisterData?.text || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return (
        <Text variant="h2" color="primary" style={styles.readingText}>
          {text}
        </Text>
      );
    }
    const before = text.slice(0, start);
    const word = text.slice(start, start + length);
    const after = text.slice(start + length);

    return (
      <Text variant="h2" color="primary" style={styles.readingText}>
        {before}
        <RNText
          style={{
            backgroundColor: highlightColor,
            color: colors.text.primary,
          }}
        >
          {word}
        </RNText>
        {after}
      </Text>
    );
  };

  // --- Main Render ---

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: practiceComplete,
    onSave: onDonePress,
    accentColor,
    family: "Fun",
    from,
    packContext,
  });

  if (practiceComplete) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.FUN_PRACTICE}
        practiceName="tongue twister"
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

  // 1. Pre-Practice (Tips) View — DETAIL recipe on the dark canvas.
  if (!currentActivityId) {
    const tipsArray = twisters[currentIndex]?.tongueTwisterData?.hints || [
      "Start slowly and focus on clarity.",
      "Repeat the phrase faster each time.",
      "Exaggerate your mouth movements.",
    ];

    return (
      <Page
        title="Tongue Twisters"
        description="Challenge your articulation and speed with playful phonetic puzzles."
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        footer={
          <Button
            label={hasHydrated ? "Start Practice" : "Loading..."}
            onPress={() => runStart()}
            loading={isStarting || !hasHydrated}
            disabled={isStarting || !hasHydrated}
            style={
              isStarting || !hasHydrated
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
          onValueChange={setHardMode}
          canUseHardMode={canUseHardMode}
          accent={accentRole}
        />

        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <Text variant="h3" color="primary" style={styles.tipsHeading}>
            Tips
          </Text>
          {tipsArray.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View
                  style={[
                    styles.tipDot,
                    { backgroundColor: accentColor },
                  ]}
                />
                {index !== arr.length - 1 && (
                  <View
                    style={[
                      styles.tipLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                )}
              </View>
              <Text variant="body" color="secondary" style={styles.tipText}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    );
  }

  // 2. Active Practice View — the shared "Clean Focus" reading stage (logic intact).
  return (
    <>
      <ReadingStage
        title="Tongue Twister"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        category="TWISTER"
        accent={accentColor}
        onNext={toggleIndex}
        focus={{
          active: hardMode,
          canUse: canUseHardMode,
          onToggle: setHardMode,
          accentColor,
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
            onDiscard={() => {
              setVoiceRecordingUri(null);
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
        <Text variant="h2" color="primary" style={styles.titleText}>
          {twisters[currentIndex]?.name}
        </Text>
        {/* VoiceHover drives the highlight; the component itself is hidden. */}
        {selectedPracticeTool === ToolType.CHORUS && (
          <View style={{ height: 0, overflow: "hidden" }}>
            <VoiceHover
              text={twisters[currentIndex]?.tongueTwisterData?.text || ""}
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
      </ReadingStage>

      {/* Detail Sheet for Tools */}
      <Sheet visible={!!activeToolSheet} onClose={() => setActiveToolSheet(null)}>
          <Text variant="h2" center style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : activeToolSheet === ToolType.DAF
                ? "DAF Settings"
                : "Metronome Settings"}
          </Text>
          {renderToolSheetContent()}
      </Sheet>

      <ToolConsentModal
        visible={consentTool !== null}
        tool={consentTool}
        onAcknowledge={() => acknowledgeConsent(proceedToolSelect)}
      />

      {exitSheet}
    </>
  );
};

export default Twister;

const styles = StyleSheet.create({
  // Reading Mode Styles
  titleText: {
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  readingText: {
    lineHeight: 36,
    textAlign: "center",
  },

  // Tools Sheet (renders on the shared DS Sheet's dark surface)
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
