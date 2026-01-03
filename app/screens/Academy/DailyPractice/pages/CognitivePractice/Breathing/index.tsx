import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  parseTextStyle,
  parseShadowStyle,
} from "../../../../../../util/functions/parseStyles";
import { BreathingHalo } from "./components/BreathingHalo";

import ProgressBar from "../../../../../../components/ProgressBar";
import Button from "../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { useBackgroundAudio } from "../../../../../../hooks/useBackgroundAudio";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { createPracticeActivity } from "../../../../../../api";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import { CognitivePracticeType } from "../../../../../../api/dailyPractice/types";
import DonePractice from "../../../components/DonePractice";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

const Breathing = () => {
  const navigation = useNavigation();

  // single “mute” state that mutes both breath sounds + background
  const [mute, setMute] = useState(false);
  // State to track elapsed seconds for the session
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null
  );
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const totalSessionDurationInSeconds = 5 * 60; // 5 minutes converted to seconds

  // background hook (load, toggle, stop)
  const { loadBackground, toggleBackground, stopBackground } =
    useBackgroundAudio();

  const { addActivity, updateActivity } = useActivityStore();
  const { practiceSession } = useSessionStore();

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const markActivityStart = async () => {
    if (!practiceSession || !cognitivePracticeId) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
      contentId: cognitivePracticeId,
    });
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity(startedActivity);
    setCurrentActivityId(newActivity.id);
  };

  const markActivityDone = async () => {
    if (!practiceSession || !cognitivePracticeId || !currentActivityId) return;
    const completedActivity = await completePracticeActivity({
      id: currentActivityId,
      userId: practiceSession.user.id,
    });
    updateActivity(currentActivityId, {
      ...completedActivity,
    });
  };

  // ─── On mount: load the music, then immediately play it (because mute === false) ────
  useEffect(() => {
    let isCurrent = true;
    const prepare = async () => {
      await loadBackground();
      if (isCurrent) {
        // Only start background music if not done
        if (!isDone) {
          toggleBackground(true);
        }
      }
    };
    prepare();

    return () => {
      isCurrent = false;
    };
  }, [loadBackground, toggleBackground, isDone]); // Add isDone to dependency array

  // ─── Whenever mute flips, stop/play background in sync ──────────────────────────
  useEffect(() => {
    // Only toggle background if not done
    if (!isDone) {
      toggleBackground(!mute);
    } else {
      // If done, ensure background is stopped
      stopBackground();
    }
  }, [mute, toggleBackground, stopBackground, isDone]); // Add stopBackground and isDone to dependency array

  // ─── Timer for session progress ────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    // Start the timer when the component mounts and if not done
    if (!isDone) {
      interval = setInterval(() => {
        setElapsedSeconds((prevSeconds) => {
          // Stop the timer if the session is complete
          if (prevSeconds >= totalSessionDurationInSeconds) {
            clearInterval(interval);
            return totalSessionDurationInSeconds; // Cap at total duration
          }
          return prevSeconds + 1; // Increment by 1 second
        });
      }, 1000); // Update every 1000 milliseconds (1 second)
    }

    // Clear the interval when the component unmounts or when isDone becomes true
    return () => clearInterval(interval);
  }, [isDone]); // Add isDone to dependency array

  // ─── When unmounting, fully stop & unload the background track ───────────────────
  useEffect(() => {
    return () => {
      stopBackground();
    };
  }, [stopBackground]);

  useEffect(() => {
    const fetchCP = async () => {
      const cp = await getCognitivePracticeByType(
        CognitivePracticeType.GUIDED_BREATHING
      );
      setCognitivePracticeId(cp[0]?.id || null);
    };
    fetchCP();
  }, []);

  // Calculate elapsed minutes and remaining seconds for display
  const displayMinutes = Math.floor(elapsedSeconds / 60);
  const displaySeconds = elapsedSeconds % 60;
  const totalDisplayMinutes = totalSessionDurationInSeconds / 60;

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        {/* ── Top Bar with Back + Mute Button ──────────────────────────────────────── */}
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
            <Text style={styles.topNavigationText}>Breathing</Text>
          </TouchableOpacity>

          {/* Single button toggles both music + breath - Only show if not done */}
          {!isDone && currentActivityId && (
            <TouchableOpacity onPress={() => setMute((prev) => !prev)}>
              <Icon
                name={mute ? "volume-mute" : "volume-up"}
                size={16}
                color={theme.colors.actionPrimary.default}
              />
            </TouchableOpacity>
          )}
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <>
            {isDone ? (
              <DonePractice />
            ) : currentActivityId ? (
              <View style={styles.exerciseContainer}>
                {/* ── Breathing Halo (passes down the same “mute” prop) ───────────────────────── */}
                <View style={styles.haloContainer}>
                  <BreathingHalo
                    inhale={4}
                    hold={4}
                    exhale={4}
                    repeat
                    mute={mute}
                  />
                </View>
                <View style={styles.actionContainer}>
                  {/* ── Session Progress ───────────────────────────────────────────────────────── */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTitle}>
                      <Text style={styles.progressTitleText}>
                        Session Progress
                      </Text>
                      <Text style={styles.progressDescText}>
                        {displayMinutes}/{totalDisplayMinutes} minutes
                      </Text>
                    </View>
                    <ProgressBar
                      currentStep={elapsedSeconds} // Use elapsedSeconds for current progress
                      totalSteps={totalSessionDurationInSeconds} // Use totalSessionDurationInSeconds for the total steps
                      showStepIndicator={false}
                      showPercentage={false}
                    />
                  </View>

                  <Button
                    text="Mark Complete"
                    onPress={async () => {
                      setIsLoading(true);
                      try {
                        await markActivityDone();
                        setIsDone(true);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  />
                </View>
              </View>
            ) : (
              <View>
                {/* ── Practice Tips ─────────────────────────────────────────────────────────── */}
                <View style={styles.tipsContainer}>
                  {/* Header Banner */}
                  <View style={styles.noteHeaderBanner}>
                    <LinearGradient
                      colors={["#FFE4E6", "#FFEDD5"]} // Soft Pink to Orange
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.noteHeaderTextContainer}>
                      <Text style={styles.noteHeaderTitle}>Tips</Text>
                      <Text style={styles.noteHeaderSubtitle}>
                        Before you start
                      </Text>
                    </View>
                    <TherapistFace size={72} />
                  </View>

                  {/* Vertical Stack */}
                  <View style={styles.noteStack}>
                    {[
                      "Take deep breaths before starting. Feel your diaphragm expand.",
                      "Maintain a relaxed facial posture. Release jaw tension.",
                      "It's okay to take your time. Focus on smooth transitions.",
                    ].map((hint, index) => (
                      <View key={index} style={styles.noteCard}>
                        <View style={styles.noteIconBadge}>
                          <Icon
                            name="lightbulb"
                            size={14}
                            color="#F59E0B"
                            solid
                          />
                        </View>
                        <View style={styles.noteContent}>
                          <Text style={styles.noteTitle}>Tip {index + 1}</Text>
                          <Text style={styles.noteBody}>{hint}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={markActivityStart}
                  style={[
                    styles.startButton,
                    { marginHorizontal: 20, marginTop: 10 },
                  ]}
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
                    <Text style={styles.startButtonText}>Start Exercise</Text>
                    <Icon name="arrow-right" size={16} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Breathing;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    height: "100%",
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
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
  haloContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
  },
  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
  },
  noteHeaderBanner: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 24,
    height: 120, // tall banner
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  noteHeaderTextContainer: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 24,
    fontWeight: "800",
    color: "#881337", // Deep pink/red text
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#9F1239",
    fontWeight: "500",
  },
  noteStack: {
    paddingHorizontal: 0,
    gap: 16,
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    // Soft, premium shadow like iOS Notes
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  noteIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7", // faint yellow
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  noteContent: {
    flex: 1,
    gap: 4,
  },
  noteTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: "#171717",
  },
  noteBody: {
    ...parseTextStyle(theme.typography.Body),
    color: "#525252",
    lineHeight: 22,
  },
  startButton: {
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
    fontWeight: "700",
  },
  progressContainer: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: 24,
    gap: 16,
  },
  progressTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  progressDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  exerciseContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    height: "100%",
  },
  actionContainer: {
    gap: 20,
  },
});
