import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Platform, UIManager } from "react-native";
import {
  FixedRolePlayNode,
  FixedRolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import { completePracticeActivity } from "../../../../../../../api/practiceActivities";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import ChatSession from "../../../../components/ChatSession";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import DonePractice from "../../../../components/DonePractice";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import VitalsFeedbackModal from "../../../../../../../components/VitalsFeedbackModal";
import { useConfirmOnExit } from "../../../../../../../hooks/useConfirmOnExit";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

import { SCEDPStackRouteProp } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { ExploreStackNavigationProp } from "../../../../../../../navigators/stacks/ExploreStack/types";

const Chat = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"SCChat">>();
  const route = useRoute<SCEDPStackRouteProp<"SCChat">>();
  const { sc, practiceActivityId, packContext, from } = route.params;
  const data = sc.practiceData || sc.socialChallengeData;

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { setVoiceRecordingUri, submitVoiceRecording } = useRecordedVoice(
    user?.id,
  );
  const [isDone, setIsDone] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<
    FixedRolePlayNodeOption[]
  >([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Enable LayoutAnimation on Android for smooth transitions
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  useEffect(() => {
    if (
      sc &&
      data?.stage.initialNodeId &&
      !hasInitialized &&
      data?.stage.dialogues
    ) {
      setCurrentNodeId(data.stage.initialNodeId);
      setHasInitialized(true);
    }
  }, [sc, data, hasInitialized]);

  // Effect to update messages and options when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && data?.stage.dialogues) {
      const node: FixedRolePlayNode | undefined =
        data.stage.dialogues[currentNodeId];
      if (node) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `npc-${currentNodeId}-${prevMessages.length}-${Date.now()}`,
            type: "incoming",
            text: node.npcLine,
          },
        ]);
        setCurrentOptions(node.options || []);
      } else {
        setCurrentOptions([]);
      }
    } else if (currentNodeId === null && hasInitialized) {
      setCurrentOptions([]);
    }
  }, [currentNodeId, data, hasInitialized]);

  const handleAdvance = (
    option: FixedRolePlayNodeOption,
    recordingUri: string | null,
  ) => {
    if (!data?.stage.initialNodeId) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `user-${option.id}-${prevMessages.length}-${Date.now()}`,
        type: "outgoing",
        text: option.userLine,
      },
    ]);
    // Overwrite the local take each turn — the single completion upload
    // (submitVoiceRecording) sends only this latest one.
    setVoiceRecordingUri(recordingUri);
    setCurrentNodeId(option.nextNodeId);
  };

  const markActivityComplete = async (
    activityId: string,
    vitals?: {
      effortScore: number;
      autonomyScore: number;
      accuracyScore?: number;
    },
  ) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    // Fallback for user id
    const userId = practiceSession?.user?.id || user?.id; // Always use real ID if available

    if (!userId) {
      console.warn("Cannot complete activity: Missing userId");
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId: userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
      vitals,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
    useUserStore.getState().fetchUser();
  };

  const onDonePress = async () => {
    if (!practiceActivityId) {
      console.error("Activity could not be started");
      return;
    }
    setShowVitalsModal(true);
  };

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: practiceActivityId,
    isCompleted: isDone || showVitalsModal,
    onSave: onDonePress,
    family: "Exposure",
    from,
    packContext,
  });

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    setIsLoading(true);
    try {
      if (!practiceActivityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(practiceActivityId, vitals);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: practiceActivityId,
      });
      setIsDone(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDone) {
    return (
      <DonePractice
        activityId={practiceActivityId ?? undefined}
        contentType={PracticeActivityContentType.EXPOSURE_PRACTICE}
        practiceName="social challenge"
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

  return (
    <>
      <ChatSession
        title={sc.name}
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        messages={messages}
        options={currentOptions}
        onAdvance={handleAdvance}
        onComplete={onDonePress}
      />

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />

      {exitSheet}
    </>
  );
};

export default Chat;
