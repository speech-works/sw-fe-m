import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import { showErrorBottomSheet } from "../../../../../../../util/functions/bottomSheet";
import DonePractice from "../../../../components/DonePractice";

import {
  RolePlayNode,
  RolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import { RoleplayFDPStackParamList } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";

import {
  completePracticeActivity,
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";

import { LinearGradient } from "expo-linear-gradient";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";

// Define the message structure
interface ChatMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

import { ExploreStackNavigationProp } from "../../../../../../../navigators/stacks/ExploreStack/types";

const Chat = () => {
  console.log("RoleplayChat MOUNTED");
  const navigation =
    useNavigation<ExploreStackNavigationProp<"RoleplayChat">>();
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayChat">>();
  const { title, roleplay, selectedRoleName, id, packContext, from } = route.params;

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();

  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const selectedRole = useMemo(
    () =>
      roleplay.scenario.availableRoles.find(
        (role) => role.roleName === selectedRoleName,
      ),
    [roleplay.scenario.availableRoles, selectedRoleName],
  );

  const stage = useMemo(
    () => roleplay.stages.find((s) => s.userRole === selectedRoleName),
    [roleplay.stages, selectedRoleName],
  );

  const character = useMemo(() => stage?.userCharacter, [stage]);
  const startingNodeId = useMemo(() => stage?.initialNodeId, [stage]);
  const dialogues = useMemo(() => stage?.dialogues, [stage]);

  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const chatScrollRef = useRef<Animated.ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<RolePlayNodeOption[]>(
    [],
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    (route.params as any).practiceActivity?.id || null,
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
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  useEffect(() => {
    if (startingNodeId && !hasInitialized && dialogues) {
      setCurrentNodeId(startingNodeId);
      setHasInitialized(true);
    }
  }, [startingNodeId, dialogues, hasInitialized]);

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
    const isPackContext = packContext?.packId;

    let sessionToUse = practiceSession;

    if (!isPackContext && !sessionToUse && user?.id) {
      try {
        sessionToUse = await ensureActiveSession(user.id);
        setSession(sessionToUse);
      } catch (err) {
        console.error("Failed to ensure active session", err);
        return;
      }
    }

    if (!sessionToUse && !isPackContext) return;

    const sessionId = isPackContext ? undefined : sessionToUse!.id;
    const userId = isPackContext
      ? user?.id
      : (sessionToUse!.user?.id ?? user?.id);

    if (!userId) {
      console.error("Missing userId");
      return;
    }

    let activityIdToStart = currentActivityId;

    // --- DOUBLE-START PREVENTION ---
    const practiceActivity = (route.params as any).practiceActivity;
    if (packContext?.alreadyStarted) {
      if (practiceActivity) {
        console.log(
          ">> RoleplayChat: Activity already started by Pack, skipping API call...",
        );
        addActivity(practiceActivity);
        useUserStore.getState().fetchUser();
        setCurrentActivityId(practiceActivity.id);
        return;
      } else {
        console.error("FATAL: Pack marked activity as started, but practiceActivity is missing!");
        showErrorBottomSheet(
          "Something went wrong",
          "Activity data was lost. Returning to your Pack."
        );
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        return;
      }
    }
    if (!activityIdToStart) {
      if (!id) {
        console.error("RoleplayChat - Missing contentId (id), cannot create activity");
        return;
      }

      if (isPackContext) {
        console.log("RoleplayChat - Creating Activity via POST (Pack)");
        const newActivity = await createPracticeActivityFromPack({
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          contentType: PracticeActivityContentType.FUN_PRACTICE,
          contentId: id,
        });
        activityIdToStart = newActivity.id;
      } else {
        if (!sessionId)
          throw new Error("No session ID for standalone activity");
        console.log("RoleplayChat - Creating Activity via POST (Standalone)");
        let newActivity;
        try {
          newActivity = await createPracticeActivity({
            sessionId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: id,
          });
        } catch (createErr: any) {
          if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
            console.log(">> RoleplayChat: Stale session detected (404), refreshing...");
            sessionToUse = await ensureActiveSession(userId, true);
            newActivity = await createPracticeActivity({
              sessionId: sessionToUse.id,
              contentType: PracticeActivityContentType.FUN_PRACTICE,
              contentId: id,
            });
          } else {
            throw createErr;
          }
        }
        activityIdToStart = newActivity.id;
      }
    }
    const startedActivity = await startPracticeActivity({
      id: activityIdToStart,
      userId,
    });
    addActivity({
      ...startedActivity,
    });
    useUserStore.getState().fetchUser();
    setCurrentActivityId(activityIdToStart);
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = practiceSession?.user?.id || user?.id; // Always use real ID if available

    if (!userId) {
      console.warn("Cannot complete activity: Missing userId");
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
    useUserStore.getState().fetchUser();
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

  // --- Render Helpers ---

  if (isDone) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.FUN_PRACTICE}
        practiceName="roleplay"
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

  // Common Elements
  const Background = () => (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]}
        locations={[0, 0.6, 1]}
        style={{ flex: 1 }}
      />
    </View>
  );

  const Header = () => (
    <BlurView
      intensity={80}
      tint="light"
      style={[
        styles.topNavigationContainer,
        { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
      ]}
    >
      <TouchableOpacity
        onPress={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        style={styles.backButton}
      >
        <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={{ width: 32 }} />
    </BlurView>
  );

  // 1. Intro Layout (Scrollable Page)
  if (!currentActivityId) {
    return (
      <ScreenView style={styles.screenView}>
        <Background />
        <Header />

        <CustomScrollView
          scrollEnabled={true}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + insets.top + 20, paddingBottom: 40 },
          ]}
        >
          <View style={styles.introContainer}>
            <LinearGradient
              colors={["#FFF7ED", "#FFEDD5"]}
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
                    <Text style={styles.traitsHeader}>Your Persona Traits</Text>
                    <View style={styles.traitsList}>
                      {character.map((c, i) => (
                        <View key={i} style={styles.traitRow}>
                          <Icon solid size={14} name="check" color="#EA580C" />
                          <Text style={styles.traitText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={async () => {
                setIsStarting(true);
                try {
                  await markActivityStart();
                } finally {
                  setIsStarting(false);
                }
              }}
              disabled={isStarting}
              style={styles.startButton}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>Start Practice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CustomScrollView>
      </ScreenView>
    );
  }

  // 2. Chat Layout (Flex Box + Dock)
  return (
    <ScreenView style={styles.screenView}>
      <Background />
      <Header />

      {/* Chat Area - Expands */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <CustomScrollView
          ref={chatScrollRef}
          contentContainerStyle={[
            styles.chatsScrollView,
            { paddingTop: HEADER_HEIGHT + insets.top + 10 },
          ]}
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

          {/* Bottom Spacer for visual breathing room before input/dock */}
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

export default Chat;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF", // Pure White
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 24,
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: SHADOW_BUFFER,
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
    marginTop: 2,
  },
  messagesContainer: {
    padding: 16,
    gap: 20,
    backgroundColor: "transparent",
  },
  chatsView: {
    flex: 1,
  },
  chatsScrollView: {
    gap: 20,
    paddingHorizontal: 24,
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
    borderColor: "rgba(251, 146, 60, 0.1)", // Orange border hint
  },
  outgoinggMessageText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412", // Dark Orange
  },
  chevronContainer: {
    padding: 8,
    alignItems: "center",
  },
  suggestionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "left",
  },

  // Bottom Dock
  bottomDockContainer: {
    // Positioning handled by ScrollView padding?
    // Actually we want this fixed at bottom
    // SmartRecorder might have its own absolute positioning, let's wrap it nicely
  },
  suggestionsDock: {
    marginTop: 16,
    marginBottom: 0, // Sit right on top of recorder
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
    borderRadius: 24, // Pill shape
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
    maxWidth: 280, // Cap width for carousel
    minWidth: 100,
  },
  selectedSuggestionCard: {
    borderColor: theme.colors.actionPrimary.default,
  },
  selectedSuggestionText: {
    color: "#FFF",
    fontWeight: "600",
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
  // Recorder Dock
  actionDockWrapper: {
    // Dock is self-contained with margins
  },
  startButton: {
    marginTop: 20,
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 40,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
  },
  startButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
  },
});
