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
import { useMarkActivityStart } from "../../../../../../../hooks/useMarkActivityStart";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";

import ScreenView from "../../../../../../../components/ScreenView";
import {
  InterviewEDPStackNavigationProp,
  InterviewEDPStackParamList,
} from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";


const Briefing = () => {
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

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
    contentId: interview?.id,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "Interview",
    // Interview briefing historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

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
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: HEADER_HEIGHT + insets.top + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSectionMinimal}>
            <Text style={styles.heroTitleMinimal}>{interview.name}</Text>
            <Text style={styles.heroDescriptionMinimal}>{interview.description}</Text>
          </View>

          {/* Scenario Details Section */}
          <View style={styles.scenarioCardLight}>
            <View style={styles.scenarioCardHeaderLight}>
              <Icon name="bookmark" size={14} color="#EA580C" />
              <Text style={styles.scenarioCardTitleLight}>THE SCENARIO</Text>
            </View>

            <Text style={styles.scenarioCardTextLight}>
              {data?.scenario.scenarioDetails || "Prepare for your simulated interview session."}
            </Text>

            <View style={styles.scenarioWatermarkLight} pointerEvents="none">
              <Icon 
                name={data?.scenario.availableRole.fontAwesomeIcon || "user-tie"} 
                size={140} 
                color="#FFF7ED" 
              />
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeadingMinimal}>Tips</Text>
            <View style={styles.timelineContainer}>
              {(data?.stage.userCharacter || []).map((tip: string, index: number, arr: string[]) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineTrack}>
                    <View style={styles.timelineDot} />
                    {index !== arr.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineText}>{tip}</Text>
                  </View>
                </View>
              ))}
            </View>
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
            onPress={async () => {
              const activityId = await markActivityStart();
              if (activityId) {
                navigation.navigate("InterviewChat", {
                  interview,
                  practiceActivityId: activityId,
                  packContext,
                } as any);
              }
            }}
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
    flex: 1,
    paddingBottom: 0,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 80,
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

  startButton: {
    marginTop: 20,
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
  },
  // Minimal Styles
  heroSectionMinimal: {
    marginBottom: 32,
  },
  heroTitleMinimal: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 40,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -1,
    lineHeight: 48,
  },
  heroDescriptionMinimal: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  sectionHeadingMinimal: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    color: '#111827',
    marginBottom: 16,
  },
  timelineSection: {
    marginTop: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.library.blue[500],
    marginTop: 7,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  // Light Warm Scenario Card
  scenarioCardLight: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    marginBottom: 40,
    padding: 32,
    gap: 20,
    borderWidth: 1,
    borderColor: "#FFEDD5", // Soft warm border
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
  },
  scenarioCardHeaderLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scenarioCardTitleLight: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#EA580C",
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  scenarioCardTextLight: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151",
    lineHeight: 28,
    fontSize: 17,
  },
  scenarioWatermarkLight: {
    position: "absolute",
    right: -30,
    bottom: -30,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },
});
