import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";

import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import MasonryTips from "../../../components/MasonryTips";
import DonePractice from "../../../components/DonePractice";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";
import SmartRecorder from "../../ReadingPractice/StoryPractice/components/SmartRecorder";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { useActivityStore } from "../../../../../../stores/activity";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../api/recordings/types";

// Tool Types (Simplified for Twister if needed, or reuse generic)
enum ToolType {
  DAF = "DAF",
}

const { width } = Dimensions.get("window");

const Twister = () => {
  const navigation = useNavigation();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const {
    voiceRecordingUri,
    setVoiceRecordingUri,
    submitVoiceRecording,
    resetRecording,
  } = useRecordedVoice(user?.id);

  // --- State ---
  const [twisters, setTwisters] = useState<FunPractice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Tools State (Optional, keeping minimal for now)
  const [selectedPracticeTool, setSelectedPracticeTool] = useState<string>("");
  const [activeToolSheet, setActiveToolSheet] = useState<string | null>(null);

  // --- Effects ---

  useEffect(() => {
    const fetchTwisters = async () => {
      const ts = await getFunPracticeByType(FunPracticeType.TONGUE_TWISTER);
      setTwisters(ts);
      // Randomize start index or keep 0
      if (ts.length > 0) {
        setCurrentIndex(Math.floor(Math.random() * ts.length));
      }
      setHasHydrated(true);
    };
    fetchTwisters();
  }, []);

  // Hide Bottom Tab Bar unconditionally when on this screen
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

  // --- Actions ---

  const toggleIndex = () => {
    if (twisters && twisters.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % twisters.length);
      // Reset recording when switching
      resetRecording();
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    if (!twisters || twisters.length === 0) {
      console.warn("Cannot start activity: Tongue twisters not yet loaded.");
      return;
    }
    try {
      const newActivity = await createPracticeActivity({
        sessionId: practiceSession.id,
        contentType: PracticeActivityContentType.FUN_PRACTICE,
        contentId: twisters[currentIndex].id,
      });
      const startedActivity = await startPracticeActivity({
        id: newActivity.id,
        userId: practiceSession.user.id,
      });
      addActivity({
        ...startedActivity,
        funPractice: twisters[currentIndex],
      });
      setCurrentActivityId(newActivity.id);
    } catch (e) {
      console.error("Failed to start activity", e);
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if (!practiceSession || !doesActivityExist(activityId)) return;
    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId: practiceSession.user.id,
    });
    updateActivity(activityId, {
      ...completedActivity,
      funPractice: twisters[currentIndex],
    });
  };

  const onDonePress = async () => {
    try {
      if (!currentActivityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(currentActivityId);
      if (voiceRecordingUri) {
        await submitVoiceRecording({
          recordingSource: RecordingSourceType.ACTIVITY,
          activityId: currentActivityId,
        });
      }
      setPracticeComplete(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  // --- Render Helpers ---

  // --- Main Render ---

  if (practiceComplete) {
    return <DonePractice />;
  }

  // 1. Pre-Practice (Tips) View
  if (!currentActivityId) {
    return (
      <ScreenView style={styles.screenView}>
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#FFF7ED", "#FFEEF8", "#FFFFFF"]}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.header}>
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
          <Text style={styles.screenHeaderTitle}>Tongue Twister</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.noteHeaderBanner}>
            <LinearGradient
              colors={["#FFE4E6", "#FFEDD5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.noteHeaderTextContainer}>
              <Text style={styles.noteHeaderTitle}>Tips</Text>
              <Text style={styles.noteHeaderSubtitle}>
                Warm up your articulators
              </Text>
            </View>
            <TherapistFace size={72} />
          </View>

          {/* Use hints from current twister or generic */}
          <MasonryTips
            tips={
              twisters[currentIndex]?.tongueTwisterData?.hints || [
                "Start slowly and focus on clarity.",
                "Repeat the phrase faster each time.",
                "Exaggerate your mouth movements.",
              ]
            }
          />

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
            disabled={isStarting || !hasHydrated}
            style={styles.startButton}
          >
            <LinearGradient
              colors={
                !hasHydrated
                  ? ["#94A3B8", "#64748B"]
                  : [
                      theme.colors.library.orange[400],
                      theme.colors.library.orange[500],
                    ]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>
                {!hasHydrated ? "Loading..." : "Start Practice"}
              </Text>
              {hasHydrated && (
                <Icon name="arrow-right" size={16} color="#FFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </CustomScrollView>
      </ScreenView>
    );
  }

  const bottomPadding = 400; // Space for the dock

  // 2. Active Practice View
  return (
    <ScreenView style={styles.screenView}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FDF2F8", "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Twister</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Reading Content */}
      <View style={{ flex: 1 }}>
        <CustomScrollView
          scrollEnabled={true}
          contentContainerStyle={[
            styles.readingScrollContent,
            { paddingBottom: bottomPadding },
          ]}
        >
          <View style={styles.cardContainer}>
            {/* 1. Warm Gradient Header */}
            <LinearGradient
              colors={["#F59E0B", "#D97706"]} // Amber
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="wind" size={12} color="#92400E" />
                  <Text style={styles.categoryPillText}>TWISTER</Text>
                </View>

                {/* Glassy Next Button */}
                <TouchableOpacity
                  onPress={toggleIndex}
                  style={styles.glassButton}
                >
                  <Text style={styles.glassButtonText}>Next</Text>
                  <Icon name="chevron-right" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Watermark */}
              <View style={styles.headerWatermark}>
                <Icon name="wind" size={96} color="rgba(255,255,255,0.15)" />
              </View>
            </LinearGradient>

            {/* 2. White Sheet Content */}
            <View style={styles.cardBodySheet}>
              {/* Internal Watermark */}
              <View style={styles.sheetWatermarkContainer}>
                <Icon
                  name="wind"
                  size={120}
                  color={theme.colors.library.orange[100]}
                />
              </View>

              <View style={styles.textArea}>
                <Text style={styles.titleText}>
                  {twisters[currentIndex]?.name}
                </Text>
                <Text style={styles.readingText}>
                  {twisters[currentIndex]?.tongueTwisterData?.text}
                </Text>
              </View>
            </View>
          </View>
        </CustomScrollView>
      </View>

      {/* Action Dock (Fixed Bottom) */}
      <View style={styles.actionDockWrapper}>
        <SmartRecorder
          onRecorded={setVoiceRecordingUri}
          onToggle={toggleIndex}
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
          renderTools={() => (
            <View style={styles.dockTools}>
              {/* Placeholder for tools if we want to add Metronome later */}
              <View style={{ flex: 1 }} />
            </View>
          )}
        />
      </View>
    </ScreenView>
  );
};

export default Twister;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  screenHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  // Tips Styles
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  noteHeaderBanner: {
    marginVertical: 20,
    borderRadius: 24,
    height: 120,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  noteHeaderTextContainer: {
    flex: 1,
    gap: 4,
    zIndex: 2,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#881337",
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#9F1239",
    fontWeight: "500",
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

  // Reading Mode Styles
  readingScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  textArea: {
    marginTop: 16,
    alignItems: "center",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    opacity: 0.7,
  },
  readingText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.default,
    lineHeight: 36,
    fontSize: 24,
    textAlign: "center",
  },

  // Action Dock
  actionDockWrapper: {},
  dockTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },

  // Card UI
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minHeight: 450,
  },
  cardHeaderGradient: {
    padding: 24,
    paddingBottom: 48, // Space for overlap
    position: "relative",
    height: 180,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 1,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  glassButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -10,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40, // Overlap
    padding: 32,
    paddingBottom: 40,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetWatermarkContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
    zIndex: 0,
  },
});
