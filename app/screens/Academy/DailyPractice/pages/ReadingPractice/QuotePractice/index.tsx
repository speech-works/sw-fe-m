import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import {
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from "react-native";

import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import DonePractice from "../../../components/DonePractice";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";

import { useSafeAreaInsets } from "react-native-safe-area-context";

// Tools
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "../StoryPractice/components/SmartRecorder";
import HardModeToggle from "../../../components/HardModeToggle";

import { ToolType } from "../../../../../../api/tools/types";
import {
  Page,
  Button,
  Text as DSText,
  Icon,
  IconButton,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../../../../../design-system";
import { readingTips } from "../data";
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
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const HEADER_HEIGHT = 60;

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
  });

  // --- Rendering Helpers ---

  const renderHighlightedText = () => {
    const practiceText = currentQuote?.textContent || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return (
        <DSText variant="h2" color="primary" style={styles.readingText}>
          {practiceText}
        </DSText>
      );
    }
    const before = practiceText.slice(0, start);
    const word = practiceText.slice(start, start + length);
    const after = practiceText.slice(start + length);

    return (
      <DSText variant="h2" color="primary" style={styles.readingText}>
        {before}
        <RNText
          style={{
            backgroundColor: colors.action.primaryTint,
            color: colors.text.primary,
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
        />

        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <DSText variant="h3" color="primary" style={styles.tipsHeading}>Tips</DSText>
          {readingTips.quote.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View style={[styles.tipDot, { backgroundColor: colors.action.primary }]} />
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

  const bottomPadding = 32; // Ultra-compact clearance, allows slight overlap with dock for tight feel

  // Active Practice View — re-themed to the dark canvas (exercise logic intact).
  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            height: HEADER_HEIGHT + insets.top,
            backgroundColor: colors.background.canvas,
          },
        ]}
      >
        <IconButton
          name="arrow-left"
          onPress={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : actions.onBackPress()
          }
        />
        <DSText variant="h3" color="primary">
          Quote Practice
        </DSText>

        {/* Hard Mode Toggle in Header */}
        <View style={styles.headerRight}>
          {canUseHardMode && (
            <TouchableOpacity
              onPress={() => actions.setHardMode(!hardMode)}
              style={[
                styles.headerHardModeButton,
                {
                  backgroundColor: hardMode
                    ? colors.action.primaryTint
                    : colors.surface.control,
                },
              ]}
            >
              <Icon
                name={icons.streak}
                size={14}
                color={hardMode ? colors.action.primary : colors.text.secondary}
              />
              {hardMode && (
                <View
                  style={[
                    styles.activeDot,
                    {
                      backgroundColor: colors.action.primary,
                      borderColor: colors.background.canvas,
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reading Content */}
      <View style={{ flex: 1 }}>
        <CustomScrollView
          key="practice-scroll"
          scrollEnabled={true}
          contentContainerStyle={[
            styles.readingScrollContent,
            {
              paddingTop: HEADER_HEIGHT + insets.top + 10,
              paddingBottom: bottomPadding,
            },
          ]}
        >
          <View
            style={[
              styles.cardContainer,
              { backgroundColor: colors.surface.default },
            ]}
          >
            {/* 1. Accent Header (solid) */}
            <View
              style={[
                styles.cardHeaderGradient,
                { backgroundColor: colors.accent.info },
              ]}
            >
              <View style={styles.headerTopRow}>
                <View
                  style={[
                    styles.categoryPill,
                    { backgroundColor: colors.surface.default },
                  ]}
                >
                  <Icon name={icons.affirmation} size={12} color={colors.text.primary} />
                  <DSText variant="label" color="primary">
                    QUOTE
                  </DSText>
                </View>

                {/* Next Button */}
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={actions.toggleIndex}
                    style={[
                      styles.nextButton,
                      { backgroundColor: colors.surface.default },
                    ]}
                  >
                    <DSText variant="label" color="primary">
                      Next
                    </DSText>
                    <Icon
                      name={icons.chevronRight}
                      size={12}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Watermark */}
              <View style={styles.headerWatermark} pointerEvents="none">
                <Icon name={icons.affirmation} size={96} color={colors.accentOn.info} />
              </View>
            </View>

            {/* 2. Sheet Content */}
            <View
              style={[
                styles.cardBodySheet,
                { backgroundColor: colors.surface.default },
              ]}
            >
              {/* Internal Watermark */}
              <View style={styles.sheetWatermarkContainer} pointerEvents="none">
                <Icon name={icons.affirmation} size={120} color={colors.text.primary} />
              </View>

              <View style={styles.textArea}>
                {/* VoiceHover Logic */}
                {selectedPracticeTool === ToolType.CHORUS && (
                  <View style={{ height: 0, overflow: "hidden" }}>
                    <VoiceHover
                      text={currentQuote?.textContent || ""}
                      onHighlightChange={(s, l) =>
                        actions.setHighlightRange([s, l])
                      }
                      rate={vhRate}
                      prePause={vhPrePause}
                      gap={vhGap}
                      isPlaying={vhIsPlaying}
                      onComplete={() => setVhIsPlaying(false)}
                    />
                  </View>
                )}
                {renderHighlightedText()}
                <DSText
                  variant="h3"
                  color="secondary"
                  style={styles.authorText}
                >
                  — {currentQuote?.author || "Unknown"}
                </DSText>
              </View>
            </View>
          </View>
        </CustomScrollView>
      </View>

      {/* Action Dock (Fixed Bottom) */}
      <View style={styles.actionDockWrapper}>
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
          renderTools={() =>
            focusMode && !toolsExpanded ? (
              <TouchableOpacity
                style={[
                  styles.toolsCollapsed,
                  { backgroundColor: colors.surface.control },
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setToolsExpanded(true);
                }}
                activeOpacity={0.8}
              >
                <Icon name="sliders" size={14} color={colors.text.secondary} />
                <DSText variant="label" color="secondary">
                  Tools
                </DSText>
              </TouchableOpacity>
            ) : (
            <View style={styles.dockTools}>
              {[
                { id: ToolType.DAF, icon: icons.headphones, label: "DAF" },
                { id: ToolType.CHORUS, icon: icons.voiceTool, label: "Guide" },
                { id: ToolType.METRONOME, icon: icons.duration, label: "Tempo" },
              ].map((tool) => {
                const isActive =
                  (tool.id === ToolType.DAF &&
                    selectedPracticeTool === tool.id &&
                    dafState.isDAFActive) ||
                  (tool.id === ToolType.CHORUS &&
                    selectedPracticeTool === tool.id &&
                    vhIsPlaying) ||
                  (tool.id === ToolType.METRONOME &&
                    selectedPracticeTool === tool.id &&
                    metronomeState.isPlaying);
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[
                      styles.dockItem,
                      isActive && [
                        styles.dockItemActive,
                        { backgroundColor: colors.action.primary },
                      ],
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      handleToolSelect(tool.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name={tool.icon}
                      size={20}
                      color={
                        isActive ? colors.action.onPrimary : colors.text.secondary
                      }
                    />
                    {isActive && (
                      <DSText
                        variant="label"
                        color={colors.action.onPrimary}
                        numberOfLines={1}
                        style={styles.dockItemLabel}
                      >
                        {tool.label}
                      </DSText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            )
          }
        />
      </View>

      {/* Detail Sheet for Tools */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => actions.setActiveToolSheet(null)}
        maxHeight={500}
        showCloseButton={true}
        fitContent={true}
      >
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <DSText variant="h3" color="primary" center style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : `${activeToolSheet} Settings`}
          </DSText>
          {renderToolSheetContent()}
        </ScrollView>
      </BottomSheetModal>

      <ToolConsentModal
        visible={consentTool !== null}
        tool={consentTool}
        onAcknowledge={() => acknowledgeConsent(proceedToolSelect)}
      />

      {exitSheet}
    </ScreenView>
  );
};

export default QuotePractice;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  headerRight: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerHardModeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },

  // Reading Mode Styles
  readingScrollContent: {
    paddingHorizontal: spacing["2xl"],
  },
  textArea: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
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

  // Action Dock
  actionDockWrapper: {},
  toolsCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.input,
  },
  dockTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xs,
  },
  dockItem: {
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    flex: 1, // Default share space
  },
  dockItemActive: {
    paddingHorizontal: spacing.md,
    flex: 2.5, // Matches CustomTabBar expansion ratio
  },
  dockItemLabel: {
    marginLeft: 6,
  },
  // Sheet (renders on the shared BottomSheetModal's dark surface)
  sheetContent: {
    padding: spacing["2xl"],
  },
  sheetTitle: {
    marginBottom: spacing.xl,
  },
  cardContainer: {
    borderRadius: radius.card,
    overflow: "hidden", // Clip the sheet
  },
  cardHeaderGradient: {
    padding: spacing["2xl"],
    paddingBottom: 48, // Space for overlap
    position: "relative",
    height: 180,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -10,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  cardBodySheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    marginTop: -40, // Overlap
    padding: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center", // Center text vertically
  },
  sheetWatermarkContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.06,
    zIndex: 0,
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
