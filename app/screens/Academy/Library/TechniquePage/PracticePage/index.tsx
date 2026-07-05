import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { getAllExerciseItems } from "../../../../../api/library";
import {
  ExerciseItem,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import { speakText } from "../../../../../util/functions/speak";
import CustomScrollView from "../../../../../components/CustomScrollView";

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
  Sheet,
} from "../../../../../design-system";

interface PracticePageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
  header?: React.ReactNode;
  outerScrollY?: Animated.SharedValue<number>;
}

const PracticePage = ({
  techniqueId,
  setActiveStageIndex,
  header,
  outerScrollY,
}: PracticePageProps) => {
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
        <CustomScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          outerScrollY={outerScrollY}
        >
          {header}
          <View style={styles.stage}>
            <Text variant="label" color={colors.accentText.info} style={styles.eyebrow}>
              PRACTICE
            </Text>

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

            <TouchableOpacity
              style={[
                styles.phoneticContainer,
                { backgroundColor: colors.surface.control },
              ]}
              onPress={() => speakText(currentItem?.itemText)}
            >
              <Icon name={icons.volume} size={16} color={colors.text.accent} />
              <Text variant="body" color="secondary" style={styles.phoneticText}>
                {currentItem?.itemPhonetics
                  ? `/${currentItem?.itemPhonetics}/`
                  : ""}
              </Text>
            </TouchableOpacity>

            <View style={styles.navigationRow}>
              <TouchableOpacity onPress={handleNext} style={styles.skipButton}>
                <Text variant="title" color="secondary">
                  Skip Word
                </Text>
              </TouchableOpacity>
              <Text variant="bodySm" color="secondary">
                Item {selectedIndex + 1} of {exerciseItems.length || "?"} · {completedItems.length} done
              </Text>
            </View>
          </View>
        </CustomScrollView>
      </View>

      {/* Dock (Fixed Bottom) */}
      <View style={styles.dockWrapper}>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: spacing["4xl"],
  },
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing["3xl"],
  },
  eyebrow: {
    letterSpacing: 1.2,
  },

  // Card Styles

  // Body Sheet

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

  // Sheet
  sheetTitle: {
    marginBottom: spacing.xl,
  },
});
