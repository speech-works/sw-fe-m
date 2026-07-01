import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  Button,
  Icon,
  IconButton,
  Text,
  makeStyles,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../../../../../design-system";
import { useMarkActivityStart } from "../../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../../hooks/useConfirmOnExit";
import DonePractice from "../../../../components/DonePractice";

import {
  RolePlayNode,
  RolePlayNodeOption,
} from "../../../../../../../api/dailyPractice/types";
import { RoleplayFDPStackParamList } from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";

import {
  completePracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";

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

  const { updateActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();

  const { user } = useUserStore();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
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

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.FUN_PRACTICE,
    contentId: id,
    initialActivity: (route.params as any).practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "RoleplayChat",
    // RoleplayChat historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

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

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone,
    onSave: onDonePress,
    family: "Fun",
    from,
    packContext,
  });

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

  // Common Elements — dark "Vivid" canvas (replaces the legacy light gradient).
  const Background = () => (
    <View style={[StyleSheet.absoluteFillObject, styles.canvas]} />
  );

  const Header = () => (
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
        {title}
      </Text>

      <View style={{ width: 44 }} />
    </View>
  );

  // 1. Intro Layout (Scrollable Page)
  if (!currentActivityId) {
    return (
      <ScreenView style={styles.screenView}>
        <StatusBar barStyle="light-content" />
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
            <View style={styles.briefCard}>
              {/* Watermark Icon (server-driven FontAwesome5 role glyph). */}
              <View style={styles.watermarkIconContainer}>
                <FAIcon
                  name={selectedRole?.fontAwesomeIcon || "user"}
                  size={140}
                  color={colors.action.primary}
                />
              </View>

              <View style={styles.briefContent}>
                <View style={styles.roleHeader}>
                  <View style={styles.roleIconBadge}>
                    <FAIcon
                      size={20}
                      name={selectedRole?.fontAwesomeIcon || "user"}
                      color={colors.action.primary}
                    />
                  </View>
                  <View style={styles.roleTextGroup}>
                    <Text variant="h3" color="primary" style={styles.introRoleTitle}>
                      {selectedRole?.roleName || "Participant"}
                    </Text>
                    <Text variant="bodySm" color="secondary">
                      {selectedRole?.roleDescription ||
                        "No description available."}
                    </Text>
                  </View>
                </View>

                {character && character.length > 0 && (
                  <View style={styles.characterTraitsContainer}>
                    <Text
                      variant="label"
                      color="tertiary"
                      style={styles.traitsHeader}
                    >
                      Your Persona Traits
                    </Text>
                    <View style={styles.traitsList}>
                      {character.map((c, i) => (
                        <View key={i} style={styles.traitRow}>
                          <Icon
                            size={14}
                            name="check"
                            color={colors.action.primary}
                          />
                          <Text variant="bodySm" color="secondary" style={styles.traitText}>
                            {c}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            <Button
              label="Start Practice"
              onPress={async () => {
                setIsStarting(true);
                try {
                  await markActivityStart();
                } finally {
                  setIsStarting(false);
                }
              }}
              disabled={isStarting}
              loading={isStarting}
              style={styles.startButton}
            />
          </View>
        </CustomScrollView>
      </ScreenView>
    );
  }

  // 2. Chat Layout (Flex Box + Dock)
  return (
    <ScreenView style={styles.screenView}>
      <StatusBar barStyle="light-content" />
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
                variant="body"
                color={message.type === "incoming" ? "primary" : "inverse"}
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

      {exitSheet}
    </ScreenView>
  );
};

export default Chat;

const useStyles = makeStyles((c) => ({
  screenView: {
    paddingBottom: 0,
    backgroundColor: c.background.canvas,
  },
  canvas: {
    backgroundColor: c.background.canvas,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing["2xl"],
    flexGrow: 1,
    paddingHorizontal: space.screenX,
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
  suggestionText: {
    textAlign: "left",
  },

  // Bottom Dock
  bottomDockContainer: {
    // SmartRecorder owns its own margins/positioning.
  },
  suggestionsDock: {
    marginTop: spacing.lg,
    marginBottom: 0, // Sit right on top of recorder
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
    maxWidth: 280, // Cap width for carousel
    minWidth: 100,
  },
  selectedSuggestionCard: {
    backgroundColor: c.action.primary,
    borderColor: c.action.primary,
  },
  introContainer: {
    marginTop: spacing.sm,
  },
  briefCard: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    position: "relative",
    overflow: "hidden",
    minHeight: 220,
    gap: spacing["2xl"],
    backgroundColor: c.surface.elevated,
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
    gap: spacing["2xl"],
  },
  roleHeader: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  roleIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.surface.control,
    justifyContent: "center",
    alignItems: "center",
  },
  roleTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  introRoleTitle: {
    // color/variant handled on the <Text> element
  },
  characterTraitsContainer: {
    padding: spacing.lg,
    backgroundColor: c.surface.default,
    borderRadius: radius.input,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  traitsHeader: {
    // color/variant handled on the <Text> element
  },
  traitsList: {
    gap: spacing.sm,
  },
  traitRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  traitText: {
    flex: 1,
  },
  startButton: {
    marginTop: spacing.xl,
    marginBottom: spacing["4xl"],
  },
}));
