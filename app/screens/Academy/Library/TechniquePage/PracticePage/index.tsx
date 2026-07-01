import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAllExerciseItems } from "../../../../../api/library";
import {
  ExerciseItem,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import { speakText } from "../../../../../util/functions/speak";

// Components
import { ToolType } from "../../../../../api/tools/types";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import { DAFTool, useDAF } from "../../../Tools/DAF";
import { VoiceHover } from "../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import Metronome, { useMetronome } from "../components/Metronome";
import SmartRecorder from "../../../DailyPractice/pages/ReadingPractice/StoryPractice/components/SmartRecorder";
import {
  Text,
  Icon,
  icons,
  Divider,
  useTheme,
  spacing,
  radius,
} from "../../../../../design-system";

interface PracticePageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const PracticePage = ({
  techniqueId,
  setActiveStageIndex,
}: PracticePageProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Data State
  const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [completedItems, setCompletedItems] = useState<Array<ExerciseItem>>([]);

  // Tool State
  const [selectedPracticeTool, setSelectedPracticeTool] = useState<string>("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // Recorder State
  const [voiceRecordingUri, setVoiceRecordingUri] = useState<string | null>(
    null,
  );

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
    const fetchTutorial = async () => {
      const items = await getAllExerciseItems();
      setExerciseItems(items);
    };
    fetchTutorial();
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
                  <Icon name={icons.duration} size={10} color={colors.text.primary} />
                  <Text variant="label" color="primary">
                    PRACTICE
                  </Text>
                </View>

                <View
                  style={[
                    styles.progressPill,
                    { backgroundColor: colors.surface.default },
                  ]}
                >
                  <Text variant="label" color="primary">
                    {completedItems.length} Completed
                  </Text>
                </View>
              </View>

              <View style={styles.headerWatermark} pointerEvents="none">
                <Icon name={icons.duration} size={96} color={colors.accentOn.info} />
              </View>
            </View>

            {/* 2. Body Sheet */}
            <View
              style={[
                styles.cardBodySheet,
                { backgroundColor: colors.surface.default },
              ]}
            >
              {/* Word Display */}
              <View style={styles.wordDisplayContainer}>
                <Text variant="label" color="tertiary">
                  READ ALOUD
                </Text>

                {/* VoiceHover Overlay or Static Text */}
                <View style={styles.wordWrapper}>
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
                        text={currentItem?.itemText || ""}
                        rate={vhRate}
                        prePause={vhPrePause}
                        gap={vhGap}
                        isPlaying={vhIsPlaying}
                        onComplete={() => setVhIsPlaying(false)}
                      />
                    </View>
                  )}

                  <Text variant="h1" color="primary" style={styles.mainWordText}>
                    {currentItem?.itemText || "Loading..."}
                  </Text>
                </View>

                {/* Phonetics / Speaker */}
                <TouchableOpacity
                  style={[
                    styles.phoneticContainer,
                    { backgroundColor: colors.surface.control },
                  ]}
                  onPress={() => speakText(currentItem?.itemText)}
                >
                  <Icon name={icons.volume} size={16} color={colors.action.primary} />
                  <Text variant="body" color="secondary" style={styles.phoneticText}>
                    {currentItem?.itemPhonetics
                      ? `/${currentItem?.itemPhonetics}/`
                      : ""}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <Divider />
              </View>

              {/* Navigation Row */}
              <View style={styles.navigationRow}>
                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.skipButton}
                >
                  <Text variant="title" color="secondary">
                    Skip Word
                  </Text>
                </TouchableOpacity>

                <Text variant="bodySm" color="secondary">
                  Item {selectedIndex + 1} of {exerciseItems.length || "?"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Dock (Fixed Bottom) */}
      <View style={styles.dockWrapper}>
        <SmartRecorder
          onRecorded={setVoiceRecordingUri}
          prevRecordingUri={voiceRecordingUri || undefined}
          onSubmit={handleNext}
          onDiscard={() => setVoiceRecordingUri(null)}
          renderTools={() => (
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
                      <Text
                        variant="label"
                        color={colors.action.onPrimary}
                        numberOfLines={1}
                        style={styles.dockItemLabel}
                      >
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

      {/* Settings Modal */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => setActiveToolSheet(null)}
        showCloseButton={true}
        backgroundColor={colors.surface.default}
      >
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, spacing["2xl"]) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h3" color="primary" center style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : `${activeToolSheet} Settings`}
          </Text>
          {renderToolSheetContent()}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
};

export default PracticePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },

  // Card Styles
  cardContainer: {
    borderRadius: radius.card,
    overflow: "hidden",
    minHeight: 420,
  },
  cardHeaderGradient: {
    padding: spacing["2xl"],
    paddingBottom: spacing["5xl"],
    position: "relative",
    minHeight: 140,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  progressPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },

  // Body Sheet
  cardBodySheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    marginTop: -32,
    padding: spacing["3xl"],
    flex: 1,
    alignItems: "center",
  },

  wordDisplayContainer: {
    alignItems: "center",
    gap: spacing.lg,
    width: "100%",
    paddingVertical: spacing.xl,
  },
  wordWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mainWordText: {
    textAlign: "center",
    fontSize: 42,
    lineHeight: 52,
  },
  phoneticContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  phoneticText: {
    fontVariant: ["tabular-nums"],
  },

  divider: {
    width: "100%",
    marginVertical: spacing["2xl"],
  },

  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  skipButton: {
    padding: spacing.sm,
  },

  // Dock
  dockWrapper: {
    paddingTop: spacing.lg,
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
    flex: 1,
  },
  dockItemActive: {
    paddingHorizontal: spacing.md,
    flex: 2.5,
  },
  dockItemLabel: {
    marginLeft: 6,
  },

  // Sheet
  sheetContent: {
    padding: spacing["2xl"],
  },
  sheetTitle: {
    marginBottom: spacing.xl,
  },
});
