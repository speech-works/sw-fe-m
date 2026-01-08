// StoryPractice.tsx (Redesigned)
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";

import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import MasonryTips from "../../../components/MasonryTips";
import DonePractice from "../../../components/DonePractice";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

// Tools
import { DAFTool } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel"; // New Import
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import SmartRecorder from "./components/SmartRecorder"; // New Import

import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { readingTips } from "../data";
import { useStoryPractice } from "./useStoryPractice";
import { ToolType } from "../../../../../../api/tools/types";

const { width } = Dimensions.get("window");

const StoryPractice = () => {
  const { state, actions } = useStoryPractice();
  const {
    practiceComplete,
    currentStory,
    pages,
    currentPage,
    highlightRange,
    currentActivityId,
    isStarting,
    isLoading,
    selectedPracticeTool,
    activeToolSheet,
    voiceRecordingUri,
  } = state;

  // --- VoiceHover Config State ---
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

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

  const renderToolSheetContent = () => {
    switch (activeToolSheet) {
      case ToolType.DAF:
        return <DAFTool />;
      case ToolType.METRONOME:
        return <Metronome />;
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
            onToggleSpeech={() => setVhIsPlaying(!vhIsPlaying)}
          />
        );
      default:
        return null;
    }
  };

  // If it has UI, we might want to put its controls in the sheet too.
  // Let's assume VoiceHover is special and renders logic + controls.

  const handleToolSelect = (toolName: string) => {
    if (selectedPracticeTool === toolName) {
      // Toggle off
      actions.setSelectedPracticeTool("");
      actions.setActiveToolSheet(null);
      // Stop VoiceHover if deselected
      if (toolName === ToolType.CHORUS) setVhIsPlaying(false);
    } else {
      actions.setSelectedPracticeTool(toolName);
      // Open sheet for all tools now, including VoiceHover
      if (
        toolName === ToolType.DAF ||
        toolName === ToolType.METRONOME ||
        toolName === ToolType.CHORUS
      ) {
        actions.setActiveToolSheet(toolName);
      } else {
        // VoiceHover might not need a sheet if it's just highlighting
        actions.setActiveToolSheet(null);
      }
    }
  };

  // --- Main Render ---

  if (practiceComplete) {
    return <DonePractice />;
  }

  // Pre-Practice (Tips) View
  if (!currentActivityId) {
    return (
      <ScreenView style={styles.screenView}>
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#FFF7ED", "#FFEEF8", "#FFFFFF"]}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={actions.onBackPress}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Reading Room</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.noteHeaderBanner}>
            <LinearGradient
              colors={["#FFE4E6", "#FFEDD5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.noteHeaderTextContainer}>
              <Text style={styles.noteHeaderTitle}>Tips</Text>
              <Text style={styles.noteHeaderSubtitle}>
                Master the flow before you start
              </Text>
            </View>
            <TherapistFace size={72} />
          </View>

          <MasonryTips tips={readingTips.story} />

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={async () => {
              actions.setIsStarting(true);
              try {
                await actions.markActivityStart();
              } finally {
                actions.setIsStarting(false);
              }
            }}
            disabled={isStarting}
            style={styles.startButton}
          >
            <LinearGradient
              colors={[
                theme.colors.library.orange[400],
                theme.colors.library.orange[500],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>Start Practice</Text>
              <Icon name="arrow-right" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </CustomScrollView>
      </ScreenView>
    );
  }

  // Calculate dynamic bottom padding based on recorder state
  // Idle: ~60px dock + spacing -> 120px safe
  // Expanded: ~80px wave + 100px controls + spacing -> 300px safe
  const isRecorderActive =
    state.isStarting || // treat starting as active
    !!voiceRecordingUri ||
    false; // or use a specific state check?
  // We can't easily access internal VoiceRecorder mode, but we know if we have a URI it shows "Finish".
  // Actually, VoiceRecorder expands when we interact.
  // The safest bet is: Always ample padding, OR if we want to be fancy, just use a large padding (350) which is safe for max expansion.
  // Given the "Immersive" goal, having extra scroll space at bottom is fine.
  const bottomPadding = 400;

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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={actions.onBackPress}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Story</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Reading Content */}
      <View style={{ flex: 1 }}>
        <CustomScrollView
          scrollEnabled={false}
          contentContainerStyle={[
            styles.readingScrollContent,
            { paddingBottom: bottomPadding },
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
                <TouchableOpacity
                  onPress={actions.toggleIndex}
                  style={styles.glassButton}
                >
                  <Text style={styles.glassButtonText}>Next</Text>
                  <Icon name="chevron-right" size={12} color="#FFF" />
                </TouchableOpacity>
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
                        Math.min(pages.length - 1, p + 1)
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
        </CustomScrollView>
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
          renderTools={() => (
            <View style={styles.dockTools}>
              {[
                { id: ToolType.DAF, icon: "headphones", label: "DAF" },
                { id: ToolType.CHORUS, icon: "highlighter", label: "Guide" },
                { id: ToolType.METRONOME, icon: "clock", label: "Tempo" },
              ].map((tool) => {
                const isActive = selectedPracticeTool === tool.id;
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[styles.dockItem, isActive && styles.dockItemActive]}
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut
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
          )}
        />
      </View>

      {/* Detail Sheet for Tools (DAF, Metronome, VoiceHover) */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => actions.setActiveToolSheet(null)}
        maxHeight={360} // Slightly taller for VoiceHover controls
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : `${activeToolSheet} Settings`}
          </Text>
          {renderToolSheetContent()}
        </View>
      </BottomSheetModal>
    </ScreenView>
  );
};

export default StoryPractice;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  screenHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  // Tips Styles
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  noteHeaderBanner: {
    marginVertical: 20,
    borderRadius: 24,
    height: 120,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  noteHeaderTextContainer: {
    flex: 1,
    gap: 4,
    zIndex: 2,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#881337",
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#9F1239",
    fontWeight: "500",
  },
  startButton: {
    marginTop: 20,
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 40,
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
    paddingHorizontal: 16,
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
    minHeight: 500,
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
    fontSize: 26,
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
    paddingBottom: 40,
    minHeight: 400,
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
});
