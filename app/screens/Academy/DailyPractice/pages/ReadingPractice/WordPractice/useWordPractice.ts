import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  completePracticeActivity,
} from "../../../../../../api";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useToolUsageStore } from "../../../../../../stores/toolUsage";
import { useUIStore } from "../../../../../../stores/ui";
import { useUserStore } from "../../../../../../stores/user";
import { ToolType } from "../../../../../../api/tools/types";
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";

export const useWordPractice = () => {
  const { setTabBarVisible } = useUIStore();
  const chorusManagerRef = useRef(new ChorusManager());
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, hasHydrated } =
    useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  // --- State ---
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allWords, setAllWords] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  const route = useRoute();
  const packContext = (route.params as any)?.packContext;
  const initialActivity = (route.params as any)?.practiceActivity;

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");
  const [hardMode, setHardMode] = useState(false);

  // Sheet control for complex tools
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // --- Helpers ---
  const toggleIndex = useCallback(() => {
    if (allWords && allWords.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allWords.length);
    }
  }, [allWords]);

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

  // Fetch Words
  useEffect(() => {
    const fetchAllWords = async () => {
      try {
        setIsLoading(true);
        const w = await getReadingPracticeByType(ReadingPracticeType.WORD, hardMode);
        setAllWords(w);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = w.findIndex((word) => word.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(`[useWordPractice] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`);
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error("[useWordPractice] ❌ Error fetching words:", error);
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllWords();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, [hardMode]);



  // --- Actions ---

  const onBackPress = () => navigation.goBack();

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.READING_PRACTICE,
    contentId: allWords[selectedIndex]?.id,
    contentTitle: allWords[selectedIndex]?.title,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    onEarlyExit: () => setIsStarting(false),
    navigation,
    logTag: "useWordPractice",
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(
        ">> useWordPractice: Missing userId, cannot complete activity",
      );
      return;
    }

    // Tools actually activated during this activity (over-reliance guardrails).
    const { getToolsUsed, clearActivity } = useToolUsageStore.getState();
    const toolsUsed = getToolsUsed(activityId);

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      toolsUsed,
    });

    // Track activity completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      activityId,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allWords[selectedIndex]?.title,
      isPackContext: !!packContext?.packId
    });

    // If a nudge was being shown for a tool and the user completed without it,
    // record the positive outcome (guardrail effectiveness signal).
    const nudgedTool = user?.toolNudge?.tool;
    if (nudgedTool && !toolsUsed.includes(nudgedTool as ToolType)) {
      track(ANALYTICS_EVENTS.TOOL_FREE_COMPLETION_AFTER_NUDGE, {
        tool: nudgedTool,
        contentType: PracticeActivityContentType.READING_PRACTICE,
      });
    }

    clearActivity(activityId);
    updateActivity(activityId, { ...completedActivity });
    useUserStore.getState().fetchUser();
  };

  const onDonePress = async () => {
    try {
      if (!currentActivityId) throw new Error("Activity not started");
      await markActivityComplete(currentActivityId);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: currentActivityId,
      });
      setPracticeComplete(true);

      if (packContext) {
        navigation.navigate("PackModule", {
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          initialBlockIndex: packContext.blockIndex,
        });
      }
    } catch (error) {
      console.error("❌ Failed to complete activity:", error);
    }
  };

  const currentWord = allWords[selectedIndex];

  return {
    state: {
      practiceComplete,
      allWords,
      selectedIndex,
      currentWord,
      currentActivityId,
      isLoading,
      isStarting,
      selectedPracticeTool,
      voiceRecordingUri,
      activeToolSheet,
      practiceSession,
      hasHydrated,
      highlightRange,
      hardMode,
      canUseHardMode: (user?.fearedSounds?.length ?? 0) > 0,
    },
    actions: {
      setSelectedIndex,
      setHighlightRange,
      setIsStarting,
      setIsLoading,
      setSelectedPracticeTool,
      setActiveToolSheet,
      setVoiceRecordingUri,
      onBackPress,
      onDonePress,
      markActivityStart,
      toggleIndex,
      setHardMode,
    },
  };
};
