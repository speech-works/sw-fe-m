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
import RecordingWidget from "../../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../../components/Button";

const Chat = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<InterviewEDPStackParamList, "InterviewChat">>();
  const { interviewTitle } = route.params;

  const [isDone, setIsDone] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null
  );

  // 1) Store the measured height of one message bubble
  const [messageHeight, setMessageHeight] = useState<number | null>(null);

  // 2) Keep a ref to the ScrollView so we can scrollToEnd() when collapsed
  const chatScrollRef = useRef<ScrollView>(null);

  // 3) Track whether we’re expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // 4) Once we know one bubble’s height, scroll to bottom if collapsed
  useEffect(() => {
    if (!isExpanded && messageHeight != null && chatScrollRef.current) {
      // Wait one frame to ensure content layout, then jump to end
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: false });
      }, 0);
    }
  }, [messageHeight, isExpanded]);

  // 5) onLayout for our “hidden” measuring bubble
  const onFirstMessageLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height !== messageHeight) {
      setMessageHeight(height);
    }
  };

  // 6) Toggle handler for expand/collapse with animation
  const toggleExpand = () => {
    const next = !isExpanded;

    if (!next && messageHeight != null && chatScrollRef.current) {
      // We’re about to collapse → configure the LayoutAnimation
      // and pass a callback that scrolls to bottom when the animation ends.
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut,
        () => {
          // This callback is invoked _after_ the height‐change animation finishes:
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }
      );
    } else {
      // No callback needed when expanding
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    setIsExpanded(next);
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
            <Text style={styles.topNavigationText}>{interviewTitle}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleExpand}
            style={[
              styles.chevronContainer,
              isDone
                ? {
                    opacity: 0,
                    pointerEvents: "none",
                  }
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

        {/* Main content area, excluding the absolutely positioned chevron */}
        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
              <View style={styles.messagesContainer}>
                {/*
                   HIDDEN MEASURING BUBBLE (off-screen, invisible).
                   Once onLayout fires, we store its height in messageHeight.
                */}
                <View
                  style={[styles.incomingMessage, styles.hiddenMeasureBubble]}
                  onLayout={onFirstMessageLayout}
                >
                  <Text style={styles.incomingMessageText}>
                    {/* Use a “longest possible” example text here so we capture the
                        maximum height any bubble might need. */}
                    This is just for measurement. Replace with a typical longest
                    message to calibrate.
                  </Text>
                </View>

                {/*
                   REAL CHAT AREA:
                   - If collapsed (isExpanded === false): force height = messageHeight
                     so only one bubble shows. pagingEnabled snaps one bubble at a time.
                   - If expanded (isExpanded === true): remove height restriction so
                     all messages become visible/scrollable in one long list.
                   We attach a ref so we can scrollToEnd() when collapsed.
                */}
                <CustomScrollView
                  ref={chatScrollRef}
                  contentContainerStyle={styles.chatsScrollView}
                  style={
                    isExpanded
                      ? {} // no fixed height → show all messages
                      : messageHeight
                      ? { height: messageHeight }
                      : { maxHeight: 0 } // until measured, collapse
                  }
                  pagingEnabled={!isExpanded}
                  showsVerticalScrollIndicator
                >
                  {/* YOUR ACTUAL MESSAGE BUBBLES: */}
                  <View style={styles.incomingMessage}>
                    <Text style={styles.incomingMessageText}>
                      Welcome! We're happy to have you. To begin, could you tell
                      us a bit about yourself?
                    </Text>
                  </View>
                  <View style={styles.outgoingMessage}>
                    <Text style={styles.outgoinggMessageText}>
                      Thank you! I'm a recent graduate, passionate about media
                      and I'm keen to start my career with you.
                    </Text>
                  </View>
                  <View style={styles.incomingMessage}>
                    <Text style={styles.incomingMessageText}>
                      That's great. Do you feel prepared for a professional
                      environment?
                    </Text>
                  </View>
                  {/* …more messages as needed… */}
                </CustomScrollView>

                {/* Separator and Suggestions are still inside messagesContainer */}
                <Separator />

                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitleText}>
                    Suggested Responses:
                  </Text>
                  <View style={styles.suggestedTextContainer}>
                    {[
                      "During my studies, I worked on a team project.",
                      "I had a volunteer role where I was responsible for organizing events.",
                    ].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.suggestionCard,
                          s === selectedSuggestion
                            ? styles.selectedSuggestionCard
                            : null,
                        ]}
                        onPress={() => setSelectedSuggestion(s)}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            s === selectedSuggestion
                              ? styles.selectedSuggestionText
                              : null,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.recordingContainer}>
                <RecordingWidget />
                <View style={styles.recorderContainer}>
                  <RecorderWidget />
                  <Text style={styles.recordTipText}>
                    Tap microphone to {"start"} speaking
                  </Text>
                </View>
              </View>

              <Button
                text="Mark Complete"
                onPress={() => {
                  setIsDone(true);
                }}
              />
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
  },
  container: {
    flex: 1, // Ensure container takes full height to position absolute children
    gap: 32, // Gap for top navigation and scroll content
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1, // Allow content to grow
    padding: SHADOW_BUFFER,
    paddingBottom: 20,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },

  messagesContainer: {
    padding: 16,
    gap: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    // shadowOpacity: 1,
  },

  /***** HIDDEN BUBBLE (for measurement only) *****/
  hiddenMeasureBubble: {
    position: "absolute",
    opacity: 0,
    top: -9999,
    left: -9999,
  },

  chatsScrollView: {
    gap: 16,
    /* No hard-coded height here; overridden via style={} in JSX. */
  },

  incomingMessage: {
    padding: 16,
    borderRadius: 16,
    borderTopLeftRadius: 2,
    backgroundColor: theme.colors.library.blue[100],
    width: "80%",
  },
  incomingMessageText: {
    color: theme.colors.text.default,
  },

  outgoingMessage: {
    padding: 16,
    borderRadius: 16,
    borderTopRightRadius: 2,
    backgroundColor: theme.colors.library.orange[100],
    width: "80%",
    alignSelf: "flex-end",
  },
  outgoinggMessageText: {
    color: theme.colors.text.default,
  },

  chevronContainer: {
    padding: 8,
    alignItems: "center",
  },

  suggestionsContainer: {
    gap: 16,
  },
  suggestionsTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  suggestedTextContainer: {
    gap: 8,
  },
  suggestionCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface.default,
  },
  selectedSuggestionCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedSuggestionText: {
    color: theme.colors.text.onDark,
  },
  suggestionText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },

  recordingContainer: {
    padding: 16,
    gap: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  recorderContainer: {
    gap: 16,
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
