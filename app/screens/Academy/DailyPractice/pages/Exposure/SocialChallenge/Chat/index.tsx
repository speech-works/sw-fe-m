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
import { SCEDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import DonePractice from "../../../../components/DonePractice";
import Separator from "../../../../../../../components/Separator";
import Button from "../../../../../../../components/Button";
import VoiceRecorder from "../../../../../Library/TechniquePage/components/VoiceRecorder";
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
  const route = useRoute<RouteProp<SCEDPStackParamList, "SCChat">>();

  const { sc, practiceActivityId } = route.params;

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messageHeight, setMessageHeight] = useState<number | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Effect to initialize the chat with the first NPC message
  useEffect(() => {
    if (
      sc &&
      sc.practiceData?.stage.initialNodeId &&
      !hasInitialized &&
      sc.practiceData?.stage.dialogues
    ) {
      setCurrentNodeId(sc.practiceData.stage.initialNodeId);
      setHasInitialized(true);
    }
  }, [sc, hasInitialized]);

  // Effect to update messages and options when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && sc.practiceData?.stage.dialogues) {
      const node: FixedRolePlayNode | undefined =
        sc.practiceData.stage.dialogues[currentNodeId];
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
        setSelectedOptionId(null);
      } else {
        setCurrentOptions([]);
      }
    } else if (currentNodeId === null && hasInitialized) {
      setCurrentOptions([]);
    }
  }, [currentNodeId, sc.practiceData, hasInitialized]);

  // Effect to scroll to the bottom of the chat when messages update and chat is collapsed
  useEffect(() => {
    if (!isExpanded && chatScrollRef.current && messages.length > 0) {
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

  const toggleExpand = () => {
    const nextIsExpanded = !isExpanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut, () => {
      if (!nextIsExpanded && chatScrollRef.current) {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    setIsExpanded(nextIsExpanded);
  };

  const handleSelectOption = (option: FixedRolePlayNodeOption) => {
    if (!sc.practiceData?.stage.initialNodeId) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `user-${option.id}-${prevMessages.length}-${Date.now()}`,
        type: "outgoing",
        text: option.userLine,
      },
    ]);
    setSelectedOptionId(option.id);
    setCurrentNodeId(option.nextNodeId);
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

  // UPDATED: Render Message Text with Dark Purple Logic for Incoming ()
  const renderMessageText = (text: string, type: "incoming" | "outgoing") => {
    const regex = /(\[.*?\]|\(.*?\))/g;
    const segments = text.split(regex);

    const baseTextStyle =
      type === "incoming"
        ? styles.incomingMessageText
        : styles.outgoinggMessageText;

    const components = segments.flatMap((segment, i) => {
      if (!segment) return [];

      const isBracket = segment.startsWith("[") && segment.endsWith("]");
      const isParen = segment.startsWith("(") && segment.endsWith(")");

      if (isBracket || isParen) {
        let content = segment.slice(1, -1);
        if (content.endsWith(".")) content = content.slice(0, -1);

        let chipContainerStyle;
        let chipTextStyle;

        if (isBracket) {
          // [] Brackets -> Grey
          chipContainerStyle = styles.inlineChipGrey;
          chipTextStyle = styles.inlineChipTextDark;
        } else {
          // () Parentheses logic
          if (type === "incoming") {
            // Incoming -> Dark Purple
            chipContainerStyle = styles.inlineChipPurple;
            chipTextStyle = styles.inlineChipText; // White text
          } else {
            // Outgoing -> Default Primary
            chipContainerStyle = styles.inlineChip;
            chipTextStyle = styles.inlineChipText; // White text
          }
        }

        return [
          <View key={`chip-${i}`} style={chipContainerStyle}>
            <Text style={chipTextStyle}>{content}</Text>
          </View>,
        ];
      }

      // Normal text splitting
      return segment.split(" ").map((word, wIndex, arr) => {
        if (!word && wIndex !== arr.length - 1)
          return <Text key={`space-${i}-${wIndex}`}> </Text>;
        if (!word) return null;

        return (
          <Text key={`text-${i}-${wIndex}`} style={baseTextStyle}>
            {word}
            {wIndex < arr.length - 1 ? " " : ""}
          </Text>
        );
      });
    });

    return <View style={styles.messageTextWrapContainer}>{components}</View>;
  };

  // Logic to render Option/Suggestion text
  const renderOptionText = (text: string, isSelected: boolean) => {
    const regex = /(\[.*?\]|\(.*?\))/g;
    const segments = text.split(regex);

    const components = segments.flatMap((segment, i) => {
      if (!segment) return [];

      const isBracket = segment.startsWith("[") && segment.endsWith("]");
      const isParen = segment.startsWith("(") && segment.endsWith(")");

      if (isBracket || isParen) {
        let content = segment.slice(1, -1);
        if (content.endsWith(".")) content = content.slice(0, -1);

        const chipContainerStyle = isBracket
          ? styles.inlineChipGrey
          : styles.inlineChip;

        const chipTextStyle = isBracket
          ? styles.inlineChipTextDark
          : styles.inlineChipText;

        return [
          <View key={`chip-${i}`} style={chipContainerStyle}>
            <Text style={chipTextStyle}>{content}</Text>
          </View>,
        ];
      }

      return segment.split(" ").map((word, wIndex, arr) => {
        if (!word && wIndex !== arr.length - 1)
          return <Text key={`space-${i}-${wIndex}`}> </Text>;
        if (!word) return null;

        return (
          <Text
            key={`text-${i}-${wIndex}`}
            style={[
              styles.suggestionText,
              isSelected ? styles.selectedSuggestionText : null,
            ]}
          >
            {word}
            {wIndex < arr.length - 1 ? " " : ""}
          </Text>
        );
      });
    });

    return <View style={styles.textWrapContainer}>{components}</View>;
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
            <Text style={styles.topNavigationText}>{sc.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleExpand}
            style={[
              styles.chevronContainer,
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
            <DonePractice />
          ) : (
            <>
              <View style={styles.messagesContainer}>
                {messageHeight === null && (
                  <View
                    style={[styles.incomingMessage, styles.hiddenMeasureBubble]}
                    onLayout={onFirstMessageLayout}
                  >
                    <Text style={styles.incomingMessageText}>
                      Measuring text: This is a reasonably long message to help
                      determine bubble height accurately for layout purposes.
                    </Text>
                  </View>
                )}

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
                        {renderMessageText(message.text, message.type)}
                      </View>
                    ))}
                    {isExpanded && messages.length > 0 && (
                      <View style={{ height: 60 }} />
                    )}
                  </CustomScrollView>
                )}

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
                            disabled={selectedOptionId !== null}
                          >
                            {renderOptionText(
                              option.userLine,
                              option.id === selectedOptionId
                            )}
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
                <Button
                  text="Mark Complete"
                  onPress={async () => {
                    setIsLoading(true);
                    try {
                      await onDonePress();
                      setIsDone(true);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                />
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
    gap: 20,
  },
  chatsScrollViewCollapsed: {
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
    backgroundColor: theme.colors.surface.default,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    minHeight: 48,
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
    includeFontPadding: false,
    lineHeight: 28,
  },
  textWrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  messageTextWrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
  },
  inlineChip: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
  },
  inlineChipText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "700",
    color: theme.colors.text.onDark,
    includeFontPadding: false,
  },
  inlineChipGrey: {
    backgroundColor: "#b1a8a8ff",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
  },
  inlineChipTextDark: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "700",
    color: theme.colors.text.onDark,
    includeFontPadding: false,
  },
  // NEW: Dark Purple Chip Style
  inlineChipPurple: {
    backgroundColor: theme.colors.library.purple[400],
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
  },
});

export default Chat;
