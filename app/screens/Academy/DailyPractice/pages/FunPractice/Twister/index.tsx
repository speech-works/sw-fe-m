import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";

import Button from "../../../../../../components/Button";
import DonePractice from "../../../components/DonePractice";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { useActivityStore } from "../../../../../../stores/activity";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../../stores/session";

const Twister = () => {
  const {
    updateActivity,
    addActivity,
    doesActivityExist,
    isActivityCompleted,
  } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const [twisters, setTwisters] = useState<FunPractice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(6);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const toggleIndex = () => {
    if (twisters && twisters.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % twisters.length);
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    if (!twisters || twisters.length === 0 || currentIndex >= twisters.length) {
      console.warn(
        "Cannot start activity: Tongue twisters not yet loaded or invalid index."
      );
      return;
    }
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.FUN_PRACTICE,
      contentId: twisters[currentIndex].id,
    });
    setCurrentActivityId(newActivity.id);
    const startedActivity = await startPracticeActivity({ id: newActivity.id });
    addActivity({
      ...startedActivity,
      funPractice: twisters[currentIndex],
    });
  };

  const markActivityComplete = async () => {
    if (
      !practiceSession ||
      !currentActivityId ||
      !doesActivityExist(currentActivityId)
    )
      return;
    const completedActivity = await completePracticeActivity({
      id: currentActivityId,
    });
    updateActivity(currentActivityId, {
      ...completedActivity,
      funPractice: twisters[currentIndex],
    });
  };

  useEffect(() => {
    const fetchTwisters = async () => {
      const ts = await getFunPracticeByType(FunPracticeType.TONGUE_TWISTER);
      setTwisters(ts);
    };
    fetchTwisters();
  }, []);

  const navigation = useNavigation();
  const [isDone, setIsDone] = useState(false);
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
            <Text style={styles.topNavigationText}>Tongue Twister</Text>
          </TouchableOpacity>
        </View>

        {/* Main content area, excluding the absolutely positioned chevron */}
        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
              <View style={styles.tipsContainer}>
                <View style={styles.tipTitleContainer}>
                  <Icon
                    solid
                    name="lightbulb"
                    size={16}
                    color={theme.colors.text.title}
                  />
                  <Text style={styles.tipTitleText}>Tips</Text>
                </View>
                <View style={styles.tipListContainer}>
                  {twisters[currentIndex]?.tongueTwisterData?.hints.map(
                    (hint) => (
                      <View key={hint} style={styles.tipCard}>
                        <Icon
                          solid
                          name="check-circle"
                          size={16}
                          color={theme.colors.library.orange[400]}
                        />
                        <Text style={styles.tipText}>{hint}</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
              <View style={styles.mainContainer}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>
                    {twisters[currentIndex]?.name}
                  </Text>
                  <Text style={styles.actualText}>
                    {twisters[currentIndex]?.tongueTwisterData?.text}
                  </Text>
                </View>
                <VoiceRecorder
                  onToggle={toggleIndex}
                  onRecording={markActivityStart}
                  onRecorded={markActivityComplete}
                />
              </View>
              {currentActivityId && isActivityCompleted(currentActivityId) && (
                <Button
                  text="Done"
                  onPress={() => {
                    setIsDone(true);
                  }}
                />
              )}
            </>
          )}
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Twister;

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
  tipsContainer: {
    padding: 16,
    gap: 16,
  },
  tipTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  tipListContainer: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  mainContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 32,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  textContainer: {
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  actualText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    textAlign: "center",
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
