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
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";

export const usePhrasePractice = () => {
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
  const [allPhrases, setAllPhrases] = useState<ReadingPractice[]>([]);
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
    if (allPhrases && allPhrases.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allPhrases.length);
    }
  }, [allPhrases]);

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

  // Fetch Phrases
  useEffect(() => {
    const fetchAllPhrases = async () => {
      try {
        setIsLoading(true);
        const p = await getReadingPracticeByType(ReadingPracticeType.PHRASE, hardMode);
        setAllPhrases(p);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = p.findIndex((phrase) => phrase.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(`[usePhrasePractice] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`);
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error("[usePhrasePractice] ❌ Error fetching phrases:", error);
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPhrases();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, [hardMode]);



  // --- Actions ---

  const onBackPress = () => navigation.goBack();

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.READING_PRACTICE,
    contentId: allPhrases[selectedIndex]?.id,
    contentTitle: allPhrases[selectedIndex]?.title,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    onEarlyExit: () => setIsStarting(false),
    navigation,
    logTag: "usePhrasePractice",
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(
        ">> usePhrasePractice: Missing userId, cannot complete activity",
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
      title: allPhrases[selectedIndex]?.title,
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

  const currentPhrase = allPhrases[selectedIndex];

  return {
    state: {
      practiceComplete,
      allPhrases,
      selectedIndex,
      currentPhrase,
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
