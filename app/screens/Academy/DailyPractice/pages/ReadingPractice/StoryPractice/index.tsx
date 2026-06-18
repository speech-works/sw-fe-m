// StoryPractice.tsx (Redesigned)
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import ScreenView from "../../../../../../components/ScreenView";
import DonePractice from "../../../components/DonePractice";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";

import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Tools
import { ScrollView } from "react-native"; // Add ScrollView import
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome"; // Updated import
import { DAFTool, useDAF } from "../../../../Tools/DAF"; // Updated import
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "./components/SmartRecorder";
import HardModeToggle from "../../../components/HardModeToggle";

import { ToolType } from "../../../../../../api/tools/types";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { readingTips } from "../data";
import { useStoryPractice } from "./useStoryPractice";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
const { width } = Dimensions.get("window");

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";

const StoryPractice = () => {
  const { state, actions } = useStoryPractice();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
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
  });

  // --- Rendering Helpers ---

  const renderHighlightedText = () => {
    const practiceText = pages[currentPage] || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return <Text style={styles.readingText}>{practiceText}</Text>;
    }
    const before = practiceText.slice(0, start);
    const word = practiceText.slice(start, start + length);
    const after = practiceText.slice(start + length);

    return (
      <Text style={styles.readingText}>
        {before}
        <Text style={styles.highlight}>{word}</Text>
        {after}
      </Text>
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
      <ScreenView style={[styles.screenView, { backgroundColor: "#FAFAFA" }]}>
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.topNavigationContainer,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              from === "MOOD_CHECK"
                ? navigation.navigate("Root" as any, { screen: "HOME" })
                : actions.onBackPress()
            }
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Story Practice</Text>
          <View style={{ width: 32 }} />
        </BlurView>

        <ScrollView
          key="tips-scroll"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: HEADER_HEIGHT + insets.top + 20,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Story Practice</Text>
            <Text style={styles.heroDescription}>
              Develop stamina and narrative flow through engaging stories.
            </Text>
          </View>

          {nudgeVisible && toolNudge && (
            <ToolNudge
              directive={toolNudge}
              onTryWithout={() => handleNudgeTryWithout(runStart)}
              onDismiss={handleNudgeDismiss}
              style={{ marginBottom: 32 }}
            />
          )}

          <HardModeToggle
            value={hardMode}
            onValueChange={actions.setHardMode}
            canUseHardMode={canUseHardMode}
            style={{ marginBottom: 32 }}
          />

          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeader}>Tips</Text>
            <View style={styles.timelineContainer}>
              {readingTips.story.map((tip, index, arr) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineTrack}>
                    <View style={styles.timelineDot} />
                    {index !== arr.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineText}>{tip}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Start Button at bottom */}
        <View
          style={[
            styles.bottomActionContainer,
            { paddingBottom: insets.bottom || 24 },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => runStart()}
            disabled={isStarting || !hasHydrated || isLoading}
            style={styles.startButton}
          >
            <LinearGradient
              colors={
                !hasHydrated
                  ? ["#94A3B8", "#64748B"] // Gray when loading
                  : [
                      theme.colors.library.orange[400],
                      theme.colors.library.orange[500],
                    ]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>
                {!hasHydrated ? "Loading..." : "Start Practice"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenView>
    );
  }

  // Calculate dynamic bottom padding based on recorder state
  // Idle: ~60px dock + spacing -> 120px safe
  // Expanded: ~80px wave + 100px controls + spacing -> 300px safe
  // We can't easily access internal VoiceRecorder mode, but we know if we have a URI it shows "Finish".
  // Actually, VoiceRecorder expands when we interact.
  // The safest bet is: Always ample padding, OR if we want to be fancy, just use a large padding (350) which is safe for max expansion.
  // Given the "Immersive" goal, having extra scroll space at bottom is fine.
  const bottomPadding = 32; // Ultra-compact clearance, allows slight overlap with dock for tight feel

  // Active Practice View
  return (
    <ScreenView style={styles.screenView}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]} // Peach -> Pink -> White
          locations={[0, 0.6, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : actions.onBackPress()
          }
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Story Practice</Text>
        
        {/* Hard Mode Toggle in Header */}
        <View style={styles.headerRight}>
          {canUseHardMode && (
            <TouchableOpacity 
              onPress={() => actions.setHardMode(!hardMode)}
              style={[styles.headerHardModeButton, hardMode && styles.headerHardModeActive]}
            >
              <Icon 
                name="fire" 
                size={14} 
                color={hardMode ? "#EA580C" : theme.colors.text.title} 
                solid={hardMode}
              />
              {hardMode && <View style={styles.activeDot} />}
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      {/* Reading Content */}
      <View style={{ flex: 1 }}>
        <ScrollView
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
          <View style={styles.cardContainer}>
            {/* 1. Warm Gradient Header (Darker/Richer) */}
            <LinearGradient
              colors={["#EA580C", "#F97316"]} // Burnt Orange -> Orange 500
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="book-open" size={12} color="#9A3412" />
                  <Text style={styles.categoryPillText}>STORY</Text>
                </View>

                {/* Glassy Next Button */}
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={actions.toggleIndex}
                    style={styles.glassButton}
                  >
                    <Text style={styles.glassButtonText}>Next</Text>
                    <Icon name="chevron-right" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.articleTitle}>{currentStory?.title}</Text>
              <Text style={styles.headerAuthor}>— {currentStory?.author}</Text>

              {/* Subtle Watermark */}
              <View style={styles.headerWatermark}>
                <Icon
                  name="feather-alt"
                  size={96}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            </LinearGradient>

            {/* 2. White Sheet Content */}
            <View style={styles.cardBodySheet}>
              {/* Time Badge Overlapping Edge */}
              <View style={styles.floatingTimeBadge}>
                <Icon
                  name="clock"
                  size={12}
                  color={theme.colors.library.orange[600]}
                />
                <Text style={styles.floatingTimeText}>10 min read</Text>
              </View>

              <View style={styles.textArea}>
                {/* VoiceHover Logic */}
                {selectedPracticeTool === ToolType.CHORUS && (
                  <View style={{ height: 0, overflow: "hidden" }}>
                    <VoiceHover
                      text={pages[currentPage] || ""}
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
              </View>

              {/* Minimal Pagination at Bottom of Sheet */}
              <View style={styles.paginationRow}>
                <Text style={styles.pageText}>
                  Page {currentPage + 1} / {pages.length}
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    disabled={currentPage === 0}
                    onPress={() =>
                      actions.setCurrentPage((p) => Math.max(0, p - 1))
                    }
                    style={[
                      styles.miniNavButton,
                      currentPage === 0 && { opacity: 0.3 },
                    ]}
                  >
                    <Icon
                      name="arrow-left"
                      size={14}
                      color={theme.colors.text.default}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={currentPage >= pages.length - 1}
                    onPress={() =>
                      actions.setCurrentPage((p) =>
                        Math.min(pages.length - 1, p + 1),
                      )
                    }
                    style={[
                      styles.miniNavButton,
                      currentPage >= pages.length - 1 && { opacity: 0.3 },
                    ]}
                  >
                    <Icon
                      name="arrow-right"
                      size={14}
                      color={theme.colors.text.default}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Action Dock (Fixed Bottom) */}
      <View style={styles.actionDockWrapper}>
        <SmartRecorder
          onRecorded={actions.setVoiceRecordingUri}
          onToggle={actions.toggleIndex} // Next button logic inside SmartRecorder
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
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: "rgba(148,163,184,0.12)",
                }}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setToolsExpanded(true);
                }}
                activeOpacity={0.8}
              >
                <Icon name="sliders-h" size={14} color="#94A3B8" />
                <Text
                  style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700" }}
                >
                  Tools
                </Text>
              </TouchableOpacity>
            ) : (
            <View style={styles.dockTools}>
              {[
                { id: ToolType.DAF, icon: "headphones", label: "DAF" },
                { id: ToolType.CHORUS, icon: "highlighter", label: "Guide" },
                { id: ToolType.METRONOME, icon: "clock", label: "Tempo" },
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
                    style={[styles.dockItem, isActive && styles.dockItemActive]}
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
                      color={isActive ? "#FFF" : "#94A3B8"}
                    />
                    {isActive && (
                      <Text style={styles.dockItemLabel} numberOfLines={1}>
                        {tool.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            )
          }
        />
      </View>

      {/* Detail Sheet for Tools (DAF, Metronome, VoiceHover) */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => actions.setActiveToolSheet(null)}
        maxHeight={500} // Increased for better visibility
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
          <Text style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : `${activeToolSheet} Settings`}
          </Text>
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

export default StoryPractice;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
    paddingHorizontal: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  screenHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
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
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerHardModeActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "rgba(234, 88, 12, 0.3)",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  // Tips Styles
  scrollContent: {
    paddingHorizontal: 20,
  },
  backButtonMinimal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 40,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -1,
    lineHeight: 48,
  },
  heroDescription: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  timelineSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    color: '#111827',
    marginBottom: 24,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.library.blue[500],
    marginTop: 7,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },

  startButton: {
    marginTop: 20,
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 0,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
  },
  startButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
  },

  // Reading Mode Styles
  readingScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    // paddingBottom handled dynamically
  },
  // Removed junk styles
  textArea: {
    marginTop: 8,
  },
  readingText: {
    ...parseTextStyle(theme.typography.BodyHighLight), // Larger text
    color: theme.colors.text.default,
    lineHeight: 32, // More breathability
    fontSize: 18,
  },
  highlight: {
    backgroundColor: theme.colors.library.orange[200],
    color: theme.colors.text.title,
  },

  // Action Dock
  actionDockWrapper: {},
  actionDock: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  dockTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
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
    backgroundColor: theme.colors.library.orange[400],
    paddingHorizontal: 12,
    flex: 2.5, // Matches CustomTabBar expansion ratio
  },
  dockItemLabel: {
    marginLeft: 6,
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  completeButtonContainer: {
    paddingTop: 8,
  },
  // Sheet
  sheetContent: {
    padding: 24,
  },
  sheetTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    marginBottom: 20,
    textAlign: "center",
  },
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden", // Clip the sheet
  },
  cardHeaderGradient: {
    padding: 24,
    paddingBottom: 48, // Space for overlap
    position: "relative",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9A3412",
    letterSpacing: 1,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  glassButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  articleTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 24,
    marginBottom: 4,
    zIndex: 1,
  },
  headerAuthor: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    zIndex: 1,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.6,
    transform: [{ rotate: "-10deg" }],
    zIndex: 0,
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24, // Overlap
    padding: 24,
    paddingBottom: 24,
    justifyContent: "space-between", // Pushes text top, pagination bottom
  },
  floatingTimeBadge: {
    position: "absolute",
    top: -16,
    right: 24,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: theme.colors.library.orange[100],
  },
  floatingTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.library.orange[600],
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pageText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
  },
  miniNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomActionContainer: {
    paddingHorizontal: 24,
  },
});
