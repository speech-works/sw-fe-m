import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  createPracticeActivity,
  createPracticeActivityFromPack,
  startPracticeActivity,
} from "../../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  InterviewEDPStackNavigationProp,
  InterviewEDPStackParamList,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import MasonryTips from "../../../../components/MasonryTips";

const Briefing = () => {
  const { user } = useUserStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { addActivity } = useActivityStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
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

  const data = interview.practiceData || interview.interviewPracticeData;

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
    const userId = isPackContext
      ? user?.id
      : (sessionToUse!.user?.id ?? user?.id);

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
    useUserStore.getState().fetchUser();
    setCurrentActivityId(activityIdToStart);

    navigation.navigate("InterviewChat", {
      interview,
      practiceActivityId: activityIdToStart,
      packContext,
    } as any);
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.topNavigationContainer,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
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
        </BlurView>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: HEADER_HEIGHT + insets.top + 20,
            }}
          showsVerticalScrollIndicator={false}
        >
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
                  data?.scenario.availableRole.fontAwesomeIcon || "user-tie"
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
                  {data?.scenario.scenarioDetails ||
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
            <MasonryTips tips={data?.stage.userCharacter || []} />
          </View>
        </ScrollView>

        {/* Fixed Start Button at the bottom */}
        <View
          style={[
            styles.bottomActionContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={markActivityStart}
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
              <Text style={styles.startButtonText}>Begin Interview</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 180,
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    marginBottom: 0,
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
  bottomActionContainer: {
    paddingHorizontal: 24,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
