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
import RecordingWidget from "../../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../../components/Button";
import { RoleplayFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import {
  RolePlayNode,
  RolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import VoiceRecorder from "../../../../../Library/TechniquePage/components/VoiceRecorder";

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
  const { title, roleplay, selectedRoleName } = route.params;

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
            <Text style={styles.topNavigationText}>{title}</Text>
          </TouchableOpacity>
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
              <View style={styles.briefContainer}>
                <View style={styles.roleContainer}>
                  <View
                    style={[
                      styles.roleIconContainer,
                      { backgroundColor: theme.colors.library.purple[200] },
                    ]}
                  >
                    <Icon
                      size={20}
                      name={selectedRole?.fontAwesomeIcon || "user"}
                      color={theme.colors.library.purple[600]}
                    />
                  </View>
                  <View style={styles.roleTextContanier}>
                    <Text style={styles.roleTitleText}>
                      You are the {selectedRole?.roleName || "Participant"}
                    </Text>
                    <Text style={styles.roleDescText}>
                      {selectedRole?.roleDescription ||
                        "No description available."}
                    </Text>
                  </View>
                </View>
                {character && character.length > 0 && (
                  <View style={styles.characterContainer}>
                    <Text style={styles.characterTitleText}>
                      Your Character
                    </Text>
                    {character.map((c, i) => (
                      <View key={i} style={styles.characterRow}>
                        <Icon
                          solid
                          size={14}
                          name="check-circle"
                          color={theme.colors.library.orange[400]}
                        />
                        <Text style={styles.characterText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

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
                    // consider nestedScrollEnabled={true} if it's inside another ScrollView and causing issues on Android
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

              <VoiceRecorder />

              <Button text="Mark Complete" onPress={() => setIsDone(true)} />
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
  recordingContainer: {
    padding: 16,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  recorderContainer: {
    gap: 16,
    alignItems: "center",
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  briefContainer: {
    padding: 16,
    gap: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  roleIconContainer: {
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTextContanier: {
    gap: 4,
    flexShrink: 1,
  },
  roleTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  roleDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  characterContainer: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    backgroundColor: theme.colors.surface.default,
  },
  characterTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  characterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  characterText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    flexShrink: 1,
  },
});

export default Chat;
