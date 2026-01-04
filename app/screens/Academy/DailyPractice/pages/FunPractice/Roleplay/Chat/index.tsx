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
import React, { useState, useRef, useEffect, useMemo } from "react";
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
import DonePractice from "../../../../components/DonePractice";
import Separator from "../../../../../../../components/Separator";

import Button from "../../../../../../../components/Button";
import { RoleplayFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import {
  RolePlayNode,
  RolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import VoiceRecorder from "../../../../../Library/TechniquePage/components/VoiceRecorder";
import { useSessionStore } from "../../../../../../../stores/session";
import { useActivityStore } from "../../../../../../../stores/activity";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useUserStore } from "../../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import { LinearGradient } from "expo-linear-gradient";

// Define the message structure
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

const Chat = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayChat">>();
  const { title, roleplay, selectedRoleName, id } = route.params;

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();

  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const selectedRole = useMemo(
    () =>
      roleplay.scenario.availableRoles.find(
        (role) => role.roleName === selectedRoleName
      ),
    [roleplay.scenario.availableRoles, selectedRoleName]
  );

  const stage = useMemo(
    () => roleplay.stages.find((s) => s.userRole === selectedRoleName),
    [roleplay.stages, selectedRoleName]
  );

  const character = useMemo(() => stage?.userCharacter, [stage]);
  const initialNodeIdFromStage = useMemo(() => stage?.initialNodeId, [stage]);
  const dialogues = useMemo(() => stage?.dialogues, [stage]);

  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [messageHeight, setMessageHeight] = useState<number | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<RolePlayNodeOption[]>(
    []
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (initialNodeIdFromStage && !hasInitialized && dialogues) {
      setCurrentNodeId(initialNodeIdFromStage);
      setHasInitialized(true);
    }
  }, [initialNodeIdFromStage, dialogues, hasInitialized]);

  useEffect(() => {
    if (currentNodeId && dialogues) {
      const node: RolePlayNode | undefined = dialogues[currentNodeId];
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
  }, [currentNodeId, dialogues, hasInitialized]);

  useEffect(() => {
    if (!isExpanded && chatScrollRef.current && messages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isExpanded]);

  useEffect(() => {
    if (!isExpanded && messageHeight != null && chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: false });
      }, 0);
    }
  }, [messageHeight, isExpanded]);

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

  const handleSelectOption = (option: RolePlayNodeOption) => {
    if (!dialogues) return;
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

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.FUN_PRACTICE,
      contentId: id,
    });
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity({
      ...startedActivity,
    });
    setCurrentActivityId(newActivity.id);
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
      if (!currentActivityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(currentActivityId);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: currentActivityId,
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
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          {currentActivityId ? (
            <TouchableOpacity
              onPress={toggleExpand}
              style={[
                styles.chevronContainer,
                isDone || messages.length === 0
                  ? { opacity: 0, pointerEvents: "none" }
                  : null,
              ]}
            >
              <Icon
                name={isExpanded ? "chevron-circle-up" : "chevron-circle-down"}
                size={20}
                color={theme.colors.library.orange[600]}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
              {/* If no activity started (Intro Screen) - Render Matte Modern Card */}
              {!currentActivityId && (
                <View style={styles.introContainer}>
                  <LinearGradient
                    colors={["#FFF7ED", "#FFEDD5"]} // Orange Gradient (Lighter)
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.briefCard}
                  >
                    {/* Watermark Icon */}
                    <View style={styles.watermarkIconContainer}>
                      <Icon
                        name={selectedRole?.fontAwesomeIcon || "user"}
                        size={140}
                        color="#EA580C"
                      />
                    </View>

                    <View style={styles.briefContent}>
                      <View style={styles.roleHeader}>
                        <View style={styles.roleIconBadge}>
                          <Icon
                            size={20}
                            name={selectedRole?.fontAwesomeIcon || "user"}
                            color="#EA580C"
                          />
                        </View>
                        <View style={styles.roleTextGroup}>
                          <Text style={styles.introRoleTitle}>
                            {selectedRole?.roleName || "Participant"}
                          </Text>
                          <Text style={styles.introRoleDesc}>
                            {selectedRole?.roleDescription ||
                              "No description available."}
                          </Text>
                        </View>
                      </View>

                      {character && character.length > 0 && (
                        <View style={styles.characterTraitsContainer}>
                          <Text style={styles.traitsHeader}>
                            Your Persona Traits
                          </Text>
                          <View style={styles.traitsList}>
                            {character.map((c, i) => (
                              <View key={i} style={styles.traitRow}>
                                <Icon
                                  solid
                                  size={14}
                                  name="check"
                                  color="#EA580C"
                                />
                                <Text style={styles.traitText}>{c}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Chat Interface or Start Button */}
              {currentActivityId ? (
                <>
                  {messageHeight === null && (
                    <View
                      style={[
                        styles.incomingMessage,
                        styles.hiddenMeasureBubble,
                      ]}
                      onLayout={onFirstMessageLayout}
                    >
                      <Text style={styles.incomingMessageText}>
                        Measuring text: This is a reasonably long message to
                        help determine bubble height accurately for layout
                        purposes. Ensure this text results in a height that can
                        accommodate your tallest typical single message.
                      </Text>
                    </View>
                  )}
                  {(messages.length > 0 || currentOptions.length > 0) && (
                    <View style={styles.messagesContainer}>
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
                        {/* Spacer view only for expanded mode to scroll last message above suggestions */}
                        {isExpanded && messages.length > 0 && (
                          <View style={{ height: 60 }} />
                        )}
                      </CustomScrollView>

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
                  )}
                  <VoiceRecorder
                    onRecorded={(uri) => {
                      setVoiceRecordingUri(uri);
                    }}
                  />
                </>
              ) : (
                <Button
                  text="Start Practice"
                  onPress={async () => {
                    setIsStarting(true);
                    try {
                      await markActivityStart();
                    } finally {
                      setIsStarting(false);
                    }
                  }}
                  disabled={isStarting}
                />
              )}

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

export default Chat;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF", // Pure White
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
    paddingBottom: 120, // Increased for bottom nav clearance
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
  messagesContainer: {
    padding: 16,
    gap: 20,
    borderRadius: 24,
    backgroundColor: "#FFF",
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
    backgroundColor: "#EFF6FF", // Blue 50
    maxWidth: "85%",
    alignSelf: "flex-start",
  },
  incomingMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#1E3A8A",
  },
  outgoingMessage: {
    padding: 16,
    borderRadius: 16,
    borderTopRightRadius: 2,
    backgroundColor: "#FFF7ED", // Orange 50
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  outgoinggMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412",
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseShadowStyle(theme.shadow.elevation1),
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
  introContainer: {
    marginTop: 10,
  },
  briefCard: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    minHeight: 220,
    gap: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -20,
    top: -20,
    opacity: 0.1,
    transform: [{ rotate: "15deg" }],
  },
  briefContent: {
    zIndex: 1,
    gap: 24,
  },
  roleHeader: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  roleIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  roleTextGroup: {
    flex: 1,
    gap: 4,
  },
  introRoleTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 22,
    fontWeight: "800",
    color: "#9A3412",
  },
  introRoleDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#9A3412",
    fontWeight: "500",
  },
  characterTraitsContainer: {
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  traitsHeader: {
    ...parseTextStyle(theme.typography.BodySmall),
    textTransform: "uppercase",
    color: "#EA580C",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  traitsList: {
    gap: 8,
  },
  traitRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  traitText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412",
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
});
