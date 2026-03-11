import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import DonePractice from "../../../components/DonePractice";
import MasonryTips from "../../../components/MasonryTips";

// Tools
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "../StoryPractice/components/SmartRecorder";

import { ToolType } from "../../../../../../api/tools/types";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { readingTips } from "../data";
import { useQuotePractice } from "./useQuotePractice";

const { width } = Dimensions.get("window");

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";

const QuotePractice = () => {
  const { state, actions } = useQuotePractice();
  const navigation = useNavigation<RDPStackNavigationProp<"QuotePractice">>();

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
  } = state;

  const route = useRoute<RDPStackRouteProp<"QuotePractice">>();
  const packContext = route.params?.packContext;

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

  // --- Rendering Helpers ---

  const renderHighlightedText = () => {
    const practiceText = currentQuote?.textContent || "";
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
        return (
          <DAFTool
            isDAFActive={dafState.isDAFActive}
            onToggleDAF={dafState.toggleDAF}
            delayMs={dafState.delayMs}
            onDelayChange={dafState.setDelayMs}
            hasPermission={dafState.hasPermission}
            statusMessage={dafState.statusMessage}
          />
        );
      case ToolType.METRONOME:
        return (
          <Metronome
            isPlaying={metronomeState.isPlaying}
            onTogglePlay={(val) => metronomeState.setIsPlaying(val)}
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
            onToggleSpeech={() => setVhIsPlaying(!vhIsPlaying)}
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
            onToggleSpeech={() => setVhIsPlaying(!vhIsPlaying)}
          />
        );
      default:
        return null;
    }
  };

  const handleToolSelect = (toolName: string) => {
    if (selectedPracticeTool === toolName) {
      // Toggle off
      actions.setSelectedPracticeTool("");
      actions.setActiveToolSheet(null);
      if (toolName === ToolType.CHORUS) setVhIsPlaying(false);
    } else {
      actions.setSelectedPracticeTool(toolName);
      actions.setActiveToolSheet(toolName);
    }
  };

  // --- Main Render ---

  if (practiceComplete) {
    return (
      <DonePractice
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
      />
    );
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
          <Text style={styles.screenHeaderTitle}>Quote Practice</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView
          key="tips-scroll"
          contentContainerStyle={styles.scrollContent}
        >
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
                Inspiration before you start
              </Text>
            </View>
            <TherapistFace size={72} />
          </View>

          <MasonryTips tips={readingTips.quote} />

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={async () => {
              actions.setIsStarting(true);
              try {
                await actions.markActivityStart();
              } catch (error) {
                console.error(
                  "[QuotePractice] ❌ Error in markActivityStart:",
                  error,
                );
              } finally {
                actions.setIsStarting(false);
              }
            }}
            disabled={isStarting || !hasHydrated}
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
        </CustomScrollView>
      </ScreenView>
    );
  }

  const bottomPadding = 20;

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
        <Text style={styles.screenHeaderTitle}>Quote</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Reading Content */}
      <View style={{ flex: 1 }}>
        <CustomScrollView
          key="practice-scroll"
          scrollEnabled={true}
          contentContainerStyle={[
            styles.readingScrollContent,
            { paddingBottom: bottomPadding },
          ]}
        >
          <View style={styles.cardContainer}>
            {/* 1. Warm Gradient Header */}
            <LinearGradient
              colors={["#F59E0B", "#D97706"]} // Amber 500 -> Amber 600
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="quote-right" size={12} color="#92400E" />
                  <Text style={styles.categoryPillText}>QUOTE</Text>
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

              {/* Watermark */}
              <View style={styles.headerWatermark}>
                <Icon
                  name="quote-right"
                  size={96}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            </LinearGradient>

            {/* 2. White Sheet Content */}
            <View style={styles.cardBodySheet}>
              {/* Internal Watermark */}
              <View style={styles.sheetWatermarkContainer}>
                <Icon
                  name="quote-right"
                  size={120}
                  color={theme.colors.library.orange[100]}
                />
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
                <Text style={styles.authorText}>
                  — {currentQuote?.author || "Unknown"}
                </Text>
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
          )}
        />
      </View>

      {/* Detail Sheet for Tools */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => actions.setActiveToolSheet(null)}
        maxHeight={500}
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
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
    </ScreenView>
  );
};

export default QuotePractice;

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
  },
  textArea: {
    marginTop: 16,
    alignItems: "center",
  },
  readingText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.default,
    lineHeight: 36,
    fontSize: 24,
    textAlign: "center",
  },
  authorText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    fontStyle: "italic",
    marginTop: 16,
    textAlign: "center",
  },

  // Action Dock
  actionDockWrapper: {},
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
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
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
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -10,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40, // Overlap
    padding: 24,
    paddingBottom: 24,
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
    opacity: 0.6,
    zIndex: 0,
  },
  highlight: {
    backgroundColor: theme.colors.library.orange[200],
    color: theme.colors.text.title,
  },
});
