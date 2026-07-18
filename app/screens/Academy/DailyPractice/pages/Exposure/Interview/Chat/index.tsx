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
import { useTheme } from "../../../../../../../design-system";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

import { InterviewEDPStackRouteProp } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import { ExploreStackNavigationProp } from "../../../../../../../navigators/stacks/ExploreStack/types";

const Chat = () => {
  const { colors } = useTheme();
  // Interview = the "danger" (rose) accent from the Exposure hub card.
  const accentColor = colors.accent.danger;
  const onAccentColor = colors.accentOn.danger;
  const navigation =
    useNavigation<ExploreStackNavigationProp<"InterviewChat">>();
  const route = useRoute<InterviewEDPStackRouteProp<"InterviewChat">>();

  const { interview, practiceActivityId, packContext, from } = route.params;
  const data = interview.practiceData || interview.interviewPracticeData;

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { setVoiceRecordingUri, submitVoiceRecording } = useRecordedVoice(
    user?.id,
  );
  const [isDone, setIsDone] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [, setIsLoading] = useState(false);

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
      interview &&
      data?.stage.initialNodeId &&
      !hasInitialized &&
      data?.stage.dialogues
    ) {
      setCurrentNodeId(data.stage.initialNodeId);
      setHasInitialized(true);
    }
  }, [interview, data, hasInitialized]);

  // Effect to update messages and options when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && data?.stage.dialogues) {
      const node: FixedRolePlayNode | undefined =
        data.stage.dialogues[currentNodeId];
      if (node) {
        // Add NPC's line to messages
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: `npc-${currentNodeId}-${prevMessages.length}-${Date.now()}`,
            type: "incoming",
            text: node.npcLine,
          },
        ]);
        // Set current options for user
        setCurrentOptions(node.options || []);
        if (node.options.length === 0) {
          // If no options, the dialogue has ended
          // You might want to automatically mark as done or show a specific end message
          // setIsDone(true); // Example: Mark as done when dialogue ends
        }
      } else {
        // Handle case where node is not found (e.g., end of dialogue or invalid nextNodeId)
        setCurrentOptions([]);
        // Optionally, add a message indicating the end of the conversation
        // setMessages((prevMessages) => [
        //   ...prevMessages,
        //   { id: `system-end-${Date.now()}`, type: "incoming", text: "Conversation ended." },
        // ]);
      }
    } else if (currentNodeId === null && hasInitialized) {
      // If currentNodeId becomes null after initialization, it means the conversation has ended
      setCurrentOptions([]);
    }
  }, [currentNodeId, data, hasInitialized]);

  // Handles the selection of a user response option
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
    accentColor,
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
        practiceName="interview practice"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
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
        title={interview.name}
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        messages={messages}
        options={currentOptions}
        onAdvance={handleAdvance}
        onComplete={onDonePress}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </>
  );
};

export default Chat;
