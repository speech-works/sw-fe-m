import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import MasonryTips from "../../../../components/MasonryTips";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import {
  InterviewEDPStackParamList,
  InterviewEDPStackNavigationProp,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Button from "../../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { useSessionStore } from "../../../../../../../stores/session";
import {
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useUserStore } from "../../../../../../../stores/user";

const Briefing = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { addActivity } = useActivityStore();
  const navigation =
    useNavigation<
      InterviewEDPStackNavigationProp<keyof InterviewEDPStackParamList>
    >();
  const route =
    useRoute<RouteProp<InterviewEDPStackParamList, "InterviewBriefing">>();
  const { interview, packContext, practiceActivity } = route.params as any; // Cast to any to avoid type issues if packContext is missing from types
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );

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

    // If we are not in a pack and have no session (and creation failed), abort.
    if (!isPackContext && !sessionToUse) return;

    const sessionId = isPackContext ? undefined : sessionToUse!.id;
    const userId = isPackContext ? user?.id : sessionToUse!.user.id;

    if (!userId) {
      console.error("Missing userId");
      return;
    }

    let activityIdToStart = currentActivityId;

    // If we don't have a unique activity ID yet, create one (Standalone mode)
    if (!activityIdToStart) {
      if (isPackContext) {
        console.log("Interview - Creating Activity via POST (Pack)");
        const newActivity = await createPracticeActivityFromPack({
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
          contentId: interview.id,
        });
        activityIdToStart = newActivity.id;
      } else {
        if (!sessionId)
          throw new Error("No session ID for standalone activity");
        console.log("Interview - Creating Activity via POST (Standalone)");
        const newActivity = await createPracticeActivity({
          sessionId,
          contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
          contentId: interview.id,
        });
        activityIdToStart = newActivity.id;
      }
    }
    const startedActivity = await startPracticeActivity({
      id: activityIdToStart,
      userId: userId,
    });
    addActivity({
      ...startedActivity,
    });
    setCurrentActivityId(activityIdToStart);
  };

  useEffect(() => {
    console.log("Begin Interview", { currentActivityId });
    currentActivityId &&
      navigation.navigate("InterviewChat", {
        interview,
        practiceActivityId: currentActivityId,
        packContext,
      } as any);
  }, [currentActivityId]);

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
          <Text style={styles.headerTitle}>Interview</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Briefing Card - Matte Modern Orange */}
          <LinearGradient
            colors={["#FFF7ED", "#FFEDD5"]} // Orange 50 -> 100
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.briefCard}
          >
            {/* Watermark Icon */}
            <View style={styles.watermarkIconContainer}>
              <Icon
                name={
                  interview.practiceData?.scenario.availableRole
                    .fontAwesomeIcon || "user-tie"
                }
                size={120}
                color="#EA580C"
              />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleplayTitleText}>{interview.name}</Text>
                <Text style={styles.roleplayDescText}>
                  {interview.description}
                </Text>
              </View>

              {/* Scenario Details Section */}
              <View style={styles.scenarioSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="info-circle" size={14} color="#C2410C" />
                  <Text style={styles.sectionTitle}>The Scenario</Text>
                </View>
                <Text style={styles.scenarioText}>
                  {interview.practiceData?.scenario.scenarioDetails ||
                    "Prepare for your simulated interview session."}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            {/* Header Banner - Matte Orange */}
            <View style={styles.noteHeaderBanner}>
              <LinearGradient
                colors={["#FFEDD5", "#FED7AA"]} // Orange 100 -> 200
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.noteHeaderTextContainer}>
                <Text style={styles.noteHeaderTitle}>Pro Tips</Text>
                <Text style={styles.noteHeaderSubtitle}>Your Character</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            {/* Masonry Tips Grid */}
            <MasonryTips
              tips={interview.practiceData?.stage.userCharacter || []}
            />
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
              <Text style={styles.startButtonText}>Begin Interview</Text>
              <Icon name="arrow-right" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 120,
  },
  topNavigationContainer: {
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
  },

  // Hero Card
  briefCard: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    minHeight: 200,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginHorizontal: 0,
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -20,
    top: -20,
    opacity: 0.1,
    transform: [{ rotate: "15deg" }],
  },
  infoContainer: {
    gap: 24,
    zIndex: 1,
  },
  roleTextContainer: {
    gap: 8,
  },
  roleplayTitleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#9A3412", // Deep Orange
    fontWeight: "800",
    fontSize: 28,
  },
  roleplayDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#9A3412",
    lineHeight: 22,
    fontWeight: "500",
    opacity: 0.9,
  },
  scenarioSection: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    textTransform: "uppercase",
    color: "#1E40AF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scenarioText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#1E3A8A",
    lineHeight: 20,
  },

  // Tips
  tipsContainer: {
    gap: 0,
  },
  noteHeaderBanner: {
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 24,
    height: 120,
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
    color: "#9A3412", // Deep Orange
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#C2410C",
    fontWeight: "600",
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
});
