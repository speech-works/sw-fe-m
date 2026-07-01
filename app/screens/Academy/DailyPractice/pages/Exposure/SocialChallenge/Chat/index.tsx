import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  UIManager,
  View,
  ViewStyle,
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

import { SCEDPStackRouteProp } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { ExploreStackNavigationProp } from "../../../../../../../navigators/stacks/ExploreStack/types";

const Chat = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"SCChat">>();
  const route = useRoute<SCEDPStackRouteProp<"SCChat">>();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const HEADER_HEIGHT = 60;
  const { sc, practiceActivityId, packContext, from } = route.params;
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

  // Renders chat/option text where (parentheses) and [brackets] become solid,
  // rounded highlight chips (the app's chip vibe). Plain text is split into
  // per-word <Text> items so the flex row wraps naturally around the chips:
  // unhighlighted words share the line and there are no orphaned highlighted
  // spaces. () = primary technique, [] = the alternative. Chip fills are solid
  // and never match a container background, so a highlight can never disappear.
  const renderRichText = (
    text: string,
    baseTextStyle: StyleProp<TextStyle>,
    containerStyle: StyleProp<ViewStyle>,
  ) => {
    const regex = /(\[.*?\]|\(.*?\))/g;
    const segments = text.split(regex);

    const nodes = segments.flatMap((segment, i) => {
      if (!segment) return [];

      const isBracket = segment.startsWith("[") && segment.endsWith("]");
      const isParen = segment.startsWith("(") && segment.endsWith(")");

      if (isBracket || isParen) {
        let content = segment.slice(1, -1);
        if (content.endsWith(".")) content = content.slice(0, -1);
        return [
          <View
            key={`hl-${i}`}
            style={isBracket ? styles.hlSecondary : styles.hlPrimary}
          >
            <Text
              style={isBracket ? styles.hlSecondaryText : styles.hlPrimaryText}
            >
              {content}
            </Text>
          </View>,
        ];
      }

      return segment.split(" ").flatMap((word, wIndex, arr) => {
        if (!word) return [];
        return [
          <Text key={`t-${i}-${wIndex}`} style={baseTextStyle}>
            {word}
            {wIndex < arr.length - 1 ? " " : ""}
          </Text>,
        ];
      });
    });

    return <View style={containerStyle}>{nodes}</View>;
  };

  const renderMessageText = (text: string, type: "incoming" | "outgoing") =>
    renderRichText(
      text,
      type === "incoming"
        ? styles.incomingMessageText
        : styles.outgoinggMessageText,
      styles.richRowStart,
    );

  // Selection is shown by the card's orange ring (selectedSuggestionCard), so
  // option text never recolors and the chips always sit on a neutral-dark card.
  const renderOptionText = (text: string) =>
    renderRichText(text, styles.suggestionText, styles.richRowCenter);

  // Background Component — dark "Vivid" canvas (replaces the legacy light gradient).
  const Background = () => (
    <View style={[StyleSheet.absoluteFillObject, styles.canvas]} />
  );

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
    <ScreenView style={styles.screenView}>
      <StatusBar barStyle="light-content" />
      <Background />

      {/* Header — dark top bar (DS back button + scenario title). */}
      <View
        style={[
          styles.topNavigationContainer,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <IconButton
          name="arrow-left"
          onPress={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : navigation.goBack()
          }
        />
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {sc.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

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
                  <View style={styles.suggestionTextContainer}>
                    {renderOptionText(option.userLine)}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    backgroundColor: c.background.canvas,
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
  incomingMessageText: {
    color: c.text.primary,
  },
  outgoingMessage: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderBottomRightRadius: radius.xs,
    // "You" bubble: a neutral-dark surface with an orange ring for identity —
    // NOT an orange fill, so the warm primary highlight wash never disappears
    // into it. Right-alignment + the ring distinguish it from incoming.
    backgroundColor: c.surface.control,
    borderWidth: 1,
    borderColor: c.action.primary,
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  outgoinggMessageText: {
    color: c.text.primary,
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
    // Selected state = an orange ring on a slightly-elevated neutral-dark surface
    // (NOT an orange fill), so the highlight washes inside stay legible.
    backgroundColor: c.surface.elevated,
    borderColor: c.action.primary,
  },
  suggestionTextContainer: {
    // Container for the rendered option text
  },
  suggestionText: {
    color: c.text.primary,
    textAlign: "left",
  },
  richRowStart: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  richRowCenter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  // Solid, rounded highlight chips (the app chip vibe). Fills are solid accent
  // colours that never match a container background, so a highlight can never
  // disappear; marginVertical keeps wrapped lines readable when a chip is inline.
  hlPrimary: {
    backgroundColor: c.action.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginHorizontal: spacing.xxs,
    marginVertical: 1,
  },
  hlPrimaryText: {
    fontWeight: "700",
    color: c.action.onPrimary,
    includeFontPadding: false,
  },
  hlSecondary: {
    backgroundColor: c.accent.purple,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginHorizontal: spacing.xxs,
    marginVertical: 1,
  },
  hlSecondaryText: {
    fontWeight: "700",
    color: c.accentOn.purple,
    includeFontPadding: false,
  },
}));

export default Chat;
