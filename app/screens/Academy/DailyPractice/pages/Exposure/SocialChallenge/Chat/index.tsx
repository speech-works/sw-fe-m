import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
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
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SCEDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
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
  const route = useRoute<RouteProp<SCEDPStackParamList, "SCChat">>();

  const { sc, practiceActivityId } = route.params;

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

  // Effect to scroll to the bottom of the chat when messages update
  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
          {sc.name}
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
              {renderMessageText(message.text, message.type)}
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
                  <View style={styles.suggestionTextContainer}>
                    {renderOptionText(
                      option.userLine,
                      option.id === selectedOptionId
                    )}
                  </View>
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
    // Fixed at bottom, VoiceRecorder handles its own positioning
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
  suggestionTextContainer: {
    // Container for the rendered option text
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
