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

import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmartRecorder from "../../ReadingPractice/StoryPractice/components/SmartRecorder";
import HardModeToggle from "../../../components/HardModeToggle";

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
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";

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
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/TwisterPracticeStack/types";

const Twister = () => {
  const navigation =
    useNavigation<TwisterFDPStackNavigationProp<"TwisterExercise">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route = useRoute<TwisterFDPStackRouteProp<"TwisterExercise">>();
  const { packContext, from } = route.params || {};
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
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

      // --- DOUBLE-START PREVENTION ---
      const practiceActivity = route.params?.practiceActivity;
      if (packContext?.alreadyStarted) {
        if (practiceActivity) {
          console.log(">> Twister: Activity already started by Pack, skipping API call...");
          addActivity({
            ...practiceActivity,
            funPractice: twisters[currentIndex],
          });
          useUserStore.getState().fetchUser();
          setCurrentActivityId(practiceActivity.id);
          return;
        } else {
          console.error("FATAL: Pack marked activity as started, but practiceActivity is missing!");
          showErrorBottomSheet(
            "Something went wrong",
            "Activity data was lost. Returning to your Pack."
          );
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
          return;
        }
      }
      if (!activityIdToStart) {
        const contentId = twisters[currentIndex]?.id;
        if (!contentId) {
          console.error("Twister - Missing contentId, cannot create activity");
          return;
        }

        if (isPackContext) {
          console.log("Twister - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId)
            throw new Error("No session ID for standalone activity");
          console.log("Twister - Creating Activity via POST (Standalone)");
          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId,
              contentType: PracticeActivityContentType.FUN_PRACTICE,
              contentId,
            });
          } catch (createErr: any) {
            if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
              console.log(">> Twister: Stale session detected (404), refreshing...");
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType: PracticeActivityContentType.FUN_PRACTICE,
                contentId,
              });
            } else {
              throw createErr;
            }
          }
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
        from={from}
      />
    );
  }

  // 1. Pre-Practice (Tips) View
  if (!currentActivityId) {
    const tipsArray = twisters[currentIndex]?.tongueTwisterData?.hints || [
      "Start slowly and focus on clarity.",
      "Repeat the phrase faster each time.",
      "Exaggerate your mouth movements.",
    ];

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
                : navigation.goBack()
            }
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Tongue Twister</Text>
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
            <Text style={styles.heroTitle}>Tongue Twisters</Text>
            <Text style={styles.heroDescription}>
              Challenge your articulation and speed with playful phonetic puzzles.
            </Text>
          </View>

          <HardModeToggle 
            value={hardMode}
            onValueChange={setHardMode}
            canUseHardMode={canUseHardMode}
            style={{ marginBottom: 32 }}
          />

          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeader}>Tips</Text>
            <View style={styles.timelineContainer}>
              {tipsArray.map((tip, index, arr) => (
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
          onPress={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : navigation.goBack()
          }
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Tongue Twister</Text>
        
        {/* Hard Mode Toggle in Header */}
        <View style={styles.headerRight}>
          {(user?.fearedSounds?.length ?? 0) > 0 && (
            <TouchableOpacity 
              onPress={() => setHardMode(!hardMode)}
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
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={toggleIndex}
                    style={styles.glassButton}
                  >
                    <Text style={styles.glassButtonText}>Next</Text>
                    <Icon name="chevron-right" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
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
    paddingBottom: 40,
    paddingHorizontal: 24,
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
  },
  textArea: {
    marginTop: 16,
    alignItems: "center",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    fontWeight: "700",
    fontSize: 22,
    marginBottom: 16,
    textAlign: "center",
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
  // Timeline & Hero Styles
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
});
