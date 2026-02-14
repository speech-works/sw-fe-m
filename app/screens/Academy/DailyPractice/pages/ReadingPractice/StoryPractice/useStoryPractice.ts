import { useCallback, useEffect, useRef, useState } from "react";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useUIStore } from "../../../../../../stores/ui";
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { createPracticeActivity, createSession } from "../../../../../../api";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";

export const useStoryPractice = () => {
  const { setTabBarVisible } = useUIStore();
  const chorusManagerRef = useRef(new ChorusManager());
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, hasHydrated, setSession } = useSessionStore();
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
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");

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
        const st = await getReadingPracticeByType(ReadingPracticeType.STORY);
        setAllStories(st);
      } catch (error) {
        console.error("[useStoryPractice] ❌ Error fetching stories:", error);
      }
    };
    fetchAllStories();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, []);

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

  const route = useRoute();
  const packContext = (route.params as any)?.packContext;

  const markActivityStart = async () => {
    if (!packContext && !practiceSession) {
      console.error("[useStoryPractice] ❌ No user/session found!");
      return;
    }

    try {
      // Create session if it doesn't exist
      let sessionToUse = practiceSession;
      if (!packContext && !sessionToUse && user) {
        const newSession = await createSession({ userId: user.id });
        setSession(newSession);
        sessionToUse = newSession;
      }

      const sessionId = packContext ? "pack-session" : sessionToUse!.id;
      const userId = packContext ? "user" : sessionToUse!.user.id;

      const newActivity = await createPracticeActivity({
        sessionId,
        contentType: PracticeActivityContentType.READING_PRACTICE,
        contentId: allStories[selectedIndex]?.id,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });

      const startedActivity = await startPracticeActivity({
        id: newActivity.id,
        userId,
      });

      addActivity({ ...startedActivity });
      setCurrentActivityId(newActivity.id);
    } catch (error) {
      console.error("[useStoryPractice] ❌ Error in markActivityStart:", error);
      throw error;
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = packContext ? "user" : practiceSession!.user.id;

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
    });
    updateActivity(activityId, { ...completedActivity });
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
        navigation.goBack();
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
    },
  };
};
