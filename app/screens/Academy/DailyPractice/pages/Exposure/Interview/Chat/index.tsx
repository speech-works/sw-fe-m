import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FixedRolePlayNode,
  FixedRolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import { completePracticeActivity } from "../../../../../../../api/practiceActivities";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import CustomScrollView from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  IconButton,
  Text,
  makeStyles,
  radius,
  space,
  spacing,
} from "../../../../../../../design-system";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import DonePractice from "../../../../components/DonePractice";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";
import VitalsFeedbackModal from "../../../../../../../components/VitalsFeedbackModal";
import { useConfirmOnExit } from "../../../../../../../hooks/useConfirmOnExit";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

import { InterviewEDPStackRouteProp } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import { ExploreStackNavigationProp } from "../../../../../../../navigators/stacks/ExploreStack/types";

const Chat = () => {
  const navigation =
    useNavigation<ExploreStackNavigationProp<"InterviewChat">>();
  const route = useRoute<InterviewEDPStackRouteProp<"InterviewChat">>();

  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const { interview, practiceActivityId, packContext, from } = route.params;
  const data = interview.practiceData || interview.interviewPracticeData;

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [isDone, setIsDone] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<Animated.ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<
    FixedRolePlayNodeOption[]
  >([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
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
        setSelectedOptionId(null); // Reset selected option
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

  // Effect to scroll to the bottom of the chat when messages update
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (chatScrollRef.current && messages.length > 1) {
      timer = setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [messages]);

  // Handles the selection of a user response option
  const handleSelectOption = (option: FixedRolePlayNodeOption) => {
    if (!data?.stage.initialNodeId) return; // Ensure dialogues exist

    // Add user's selected line to messages
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `user-${option.id}-${prevMessages.length}-${Date.now()}`,
        type: "outgoing",
        text: option.userLine,
      },
    ]);
    setSelectedOptionId(option.id); // Highlight selected option
    setCurrentNodeId(option.nextNodeId); // Move to the next dialogue node
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

  // Background Component — dark "Vivid" canvas (replaces the legacy light gradient).
  const Background = () => (
    <View style={[StyleSheet.absoluteFillObject, styles.canvas]} />
  );

  if (isDone) {
    return (
      <DonePractice
        activityId={practiceActivityId ?? undefined}
        contentType={PracticeActivityContentType.EXPOSURE_PRACTICE}
        practiceName="interview practice"
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
    <ScreenView style={styles.screenView}>
      <StatusBar barStyle="light-content" />
      <Background />

      {/* Header — dark top bar (DS back button + scenario title). */}
      <View style={[styles.topNavigationContainer, { paddingTop: insets.top + 10 }]}>
        <IconButton
          name="arrow-left"
          onPress={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : navigation.goBack()
          }
        />
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {interview.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Chat Area - Expands */}
      <View style={styles.chatAreaContainer}>
        <CustomScrollView
          ref={chatScrollRef}
          contentContainerStyle={styles.chatsScrollView}
          style={styles.chatsView}
          scrollEventThrottle={16}
        >
          {/* Initial Spacer for top padding */}
          <View style={{ height: 24 }} />

          {messages.map((message) => (
            <View
              key={message.id}
              style={
                message.type === "incoming"
                  ? styles.incomingMessage
                  : styles.outgoingMessage
              }
            >
              <Text
                variant="body"
                color={message.type === "incoming" ? "primary" : "inverse"}
              >
                {message.text}
              </Text>
            </View>
          ))}

          {/* Bottom Spacer for visual breathing room */}
          <View style={{ height: 32 }} />
        </CustomScrollView>
      </View>

      {/* Action Dock - Fixed Bottom */}
      <View style={styles.bottomDockContainer}>
        {currentOptions.length > 0 && (
          <View style={styles.suggestionsDock}>
            <Text
              variant="label"
              color="tertiary"
              style={styles.suggestionsTitleText}
            >
              Select a response:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScrollContent}
            >
              {currentOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.8}
                  style={[
                    styles.suggestionCard,
                    option.id === selectedOptionId
                      ? styles.selectedSuggestionCard
                      : null,
                  ]}
                  onPress={() => handleSelectOption(option)}
                  disabled={selectedOptionId !== null}
                >
                  <Text
                    variant="body"
                    color={option.id === selectedOptionId ? "inverse" : "primary"}
                    style={styles.suggestionText}
                  >
                    {option.userLine}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <SmartRecorder
          onRecorded={setVoiceRecordingUri}
          prevRecordingUri={voiceRecordingUri || undefined}
          onSubmit={async () => {
            await onDonePress();
          }}
          onDiscard={() => {
            setVoiceRecordingUri(null);
          }}
        />
      </View>

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />

      {exitSheet}
    </ScreenView>
  );
};

const useStyles = makeStyles((c) => ({
  screenView: {
    paddingBottom: 0,
    backgroundColor: c.background.canvas,
  },
  canvas: {
    backgroundColor: c.background.canvas,
  },
  topNavigationContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  chatsView: {
    flex: 1,
  },
  chatsScrollView: {
    gap: spacing.xl,
    paddingHorizontal: space.screenX,
  },
  chatAreaContainer: {
    flex: 1,
    overflow: "hidden",
  },
  incomingMessage: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderTopLeftRadius: radius.xs,
    backgroundColor: c.surface.elevated,
    maxWidth: "85%",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  outgoingMessage: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderBottomRightRadius: radius.xs,
    backgroundColor: c.action.primary,
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  // Bottom Dock
  bottomDockContainer: {
    // Fixed at bottom, SmartRecorder handles its own positioning
  },
  suggestionsDock: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  suggestionsScrollContent: {
    paddingHorizontal: space.screenX,
    gap: spacing.md,
    paddingRight: spacing["4xl"],
    paddingVertical: spacing.md,
  },
  suggestionsTitleText: {
    marginLeft: space.screenX,
  },
  suggestionCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.surface.control,
    borderWidth: 1,
    borderColor: c.border.default,
    overflow: "hidden",
    maxWidth: 280,
    minWidth: 100,
  },
  selectedSuggestionCard: {
    backgroundColor: c.action.primary,
    borderColor: c.action.primary,
  },
  suggestionText: {
    textAlign: "left",
  },
}));

export default Chat;
