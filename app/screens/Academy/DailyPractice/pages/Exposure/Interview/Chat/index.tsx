import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  UIManager,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import React, { useState, useRef, useEffect } from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { InterviewEDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import DonePractice from "../../../../components/DonePractice";
import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { completePracticeActivity } from "../../../../../../../api/practiceActivities";
import { useUserStore } from "../../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import {
  FixedRolePlayNode,
  FixedRolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

const Chat = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<InterviewEDPStackParamList, "InterviewChat">>();

  const { interview, practiceActivityId } = route.params;

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollRef = useRef<Animated.ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<
    FixedRolePlayNodeOption[]
  >([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false); // To track if the initial node has been processed

  // Enable LayoutAnimation on Android for smooth transitions
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Effect to initialize the chat with the first NPC message
  useEffect(() => {
    if (
      interview &&
      interview.practiceData?.stage.initialNodeId &&
      !hasInitialized &&
      interview.practiceData?.stage.dialogues
    ) {
      setCurrentNodeId(interview.practiceData.stage.initialNodeId);
      setHasInitialized(true);
    }
  }, [interview, hasInitialized]);

  // Effect to update messages and options when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && interview.practiceData?.stage.dialogues) {
      const node: FixedRolePlayNode | undefined =
        interview.practiceData.stage.dialogues[currentNodeId];
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
  }, [currentNodeId, interview.practiceData, hasInitialized]);

  // Effect to scroll to the bottom of the chat when messages update
  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handles the selection of a user response option
  const handleSelectOption = (option: FixedRolePlayNodeOption) => {
    if (!interview.practiceData?.stage.initialNodeId) return; // Ensure dialogues exist

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

  const markActivityComplete = async (activityId: string) => {
    if (!practiceSession || !doesActivityExist(activityId)) return;
    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId: practiceSession.user.id,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
  };

  const onDonePress = async () => {
    try {
      if (!practiceActivityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(practiceActivityId);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: practiceActivityId,
      });
      setIsDone(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  // Background Component
  const Background = () => (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]}
        locations={[0, 0.6, 1]}
        style={{ flex: 1 }}
      />
    </View>
  );

  if (isDone) {
    return <DonePractice />;
  }

  return (
    <ScreenView style={styles.screenView}>
      <Background />

      {/* Header */}
      <View style={styles.topNavigationContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {interview.name}
        </Text>
        <View style={{ width: 32 }} />
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
                style={
                  message.type === "incoming"
                    ? styles.incomingMessageText
                    : styles.outgoinggMessageText
                }
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
            <Text style={styles.suggestionsTitleText}>Select a response:</Text>
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
                  <LinearGradient
                    colors={
                      option.id === selectedOptionId
                        ? [
                            theme.colors.actionPrimary.default,
                            theme.colors.actionPrimary.default,
                          ]
                        : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]
                    }
                    style={StyleSheet.absoluteFill}
                  />
                  <Text
                    style={[
                      styles.suggestionText,
                      option.id === selectedOptionId
                        ? styles.selectedSuggestionText
                        : null,
                    ]}
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
            setIsLoading(true);
            try {
              await onDonePress();
            } finally {
              setIsLoading(false);
            }
          }}
          onDiscard={() => {
            setVoiceRecordingUri(null);
          }}
        />
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  topNavigationContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  chatsView: {
    flex: 1,
  },
  chatsScrollView: {
    gap: 20,
    paddingHorizontal: 24,
  },
  chatAreaContainer: {
    flex: 1,
    overflow: "hidden",
  },
  incomingMessage: {
    padding: 16,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    backgroundColor: "#FFFFFF",
    maxWidth: "85%",
    alignSelf: "flex-start",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  incomingMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  outgoingMessage: {
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    backgroundColor: theme.colors.library.orange[100],
    maxWidth: "85%",
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.1)",
  },
  outgoinggMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412", // Dark Orange
  },
  chevronContainer: {
    padding: 8,
    alignItems: "center",
  },
  // Bottom Dock
  bottomDockContainer: {
    // Fixed at bottom, SmartRecorder handles its own positioning
  },
  suggestionsDock: {
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
    paddingBottom: 4,
  },
  suggestionsScrollContent: {
    paddingHorizontal: 24,
    gap: 12,
    paddingRight: 40,
  },
  suggestionsTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    fontWeight: "600",
    marginLeft: 24,
  },
  suggestionCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
    maxWidth: 280,
    minWidth: 100,
  },
  selectedSuggestionCard: {
    borderColor: theme.colors.actionPrimary.default,
  },
  suggestionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "left",
  },
  selectedSuggestionText: {
    color: "#FFF",
    fontWeight: "600",
  },
});

export default Chat;
