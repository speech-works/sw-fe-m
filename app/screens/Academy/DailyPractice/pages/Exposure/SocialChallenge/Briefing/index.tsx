import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
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
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Social Challenge</Text>
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header Banner */}
          <View style={styles.noteHeaderBanner}>
            <LinearGradient
              colors={["#FFE4E6", "#FFEDD5"]} // Soft Pink to Orange
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.noteHeaderTextContainer}>
              <Text style={styles.noteHeaderTitle}>Briefing</Text>
              <Text style={styles.noteHeaderSubtitle}>Before you start</Text>
            </View>
            <TherapistFace size={72} />
          </View>

          {/* Scenario Info Card */}
          <View style={styles.noteStack}>
            <View style={styles.noteCard}>
              <View
                style={[
                  styles.noteIconBadge,
                  { backgroundColor: theme.colors.library.blue[100] },
                ]}
              >
                <Icon
                  size={14}
                  name={
                    sc.practiceData?.scenario.availableRole.fontAwesomeIcon ||
                    "user-tie"
                  }
                  color={theme.colors.library.blue[400]}
                />
              </View>
              <View style={styles.noteContent}>
                <Text style={styles.noteTitle}>{sc.name}</Text>
                <Text style={styles.noteBody}>{sc.description}</Text>
              </View>
            </View>

            {/* Character Tips */}
            {sc.practiceData?.stage.userCharacter.map((c, i) => (
              <View key={i} style={styles.noteCard}>
                <View style={styles.noteIconBadge}>
                  <Icon name="lightbulb" size={14} color="#F59E0B" solid />
                </View>
                <View style={styles.noteContent}>
                  <Text style={styles.noteTitle}>Tip {i + 1}</Text>
                  <Text style={styles.noteBody}>{c}</Text>
                </View>
              </View>
            ))}
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
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
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
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
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
});
