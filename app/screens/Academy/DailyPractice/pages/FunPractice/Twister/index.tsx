import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
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
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmartRecorder from "../../ReadingPractice/StoryPractice/components/SmartRecorder";

import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";

import { ScrollView } from "react-native";
import { ToolType } from "../../../../../../api/tools/types";
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";

// Tool Types (Simplified for Twister if needed, or reuse generic)
// enum ToolType {
//   DAF = "DAF",
// }

const { width } = Dimensions.get("window");

import {
  TwisterFDPStackNavigationProp,
  TwisterFDPStackRouteProp,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/TwisterPracticeStack/types";

const Twister = () => {
  const navigation =
    useNavigation<TwisterFDPStackNavigationProp<"TwisterExercise">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route = useRoute<TwisterFDPStackRouteProp<"TwisterExercise">>();
  const { packContext } = route.params || {};
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { user } = useUserStore();
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

  const handleToolSelect = (toolName: string) => {
    if (selectedPracticeTool === toolName) {
      setSelectedPracticeTool("");
      setActiveToolSheet(null);
      if (toolName === ToolType.CHORUS) setVhIsPlaying(false);
    } else {
      setSelectedPracticeTool(toolName);
      setActiveToolSheet(toolName);
    }
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

  // --- VoiceHover Config State ---
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  // --- Effects ---

  useEffect(() => {
    const fetchTwisters = async () => {
      const ts = await getFunPracticeByType(FunPracticeType.TONGUE_TWISTER);
      setTwisters(ts);
      // Randomize start index or keep 0
      if (ts.length > 0) {
        setCurrentIndex(Math.floor(Math.random() * ts.length));
      }
      setHasHydrated(true);
    };
    fetchTwisters();
  }, []);

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

  const markActivityStart = async () => {
    // If not in a pack and no session, we can't track
    const isPackContext = packContext?.packId;

    let sessionToUse = practiceSession;

    if (!isPackContext && !sessionToUse && user?.id) {
      try {
        sessionToUse = await ensureActiveSession(user.id);
        setSession(sessionToUse);
      } catch (err) {
        console.error("Failed to ensure active session", err);
        return;
      }
    }

    if (!isPackContext && !sessionToUse) return;

    if (!twisters || twisters.length === 0) {
      console.warn("Cannot start activity: Tongue twisters not yet loaded.");
      return;
    }
    try {
      const sessionId = isPackContext ? undefined : sessionToUse!.id;
      const userId = isPackContext
        ? user?.id
        : (sessionToUse!.user?.id ?? user?.id);

      if (!userId) {
        console.error("Missing userId");
        return;
      }

      let activityIdToStart =
        currentActivityId || route.params?.practiceActivity?.id;

      // If we don't have a unique activity ID yet, create one (Standalone mode)
      if (!activityIdToStart) {
        if (isPackContext) {
          console.log("Twister - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: twisters[currentIndex].id,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId)
            throw new Error("No session ID for standalone activity");
          console.log("Twister - Creating Activity via POST (Standalone)");
          const newActivity = await createPracticeActivity({
            sessionId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: twisters[currentIndex].id,
          });
          activityIdToStart = newActivity.id;
        }
      }

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });
      console.log(
        "<< Twister: Activity started successfully",
        startedActivity.id,
      );
      addActivity({
        ...startedActivity,
        funPractice: twisters[currentIndex],
      });
      useUserStore.getState().fetchUser();
      setCurrentActivityId(activityIdToStart);
    } catch (e) {
      console.error("!! Twister: Failed to start activity", e);
    }
  };

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
      return <Text style={styles.readingText}>{text}</Text>;
    }
    const before = text.slice(0, start);
    const word = text.slice(start, start + length);
    const after = text.slice(start + length);

    return (
      <Text style={styles.readingText}>
        {before}
        <Text
          style={{
            backgroundColor: theme.colors.library.orange[200],
            color: theme.colors.text.title,
          }}
        >
          {word}
        </Text>
        {after}
      </Text>
    );
  };

  // --- Main Render ---

  if (practiceComplete) {
    return (
      <DonePractice
        practiceName="tongue twister"
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

  // 1. Pre-Practice (Tips) View
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

        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.topNavigationContainer,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tongue Twister</Text>
          <View style={{ width: 32 }} />
        </BlurView>

        <ScrollView
          key="tips-scroll"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: HEADER_HEIGHT + insets.top + 20,
          }}
          showsVerticalScrollIndicator={false}
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
                Warm up your articulators
              </Text>
            </View>
            <TherapistFace size={72} />
          </View>

          {/* Use hints from current twister or generic */}
          <MasonryTips
            tips={
              twisters[currentIndex]?.tongueTwisterData?.hints || [
                "Start slowly and focus on clarity.",
                "Repeat the phrase faster each time.",
                "Exaggerate your mouth movements.",
              ]
            }
          />
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
            onPress={async () => {
              setIsStarting(true);
              try {
                await markActivityStart();
              } finally {
                setIsStarting(false);
              }
            }}
            disabled={isStarting || !hasHydrated}
            style={styles.startButton}
          >
            <LinearGradient
              colors={
                !hasHydrated
                  ? ["#94A3B8", "#64748B"]
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

  const bottomPadding = 400; // Space for the dock

  // 2. Active Practice View
  return (
    <ScreenView style={styles.screenView}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]}
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
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Twister</Text>
        <View style={{ width: 32 }} />
      </BlurView>

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
          <View style={styles.cardContainer}>
            {/* 1. Warm Gradient Header */}
            <LinearGradient
              colors={["#F59E0B", "#D97706"]} // Amber
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="wind" size={12} color="#92400E" />
                  <Text style={styles.categoryPillText}>TWISTER</Text>
                </View>

                {/* Glassy Next Button */}
                <TouchableOpacity
                  onPress={toggleIndex}
                  style={styles.glassButton}
                >
                  <Text style={styles.glassButtonText}>Next</Text>
                  <Icon name="chevron-right" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Watermark */}
              <View style={styles.headerWatermark}>
                <Icon name="wind" size={96} color="rgba(255,255,255,0.15)" />
              </View>
            </LinearGradient>

            {/* 2. White Sheet Content */}
            <View style={styles.cardBodySheet}>
              {/* Internal Watermark */}
              <View style={styles.sheetWatermarkContainer}>
                <Icon
                  name="wind"
                  size={120}
                  color={theme.colors.library.orange[100]}
                />
              </View>

              <View style={styles.textArea}>
                <Text style={styles.titleText}>
                  {twisters[currentIndex]?.name}
                </Text>
                {selectedPracticeTool === ToolType.CHORUS && (
                  <View style={{ height: 0, overflow: "hidden" }}>
                    <VoiceHover
                      text={
                        twisters[currentIndex]?.tongueTwisterData?.text || ""
                      }
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
              </View>
            </View>
          </View>
        </CustomScrollView>
      </View>

      {/* Action Dock (Fixed Bottom) */}
      <View style={styles.actionDockWrapper}>
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
        onClose={() => setActiveToolSheet(null)}
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
          <Text style={styles.sheetTitle}>
            {activeToolSheet === ToolType.CHORUS
              ? "Guide Settings"
              : activeToolSheet === ToolType.DAF
                ? "DAF Settings"
                : "Metronome Settings"}
          </Text>
          {renderToolSheetContent()}
        </ScrollView>
      </BottomSheetModal>
    </ScreenView>
  );
};

export default Twister;

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
  // Tips Styles
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 24,
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
  },
  textArea: {
    marginTop: 16,
    alignItems: "center",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    opacity: 0.7,
  },
  readingText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.default,
    lineHeight: 36,
    fontSize: 24,
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

  // Card UI
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minHeight: 450,
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
    paddingBottom: 40,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
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
  // Tools Sheet
  sheetContent: {
    padding: 24,
  },
  sheetTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    marginBottom: 20,
    textAlign: "center",
  },
  // Dock Items
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
  bottomActionContainer: {
    paddingHorizontal: 24,
  },
});
