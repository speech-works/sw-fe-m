import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";

import {
  ExerciseItem,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import { getAllExerciseItems } from "../../../../../api/library";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { speakText } from "../../../../../util/functions/speak";

// Components
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import SmartRecorder from "./components/SmartRecorder";
import { DAFTool, useDAF } from "../../../Tools/DAF";
import { VoiceHover } from "../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import Metronome, { useMetronome } from "../components/Metronome";
import { ToolType } from "../../../../../api/tools/types";

interface PracticePageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const PracticePage = ({
  techniqueId,
  setActiveStageIndex,
}: PracticePageProps) => {
  // Data State
  const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [completedItems, setCompletedItems] = useState<Array<ExerciseItem>>([]);

  // Tool State
  const [selectedPracticeTool, setSelectedPracticeTool] = useState<string>("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // Recorder State
  const [voiceRecordingUri, setVoiceRecordingUri] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // VoiceHover Config
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // Tool Hooks (for internal state management)
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME
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

  const handleToolSelect = (toolName: string) => {
    if (selectedPracticeTool === toolName) {
      // Toggle off
      setSelectedPracticeTool("");
      setActiveToolSheet(null);
      if (toolName === ToolType.CHORUS) setVhIsPlaying(false);
    } else {
      setSelectedPracticeTool(toolName);
      setActiveToolSheet(toolName);
    }
  };

  // Renderers
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
          <View style={styles.cardContainer}>
            {/* 1. Header Gradient */}
            <LinearGradient
              colors={["#EA580C", "#F97316"]} // Burnt Orange -> Orange 500
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="dumbbell" size={10} color="#9A3412" />
                  <Text style={styles.categoryPillText}>PRACTICE</Text>
                </View>

                <View style={styles.progressPill}>
                  <Text style={styles.progressText}>
                    {completedItems.length} Completed
                  </Text>
                </View>
              </View>

              <View style={styles.headerWatermark}>
                <Icon name="shapes" size={96} color="rgba(255,255,255,0.15)" />
              </View>
            </LinearGradient>

            {/* 2. Body Sheet */}
            <View style={styles.cardBodySheet}>
              {/* Word Display */}
              <View style={styles.wordDisplayContainer}>
                <Text style={styles.descText}>Read Aloud</Text>

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

                  <Text style={styles.mainWordText}>
                    {currentItem?.itemText || "Loading..."}
                  </Text>
                </View>

                {/* Phonetics / Speaker */}
                <TouchableOpacity
                  style={styles.phoneticContainer}
                  onPress={() => speakText(currentItem?.itemText)}
                >
                  <Icon
                    name="volume-up"
                    size={16}
                    color={theme.colors.actionPrimary.default}
                  />
                  <Text style={styles.phoneticText}>
                    {currentItem?.itemPhonetics
                      ? `/${currentItem?.itemPhonetics}/`
                      : ""}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Navigation Row */}
              <View style={styles.navigationRow}>
                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipButtonText}>Skip Word</Text>
                </TouchableOpacity>

                <View style={styles.paginationDots}>
                  <Text style={styles.paginationText}>
                    Item {selectedIndex + 1} of {exerciseItems.length || "?"}
                  </Text>
                </View>
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

      {/* Settings Modal */}
      <BottomSheetModal
        visible={!!activeToolSheet}
        onClose={() => setActiveToolSheet(null)}
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
    paddingBottom: 40,
    gap: 24,
  },

  // Card Styles
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minHeight: 420,
  },
  cardHeaderGradient: {
    padding: 24,
    paddingBottom: 48, // Overlap space
    position: "relative",
    minHeight: 140,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    zIndex: 2,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9A3412",
    letterSpacing: 1,
  },
  progressPill: {
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },

  // Body Sheet
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32, // Negative margin to pull up
    padding: 32,
    flex: 1,
    alignItems: "center",
  },

  wordDisplayContainer: {
    alignItems: "center",
    gap: 16,
    width: "100%",
    paddingVertical: 20,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  wordWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mainWordText: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.title,
    fontSize: 42,
    lineHeight: 52,
  },
  phoneticContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  phoneticText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), // Monospace for phonetics
  },

  divider: {
    height: 1,
    width: "100%",
    backgroundColor: theme.colors.border.default,
    marginVertical: 24,
  },

  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  paginationDots: {},
  paginationText: {
    color: theme.colors.text.default,
    fontSize: 12,
  },

  completeLink: {
    alignSelf: "center",
    padding: 16,
  },
  completeLinkText: {
    color: theme.colors.actionPrimary.default,
    fontWeight: "600",
  },

  // Dock
  dockWrapper: {
    paddingTop: 16,
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
    flex: 1,
  },
  dockItemActive: {
    backgroundColor: theme.colors.library.orange[400],
    paddingHorizontal: 12,
    flex: 2.5,
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
});
