import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  completePracticeActivity,
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
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
import { useUIStore } from "../../../../../../stores/ui";
import { useUserStore } from "../../../../../../stores/user";
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";

export const useQuotePractice = () => {
  const { setTabBarVisible } = useUIStore();
  const chorusManagerRef = useRef(new ChorusManager());
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, hasHydrated, setSession, ensureActiveSession } =
    useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  // --- State ---
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allQuotes, setAllQuotes] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  // Quotes don't usually need pagination, but if we want to be consistent:
  // We'll just stick to single page for quotes for now.

  const route = useRoute();
  const packContext = (route.params as any)?.packContext;
  const initialActivity = (route.params as any)?.practiceActivity;

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");

  // Sheet control for complex tools
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // --- Helpers ---
  const toggleIndex = useCallback(() => {
    if (allQuotes && allQuotes.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allQuotes.length);
    }
  }, [allQuotes]);

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

  // Fetch Quotes
  useEffect(() => {
    const fetchAllQuotes = async () => {
      try {
        const q = await getReadingPracticeByType(ReadingPracticeType.QUOTE);
        setAllQuotes(q);
      } catch (error) {
        console.error("[useQuotePractice] ❌ Error fetching quotes:", error);
      }
    };
    fetchAllQuotes();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, []);

  // If activity is already started (from Pack), sync local state immediately
  useEffect(() => {
    if (packContext?.alreadyStarted && initialActivity?.id) {
      console.log(
        ">> useQuotePractice: Activity already started by Pack. Initializing...",
        initialActivity.id,
      );
      addActivity(initialActivity);
      setCurrentActivityId(initialActivity.id);
    }
  }, [packContext, initialActivity, addActivity]);

  // --- Actions ---

  const onBackPress = () => navigation.goBack();

  const markActivityStart = async () => {
    const isPackContext = packContext?.packId;

    if (!isPackContext && !practiceSession && !user) {
      console.error("[useQuotePractice] ❌ No user/session found!");
      return;
    }

    try {
      // Create session if it doesn't exist
      let sessionToUse = practiceSession;
      if (!isPackContext && !sessionToUse && user) {
        const newSession = await ensureActiveSession(user.id);
        setSession(newSession);
        sessionToUse = newSession;
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

      let activityIdToStart = currentActivityId || initialActivity?.id;
      const contentId = allQuotes[selectedIndex]?.id;

      // If we don't have a unique activity ID yet, create one (Standalone mode)
      if (!activityIdToStart) {
        if (!contentId) {
          console.error("useQuotePractice - Missing contentId, cannot create activity");
          return;
        }

        if (isPackContext) {
          console.log("useQuotePractice - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.READING_PRACTICE,
            contentId: contentId,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId)
            throw new Error("No session ID for standalone activity");
          console.log(
            "useQuotePractice - Creating Activity via POST (Standalone)",
          );
          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId,
              contentType: PracticeActivityContentType.READING_PRACTICE,
              contentId: contentId,
            });
          } catch (createErr: any) {
            if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
              console.log(">> useQuotePractice: Stale session detected (404), refreshing...");
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType: PracticeActivityContentType.READING_PRACTICE,
                contentId: contentId,
              });
            } else {
              throw createErr;
            }
          }
          activityIdToStart = newActivity.id;
        }
      }

      // If activity is already started (via Pack pre-start), skip API call
      if (packContext?.alreadyStarted && activityIdToStart) {
        console.log(
          ">> useQuotePractice: skipping startPracticeActivity (already started)",
        );
        addActivity(initialActivity);
        setCurrentActivityId(activityIdToStart);
        return;
      }

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });

      addActivity({ ...startedActivity });
      
      // Track activity start
      track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
        activityId: activityIdToStart,
        contentType: PracticeActivityContentType.READING_PRACTICE,
        title: allQuotes[selectedIndex]?.title,
        isPackContext: !!packContext?.packId
      });

      useUserStore.getState().fetchUser();
      setCurrentActivityId(activityIdToStart);
    } catch (error) {
      console.error("[useQuotePractice] ❌ Error in markActivityStart:", error);
      throw error;
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(
        ">> useQuotePractice: Missing userId, cannot complete activity",
      );
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
    });

    // Track activity completion
    track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
      activityId,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      title: allQuotes[selectedIndex]?.title,
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

  const currentQuote = allQuotes[selectedIndex];

  return {
    state: {
      practiceComplete,
      allQuotes,
      selectedIndex,
      currentQuote,
      currentActivityId,
      isLoading,
      isStarting,
      selectedPracticeTool,
      voiceRecordingUri,
      activeToolSheet,
      practiceSession,
      hasHydrated,
      highlightRange,
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
    },
  };
};
