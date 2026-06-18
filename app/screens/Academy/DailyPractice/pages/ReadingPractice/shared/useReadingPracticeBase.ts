import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { completePracticeActivity } from "../../../../../../api";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { ToolType } from "../../../../../../api/tools/types";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
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
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { track } from "../../../../../../util/analytics/postHog";
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";

interface UseReadingPracticeBaseOptions {
  /** Which reading-practice content type to fetch. */
  type: ReadingPracticeType;
  /** Log tag used in dev console messages (preserves each variant's log identity). */
  logTag: string;
  /** Story-style pagination: split textContent into pages and reset on index change. */
  withPagination?: boolean;
  /** Word-style guardrail signal: emit TOOL_FREE_COMPLETION_AFTER_NUDGE when applicable. */
  withToolFreeNudgeTracking?: boolean;
  /** Story-style done navigation: prefer goBack() when possible before navigating to PackModule. */
  preferGoBackOnDone?: boolean;
}

const splitTextIntoPages = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

/**
 * Shared engine for the Reading-Practice variants (Phrase / Quote / Story / Word).
 * Each variant wraps this via a thin adapter hook that re-maps the generic
 * `items`/`currentItem` keys to its own public key names, so the consuming
 * screens keep their exact existing `{ state, actions }` contract.
 */
export const useReadingPracticeBase = ({
  type,
  logTag,
  withPagination = false,
  withToolFreeNudgeTracking = false,
  preferGoBackOnDone = false,
}: UseReadingPracticeBaseOptions) => {
  const { setTabBarVisible } = useUIStore();
  const chorusManagerRef = useRef(new ChorusManager());
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, hasHydrated } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  // --- State ---
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [items, setItems] = useState<ReadingPractice[]>([]);
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
  const toggleIndex = useCallback(() => {
    if (items && items.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % items.length);
    }
  }, [items]);

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

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const fetched = await getReadingPracticeByType(type, hardMode);
        setItems(fetched);

        // If an ID is passed from recommendations, select it
        const recommendedId = (route.params as any)?.id;
        if (recommendedId && !hardMode) {
          const index = fetched.findIndex((item) => item.id === recommendedId);
          if (index !== -1) {
            setSelectedIndex(index);
          } else {
            console.warn(
              `[${logTag}] Recommended ID ${recommendedId} not found in library. Defaulting to first item.`,
            );
            setSelectedIndex(0);
          }
        } else {
          setSelectedIndex(0);
        }
      } catch (error: any) {
        console.error(`[${logTag}] ❌ Error fetching items:`, error);
        // If backend returns 400 (missing feared sounds), reset hardMode
        if (error?.response?.status === 400) {
          setHardMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, [hardMode]);

  // Update Pages when the selected item changes (pagination variants only)
  useEffect(() => {
    if (!withPagination) return;
    const currentText = items[selectedIndex]?.textContent || "";
    const paginated = splitTextIntoPages(currentText);
    setPages(paginated);
    setCurrentPage(0);
    setHighlightRange([-1, 0]);
  }, [selectedIndex, items, withPagination]);

  // --- Actions ---

  const onBackPress = () => navigation.goBack();

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.READING_PRACTICE,
    contentId: items[selectedIndex]?.id,
    contentTitle: items[selectedIndex]?.title,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    onEarlyExit: () => setIsStarting(false),
    navigation,
    logTag,
  });

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = user?.id; // Always use real ID if available
    if (!userId) {
      console.warn(`>> ${logTag}: Missing userId, cannot complete activity`);
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
      title: items[selectedIndex]?.title,
      isPackContext: !!packContext?.packId,
    });

    // If a nudge was being shown for a tool and the user completed without it,
    // record the positive outcome (guardrail effectiveness signal).
    if (withToolFreeNudgeTracking) {
      const nudgedTool = user?.toolNudge?.tool;
      if (nudgedTool && !toolsUsed.includes(nudgedTool as ToolType)) {
        track(ANALYTICS_EVENTS.TOOL_FREE_COMPLETION_AFTER_NUDGE, {
          tool: nudgedTool,
          contentType: PracticeActivityContentType.READING_PRACTICE,
        });
      }
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

      if (preferGoBackOnDone && packContext && navigation.canGoBack()) {
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

  const currentItem = items[selectedIndex];

  return {
    state: {
      practiceComplete,
      items,
      selectedIndex,
      currentItem,
      pages,
      currentPage,
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
