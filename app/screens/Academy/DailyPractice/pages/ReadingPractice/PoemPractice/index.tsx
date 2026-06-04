import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
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
import ScreenView from "../../../../../../components/ScreenView";
import DonePractice from "../../../components/DonePractice";

import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Tools
import Metronome, {
  useMetronome,
} from "../../../../Library/TechniquePage/components/Metronome";
import { DAFTool, useDAF } from "../../../../Tools/DAF";
import { useToolGuardrails } from "../../../../../../hooks/useToolGuardrails";
import ToolConsentModal from "../../../../../../components/ToolConsentModal";
import ToolNudge from "../../../../../../components/ToolNudge";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { VoiceHoverConfigPanel } from "../../../../Tools/VoiceHover/VoiceHoverConfigPanel";
import SmartRecorder from "../StoryPractice/components/SmartRecorder"; // Reuse SmartRecorder
import HardModeToggle from "../../../components/HardModeToggle";

import { ToolType } from "../../../../../../api/tools/types";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { readingTips } from "../data";

// API & Stores
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
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
import { useUIStore } from "../../../../../../stores/ui";
import { useUserStore } from "../../../../../../stores/user";
import { toPascalCase } from "../../../../../../util/functions/strings";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";

const { width } = Dimensions.get("window");

import {
  RDPStackNavigationProp,
  RDPStackRouteProp,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";

const PoemPractice = () => {
  const navigation = useNavigation<RDPStackNavigationProp<"PoemPractice">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { setTabBarVisible } = useUIStore();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, ensureActiveSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  // --- State ---
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allPoems, setAllPoems] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hardMode, setHardMode] = useState(false);
  const canUseHardMode = (user?.fearedSounds?.length ?? 0) > 0;
  const route = useRoute<RDPStackRouteProp<"PoemPractice">>();
  const packContext = route.params?.packContext;
  const from = route.params?.from;

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Highlight Range
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  // Tool State
  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // VoiceHover Config State
  const [vhRate, setVhRate] = useState(1.0);
  const [vhPrePause, setVhPrePause] = useState(200);
  const [vhGap, setVhGap] = useState(100);
  const [vhIsPlaying, setVhIsPlaying] = useState(false);

  // Persistent Tool Hooks
  // Mute logic if tool is NOT selected
  const metronomeState = useMetronome(
    selectedPracticeTool !== ToolType.METRONOME,
  );
  const dafState = useDAF(selectedPracticeTool !== ToolType.DAF);

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

  // --- Effects ---
  // Hide Tab Bar
  useFocusEffect(
    useCallback(() => {
      setTabBarVisible(false);
      return () => {
        setTabBarVisible(true);
      };
    }, [setTabBarVisible]),
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAllPoems = async () => {
      try {
        setIsLoading(true);
        const p = await getReadingPracticeByType(ReadingPracticeType.POEM, hardMode);
        setAllPoems(p);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = p.findIndex((poem) => poem.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(`[PoemPractice] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`);
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error("❌ Error fetching poems:", error);
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPoems();
  }, [hardMode]);

  useEffect(() => {
    const currentText = allPoems[selectedIndex]?.textContent || "";
    // Simple pagination split
    const paginated = currentText
      .split(/\n\s*\n/)
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
    setPages(paginated);
    setCurrentPage(0);
  }, [selectedIndex, allPoems]);



  // --- Actions ---

  const onBackPress = () =>
    from === "MOOD_CHECK"
      ? navigation.navigate("Root" as any, { screen: "HOME" })
      : navigation.goBack();

  const toggleIndex = () => {
    if (allPoems && allPoems.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allPoems.length);
    }
  };

  const markActivityStart = async () => {
    // If not in a pack and no session, we can't track
    const isPackContext = packContext?.packId;

    let sessionToUse: any = practiceSession;

    if (!isPackContext) {
      if (!user?.id) {
        console.error("Missing userId");
        return;
      }
      try {
        sessionToUse = await ensureActiveSession(user.id);
      } catch (err) {
        console.error("Failed to ensure active session", err);
        return;
      }
    }

    if (!isPackContext && !sessionToUse) return;

    const sessionId = isPackContext ? undefined : sessionToUse!.id;
    const userId = isPackContext
      ? user?.id
      : (sessionToUse!.user?.id ?? user?.id);

    if (!userId) {
      console.error("Missing userId");
      return;
    }

    let activityIdToStart =
      currentActivityId || (route.params as any)?.practiceActivity?.id;

    // --- DOUBLE-START PREVENTION ---
    const practiceActivity = (route.params as any)?.practiceActivity;
    if (packContext?.alreadyStarted) {
      if (practiceActivity) {
        console.log(
          ">> PoemPractice: Activity already started by Pack, skipping API call...",
        );
        addActivity(practiceActivity);
        useUserStore.getState().fetchUser();
        setCurrentActivityId(practiceActivity.id);
        return;
      } else {
        console.error("FATAL: Pack marked activity as started, but practiceActivity is missing!");
        setIsStarting(false);
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
    // If we don't have a unique activity ID yet, create one (Standalone mode)
    if (!activityIdToStart) {
      const contentId = allPoems[selectedIndex]?.id;
      if (!contentId) {
        console.error("PoemPractice - Missing contentId, cannot create activity. User might be attempting to start before data is loaded.");
        setIsStarting(false);
        return;
      }

      if (isPackContext) {
        console.log("PoemPractice - Creating Activity via POST (Pack)");
        const newActivity = await createPracticeActivityFromPack({
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          contentType: PracticeActivityContentType.READING_PRACTICE,
          contentId,
        });
        activityIdToStart = newActivity.id;
      } else {
        if (!sessionId)
          throw new Error("No session ID for standalone activity");
        console.log("PoemPractice - Creating Activity via POST (Standalone)");
        let newActivity;
        try {
          newActivity = await createPracticeActivity({
            sessionId,
            contentType: PracticeActivityContentType.READING_PRACTICE,
            contentId,
          });
        } catch (createErr: any) {
          if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
            console.log(">> PoemPractice: Stale session detected (404), refreshing...");
            sessionToUse = await ensureActiveSession(userId, true);
            newActivity = await createPracticeActivity({
              sessionId: sessionToUse.id,
              contentType: PracticeActivityContentType.READING_PRACTICE,
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

    // Track activity start
    track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
      activityId: activityIdToStart,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allPoems[selectedIndex]?.title,
      isPackContext: !!packContext?.packId
    });

    addActivity({ ...startedActivity });
    useUserStore.getState().fetchUser();
    setCurrentActivityId(activityIdToStart);
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(">> PoemPractice: Missing userId, cannot complete activity");
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      toolsUsed: consumeToolsUsed(),
    });

    // Track activity completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      activityId,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allPoems[selectedIndex]?.title,
      isPackContext: !!packContext?.packId
    });

    updateActivity(activityId, { ...completedActivity });
    useUserStore.getState().fetchUser();
  };

  const onDonePress = async () => {
    if (!currentActivityId) return;
    await markActivityComplete(currentActivityId);
    await submitVoiceRecording({
      recordingSource: RecordingSourceType.ACTIVITY,
      activityId: currentActivityId,
    });
    setPracticeComplete(true);

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

  const runStart = async () => {
    setIsStarting(true);
    try {
      await markActivityStart();
    } catch (error) {
      console.error("❌ Error starting activity:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // --- Render Helpers ---

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

  const bottomPadding = 32; // Ultra-compact clearance, allows slight overlap with dock for tight feel

  // --- View: Done Practice ---
  if (practiceComplete) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.READING_PRACTICE}
        practiceName="poem practice"
        onDone={
          packContext
            ? () =>
              navigation.navigate("PackModule", {
                packId: packContext.packId,
                moduleId: packContext.moduleId,
                initialBlockIndex: packContext.blockIndex,
              })
            : undefined
        }
        from={from}
      />
    );
  }

  // --- View: Pre-Practice (Tips) ---
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
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Poem Practice</Text>
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
            <Text style={styles.heroTitle}>Poem Practice</Text>
            <Text style={styles.heroDescription}>
              Find your rhythm and express emotion through the art of poetry.
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
            onValueChange={setHardMode}
            canUseHardMode={canUseHardMode}
            style={{ marginBottom: 32 }}
          />

          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeader}>Tips</Text>
            <View style={styles.timelineContainer}>
              {readingTips.poem.map((tip, index, arr) => (
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
            disabled={isStarting || isLoading}
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
              <Text style={styles.startButtonText}>
                {isStarting ? "Loading..." : "Start Practice"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenView>
    );
  }

  // --- View: Active Practice ---
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
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Poem Practice</Text>
        
        {/* Hard Mode Toggle in Header */}
        <View style={styles.headerRight}>
          {canUseHardMode && (
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
            {/* 1. Warm Gradient Header */}
            <LinearGradient
              colors={["#EA580C", "#F97316"]} // Burnt Orange -> Orange 500
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="feather-alt" size={12} color="#9A3412" />
                  <Text style={styles.categoryPillText}>POEM</Text>
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

              <Text style={styles.articleTitle}>
                {allPoems[selectedIndex]?.title}
              </Text>
              <Text style={styles.headerAuthor}>
                — {allPoems[selectedIndex]?.author}
              </Text>

              {/* Display Level/Difficulty */}
              <Text style={styles.headerLevel}>
                Level: {toPascalCase(allPoems[selectedIndex]?.difficulty)}
              </Text>

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
                <Text style={styles.floatingTimeText}>5 min read</Text>
              </View>

              <View style={styles.textArea}>
                {/* VoiceHover Logic */}
                {selectedPracticeTool === ToolType.CHORUS && (
                  <View style={{ height: 0, overflow: "hidden" }}>
                    <VoiceHover
                      text={pages[currentPage] || ""}
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

              {/* Minimal Pagination at Bottom of Sheet */}
              <View style={styles.paginationRow}>
                <Text style={styles.pageText}>
                  Page {currentPage + 1} / {pages.length}
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    disabled={currentPage === 0}
                    onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
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
                      setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
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
          onDiscard={() => setVoiceRecordingUri(null)}
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
    </ScreenView>
  );
};

export default PoemPractice;

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
    // paddingBottom handled dynamically
  },
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
  bottomActionContainer: {
    paddingHorizontal: 24,
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
    letterSpacing: -0.5,
  },
  headerAuthor: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    zIndex: 1,
  },
  headerLevel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
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
});
