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
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";

export const useStoryPractice = () => {
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
  const [allStories, setAllStories] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
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
  const splitTextIntoPages = (text: string): string[] => {
    return text
      .split(/\n\s*\n/)
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
  };

  const toggleIndex = useCallback(() => {
    if (allStories && allStories.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allStories.length);
    }
  }, [allStories]);

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

  // Fetch Stories
  useEffect(() => {
    const fetchAllStories = async () => {
      try {
        setIsLoading(true);
        const st = await getReadingPracticeByType(ReadingPracticeType.STORY, hardMode);
        setAllStories(st);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = st.findIndex((s) => s.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(`[useStoryPractice] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`);
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error("[useStoryPractice] ❌ Error fetching stories:", error);
        // If backend returns 400 (missing feared sounds), reset hardMode
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllStories();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, [hardMode]);

  // Update Pages when story changes
  useEffect(() => {
    const currentText = allStories[selectedIndex]?.textContent || "";
    const paginated = splitTextIntoPages(currentText);
    setPages(paginated);
    setCurrentPage(0);
    setHighlightRange([-1, 0]);
  }, [selectedIndex, allStories]);



  // --- Actions ---

  const onBackPress = () => navigation.goBack();

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.READING_PRACTICE,
    contentId: allStories[selectedIndex]?.id,
    contentTitle: allStories[selectedIndex]?.title,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    onEarlyExit: () => setIsStarting(false),
    navigation,
    logTag: "useStoryPractice",
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(
        ">> useStoryPractice: Missing userId, cannot complete activity",
      );
      return;
    }

    const { getToolsUsed, clearActivity } = useToolUsageStore.getState();
    const toolsUsed = getToolsUsed(activityId);

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      toolsUsed,
    });

    clearActivity(activityId);

    // Track activity completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      activityId,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allStories[selectedIndex]?.title,
      isPackContext: !!packContext?.packId
    });

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

      if (packContext && navigation.canGoBack()) {
        navigation.goBack();
      } else if (packContext) {
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

  const currentStory = allStories[selectedIndex];

  return {
    state: {
      practiceComplete,
      allStories,
      selectedIndex,
      currentStory,
      pages,
      currentPage,
      highlightRange,
      currentActivityId,
      isLoading,
      isStarting,
      selectedPracticeTool,
      voiceRecordingUri,
      activeToolSheet,
      practiceSession, // Add for debugging
      hasHydrated, // Track if session store has loaded
      hardMode,
      canUseHardMode: (user?.fearedSounds?.length ?? 0) > 0,
    },
    actions: {
      setSelectedIndex,
      setCurrentPage,
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
