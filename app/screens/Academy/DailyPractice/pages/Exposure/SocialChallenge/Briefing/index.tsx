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
  SCEDPStackParamList,
  SCEDPStackNavigationProp,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Button from "../../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { useSessionStore } from "../../../../../../../stores/session";
import {
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useActivityStore } from "../../../../../../../stores/activity";

const Briefing = () => {
  const { practiceSession } = useSessionStore();
  const { addActivity } = useActivityStore();
  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();
  const route = useRoute<RouteProp<SCEDPStackParamList, "SCBriefing">>();
  const { sc } = route.params;
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
      contentId: sc.id,
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

  useEffect(() => {
    console.log("Begin Challenge", { currentActivityId });
    currentActivityId &&
      navigation.navigate("SCChat", {
        sc,
        practiceActivityId: currentActivityId,
      });
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
          <Text style={styles.headerTitle}>Social Challenge</Text>
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
                  sc.practiceData?.scenario.availableRole.fontAwesomeIcon ||
                  "user-tie"
                }
                size={120}
                color="#EA580C"
              />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleplayTitleText}>{sc.name}</Text>
                <Text style={styles.roleplayDescText}>{sc.description}</Text>
              </View>

              {/* Scenario Details Section */}
              <View style={styles.scenarioSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="info-circle" size={14} color="#C2410C" />
                  <Text style={styles.sectionTitle}>The Scenario</Text>
                </View>
                <Text style={styles.scenarioText}>
                  {sc.practiceData?.scenario.scenarioDetails ||
                    "Navigate this social situation with confidence."}
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
                <Text style={styles.noteHeaderSubtitle}>Before you start</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            {/* Masonry Tips Grid */}
            <MasonryTips tips={sc.practiceData?.stage.userCharacter || []} />
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
              <Text style={styles.startButtonText}>Begin Challenge</Text>
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
