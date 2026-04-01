import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FixedRolePlayNode,
  FixedRolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import { completePracticeActivity } from "../../../../../../../api/practiceActivities";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import CustomScrollView from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import DonePractice from "../../../../components/DonePractice";
import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";
import VitalsFeedbackModal from "../../../../../../../components/VitalsFeedbackModal";

// Define the message structure for this context
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

import { SCEDPStackRouteProp } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { AcademyStackNavigationProp } from "../../../../../../../navigators/stacks/AcademyStack/types";

const Chat = () => {
  const navigation = useNavigation<AcademyStackNavigationProp<"SCChat">>();
  const route = useRoute<SCEDPStackRouteProp<"SCChat">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { sc, practiceActivityId, packContext } = route.params;
  const data = sc.practiceData || sc.socialChallengeData;

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
        setSelectedOptionId(null);
      } else {
        setCurrentOptions([]);
      }
    } else if (currentNodeId === null && hasInitialized) {
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

  const handleSelectOption = (option: FixedRolePlayNodeOption) => {
    if (!data?.stage.initialNodeId) return;

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
    return (
      <DonePractice
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
      />
    );
  }

  return (
    <ScreenView style={styles.screenView}>
      <Background />

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.topNavigationContainer,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
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
      </BlurView>

      {/* Chat Area - Expands */}
      <View style={styles.chatAreaContainer}>
        <CustomScrollView
          ref={chatScrollRef}
          contentContainerStyle={[
            styles.chatsScrollView,
            {
              paddingTop: HEADER_HEIGHT + insets.top + 10,
              paddingBottom: 220, // Increased padding to clear dock
            },
          ]}
          style={styles.chatsView}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
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
                      option.id === selectedOptionId,
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
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
    paddingVertical: 16,
  },
  suggestionsScrollContent: {
    paddingHorizontal: 24,
    gap: 12,
    paddingRight: 40,
    paddingVertical: 12,
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
