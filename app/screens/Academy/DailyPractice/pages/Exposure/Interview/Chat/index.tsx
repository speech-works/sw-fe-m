import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutChangeEvent,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { InterviewEDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import DonePractice from "../../../../components/DonePractice";
import Separator from "../../../../../../../components/Separator";
import Button from "../../../../../../../components/Button";
import VoiceRecorder from "../../../../../Library/TechniquePage/components/VoiceRecorder";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { createPracticeActivity } from "../../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { useUserStore } from "../../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

// Define the structure for Interview specific nodes and options
interface InterviewNodeOption {
  id: string;
  userLine: string;
  nextNodeId: string | null;
}

interface InterviewNode {
  id: string;
  npcLine: string;
  options: InterviewNodeOption[];
}

// Define the structure for the interview data expected from route.params
interface InterviewData {
  name: string;
  initialNodeId: string;
  dialogues: Record<string, InterviewNode>; // A map of node IDs to InterviewNode objects
}

const Chat = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<InterviewEDPStackParamList, "InterviewChat">>();

  const { interview } = route.params;

  const {
    updateActivity,
    addActivity,
    doesActivityExist,
    isActivityCompleted,
  } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [isDone, setIsDone] = useState(false);
  const [messageHeight, setMessageHeight] = useState<number | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<InterviewNodeOption[]>(
    []
  );
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
      interview.interviewPracticeData?.stage.initialNodeId &&
      !hasInitialized &&
      interview.interviewPracticeData?.stage.dialogues
    ) {
      setCurrentNodeId(interview.interviewPracticeData.stage.initialNodeId);
      setHasInitialized(true);
    }
  }, [interview, hasInitialized]);

  // Effect to update messages and options when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && interview.interviewPracticeData?.stage.dialogues) {
      const node: InterviewNode | undefined =
        interview.interviewPracticeData.stage.dialogues[currentNodeId];
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
  }, [currentNodeId, interview.interviewPracticeData, hasInitialized]);

  // Effect to scroll to the bottom of the chat when messages update and chat is collapsed
  useEffect(() => {
    if (!isExpanded && chatScrollRef.current && messages.length > 0) {
      // Small delay to ensure layout is complete before scrolling
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isExpanded]);

  // Effect to scroll to the bottom when collapsed if messageHeight is known
  useEffect(() => {
    if (!isExpanded && messageHeight != null && chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: false });
      }, 0);
    }
  }, [messageHeight, isExpanded]);

  // Callback function to capture the layout height of the measuring bubble
  const onFirstMessageLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height !== messageHeight && height > 0) {
      setMessageHeight(height);
    }
  };

  // Toggles the expanded state of the chat, with LayoutAnimation for smooth transitions
  const toggleExpand = () => {
    const nextIsExpanded = !isExpanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut, () => {
      // After animation, if collapsing, scroll to the end
      if (!nextIsExpanded && chatScrollRef.current) {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    setIsExpanded(nextIsExpanded);
  };

  // Handles the selection of a user response option
  const handleSelectOption = (option: InterviewNodeOption) => {
    if (!interview.interviewPracticeData?.stage.initialNodeId) return; // Ensure dialogues exist

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

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
      contentId: interview.id,
    });
    const startedActivity = await startPracticeActivity({ id: newActivity.id });
    addActivity({
      ...startedActivity,
    });
    return newActivity.id;
  };

  const markActivityComplete = async (activityId: string) => {
    if (!practiceSession || !doesActivityExist(activityId)) return;
    const completedActivity = await completePracticeActivity({
      id: activityId,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
  };

  const onDonePress = async () => {
    try {
      const activityId = await markActivityStart();
      if (!activityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(activityId);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: activityId,
      });
      setIsDone(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            {/* Displaying the interview name from route params */}
            <Text style={styles.topNavigationText}>{interview.name}</Text>
          </TouchableOpacity>
          {/* Chevron to toggle expand/collapse, hidden when done or no messages */}
          <TouchableOpacity
            onPress={toggleExpand}
            style={[
              styles.chevronContainer,
              // Hide chevron if not initialized or no messages yet
              isDone || !hasInitialized || messages.length === 0
                ? { opacity: 0, pointerEvents: "none" }
                : null,
            ]}
          >
            <Icon
              name={isExpanded ? "chevron-circle-up" : "chevron-circle-down"}
              size={16}
              color={theme.colors.text.default}
            />
          </TouchableOpacity>
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            // Display DonePractice component when the practice is marked complete
            <DonePractice />
          ) : (
            <>
              {/* No briefContainer needed for interview simulation context */}
              {/* <View style={styles.briefContainer}>...</View> */}

              <View style={styles.messagesContainer}>
                {/* Hidden measuring bubble to determine message height */}
                {messageHeight === null && (
                  <View
                    style={[styles.incomingMessage, styles.hiddenMeasureBubble]}
                    onLayout={onFirstMessageLayout}
                  >
                    <Text style={styles.incomingMessageText}>
                      Measuring text: This is a reasonably long message to help
                      determine bubble height accurately for layout purposes.
                      Ensure this text results in a height that can accommodate
                      your tallest typical single message.
                    </Text>
                  </View>
                )}

                {/* Main chat messages scroll view */}
                {messages.length > 0 && (
                  <CustomScrollView
                    ref={chatScrollRef}
                    contentContainerStyle={
                      isExpanded
                        ? styles.chatsScrollViewExpanded
                        : styles.chatsScrollViewCollapsed
                    }
                    style={
                      isExpanded
                        ? styles.expandedChatsView
                        : messageHeight
                        ? { height: messageHeight, overflow: "hidden" }
                        : { maxHeight: 0 }
                    }
                    pagingEnabled={!isExpanded}
                    showsVerticalScrollIndicator={isExpanded}
                    scrollEventThrottle={16}
                  >
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
                    {/* Spacer view only for expanded mode to ensure last message isn't hidden by suggestions */}
                    {isExpanded && messages.length > 0 && (
                      <View style={{ height: 60 }} />
                    )}
                  </CustomScrollView>
                )}

                {/* Separator and Suggestions */}
                {currentOptions.length > 0 && (
                  <>
                    <Separator />
                    <View style={styles.suggestionsContainer}>
                      <Text style={styles.suggestionsTitleText}>
                        Suggested Responses:
                      </Text>
                      <View style={styles.suggestedTextContainer}>
                        {currentOptions.map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.suggestionCard,
                              option.id === selectedOptionId
                                ? styles.selectedSuggestionCard
                                : null,
                            ]}
                            onPress={() => handleSelectOption(option)}
                            // Disable option selection if an option has already been chosen for the current turn
                            disabled={selectedOptionId !== null}
                          >
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
                      </View>
                    </View>
                  </>
                )}
              </View>

              <VoiceRecorder
                onRecorded={(uri) => {
                  setVoiceRecordingUri(uri);
                }}
              />

              {!!voiceRecordingUri && (
                <Button text="Done" onPress={onDonePress} />
              )}
            </>
          )}
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: 16,
  },
  scrollContent: {
    gap: 24,
    flexGrow: 1,
    paddingHorizontal: SHADOW_BUFFER,
    paddingTop: SHADOW_BUFFER,
    paddingBottom: 60 + SHADOW_BUFFER,
  },
  topNavigationContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SHADOW_BUFFER,
    paddingTop: Platform.OS === "ios" ? 10 : SHADOW_BUFFER,
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  messagesContainer: {
    padding: 16,
    gap: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  hiddenMeasureBubble: {
    position: "absolute",
    opacity: 0,
    top: -99999,
    left: -99999,
    zIndex: -1,
    pointerEvents: "none",
  },
  expandedChatsView: {
    flex: 1,
  },
  chatsScrollViewExpanded: {
    // For isExpanded === true
    gap: 20,
    // Spacer view is used instead of paddingBottom here
  },
  chatsScrollViewCollapsed: {
    // For isExpanded === false
    gap: 8,
  },
  incomingMessage: {
    padding: 16,
    borderRadius: 16,
    borderTopLeftRadius: 2,
    backgroundColor: theme.colors.library.blue[100],
    maxWidth: "85%",
    alignSelf: "flex-start",
  },
  incomingMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  outgoingMessage: {
    padding: 16,
    borderRadius: 16,
    borderTopRightRadius: 2,
    backgroundColor: theme.colors.library.orange[100],
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  outgoinggMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  chevronContainer: {
    padding: 8,
    alignItems: "center",
  },
  suggestionsContainer: {
    gap: 20,
  },
  suggestionsTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontWeight: "bold",
  },
  suggestedTextContainer: {
    gap: 12,
  },
  suggestionCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface.default,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  selectedSuggestionCard: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderColor: theme.colors.actionPrimary.default,
  },
  selectedSuggestionText: {
    color: theme.colors.text.onDark,
  },
  suggestionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
});

export default Chat;
