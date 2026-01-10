import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/CognitivePracticeStack/types";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import TextArea from "../../../../../../components/TextArea";
import Button from "../../../../../../components/Button";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/types";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePracticeType,
  ReframingThoughtScenarioData,
} from "../../../../../../api/dailyPractice/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { createPracticeActivity } from "../../../../../../api";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import DonePractice from "../../../components/DonePractice";
import { LinearGradient } from "expo-linear-gradient";

const Reframe = () => {
  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const academyNav =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const [selectedReframe, setSelectedReframe] = React.useState<string | null>(
    null
  );
  const { addActivity, updateActivity } = useActivityStore();
  const { practiceSession } = useSessionStore();

  const [writtenReframe, setWrittenReframe] = React.useState<string>("");
  const [scenarios, setScenarios] = useState<ReframingThoughtScenarioData[]>(
    []
  );
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null
  );
  const [isDone, setIsDone] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const onBackPress = () => {
    navigation.goBack();
  };

  const toggleIndex = () => {
    if (scenarios && scenarios.length > 0) {
      setSelectedScenarioIndex(
        (prevIndex) => (prevIndex + 1) % scenarios.length
      );
      setSelectedReframe(null);
      setWrittenReframe("");
    }
  };

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

  // Fetch all reframe scenarios once on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      const rs = await getCognitivePracticeByType(
        CognitivePracticeType.REFRAMING_THOUGHTS
      );
      setScenarios(rs[0].reframingThoughtsData?.scenarios || []);
      setCognitivePracticeId(rs[0]?.id || null);
    };
    fetchScenarios();
  }, []);

  if (isDone) {
    return <DonePractice />;
  }

  const currentScenario = scenarios[selectedScenarioIndex];

  return (
    <ScreenView style={styles.screenView}>
      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#E0E7FF", "#EEF2FF", "#FFFFFF"]} // Soft Indigo/White
          locations={[0, 0.6, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Reframe Thoughts</Text>
        <View style={{ width: 32 }} />
      </View>

      <CustomScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 120 }]}
      >
        <View style={styles.cardContainer}>
          {/* 1. Indigo/Blurple Gradient Header */}
          <LinearGradient
            colors={["#6366F1", "#818CF8"]} // Indigo 500 -> 400
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderGradient}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.categoryPill}>
                <Icon name="brain" size={12} color="#FFF" />
                <Text style={styles.categoryPillText}>REFRAME</Text>
              </View>

              {/* Glassy Shuffle Button */}
              <TouchableOpacity
                onPress={toggleIndex}
                style={styles.glassButton}
              >
                <Text style={styles.glassButtonText}>Shuffle</Text>
                <Icon name="random" size={12} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Watermark */}
            <View style={styles.headerWatermark}>
              <Icon name="cloud" size={96} color="rgba(255,255,255,0.15)" />
            </View>
          </LinearGradient>

          {/* 2. White Sheet Content */}
          <View style={styles.cardBodySheet}>
            {/* Content (Blurred or Visible based on state) */}
            <View
              style={{ opacity: !currentActivityId ? 0.3 : 1, width: "100%" }}
            >
              {/* Negative Thought Section */}
              <View style={styles.negativeSection}>
                <View style={styles.negativeLabelRow}>
                  <Icon
                    name="cloud-rain"
                    size={14}
                    color={theme.colors.text.disabled}
                  />
                  <Text style={styles.sectionLabel}>NEGATIVE THOUGHT</Text>
                </View>
                <Text style={styles.negativeText}>
                  "{currentScenario?.negativeThought || "Loading..."}"
                </Text>
              </View>

              {/* Divider Arrow */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerIconBox}>
                  <Icon name="arrow-down" size={14} color="#6366F1" />
                </View>
                <View style={styles.dividerLine} />
              </View>

              {/* Reframe Options */}
              <View style={styles.positiveSection}>
                <View style={styles.positiveLabelRow}>
                  <Icon name="sun" size={14} color="#F59E0B" />
                  <Text style={styles.sectionLabelPositive}>
                    CHOOSE A BETTER PERSPECTIVE
                  </Text>
                </View>

                <View style={styles.optionsList}>
                  {currentScenario?.reframedThoughts.map((item, index) => {
                    const isSelected = selectedReframe === item;
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedReframe(item)}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && (
                            <Icon name="check" size={10} color="#FFF" />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Write Your Own */}
                <View style={styles.writeOwnContainer}>
                  <Text style={styles.writeOwnLabel}>Or write your own:</Text>
                  <TextArea
                    value={writtenReframe}
                    onChangeText={setWrittenReframe}
                    placeholder="I can handle this by..."
                    numberOfLines={3}
                    inputStyle={styles.textAreaInput}
                    containerStyle={styles.textAreaWrapper}
                  />
                </View>

                {(selectedReframe || writtenReframe.length > 0) && (
                  <Button
                    text="Submit Reframe"
                    onPress={async () => {
                      await markActivityDone();
                      setIsDone(true);
                    }}
                    style={{ marginTop: 24 }}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Start Button Overlay if not started - MOVED HERE */}
          {!currentActivityId && (
            <View style={styles.startOverlay}>
              <View style={styles.startContent}>
                <Text style={styles.startTitle}>
                  Ready to Shift Perspective?
                </Text>
                <Text style={styles.startDesc}>
                  Learn to identify negative thoughts and replace them with
                  empowering ones.
                </Text>
                <Button
                  text="Start Exercise"
                  onPress={markActivityStart}
                  style={styles.startButton}
                />
              </View>
            </View>
          )}
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default Reframe;

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
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Card UI
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    minHeight: 600,
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
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
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
    right: -10,
    bottom: -10,
    opacity: 0.15,
    transform: [{ rotate: "-10deg" }],
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40, // Overlap
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
    alignItems: "center",
  },

  // Start Overlay
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: "flex-start",
    paddingTop: 120, // Position higher up (overlapping header slightly)
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 32,
  },
  startContent: {
    padding: 32,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFF",
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    width: "90%",
  },
  startTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
    color: "#4F46E5", // Indigo 600
  },
  startDesc: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.default,
  },
  startButton: {
    width: "100%",
    backgroundColor: "#6366F1", // Indigo 500
  },

  // Content Sections
  negativeSection: {
    width: "100%",
    backgroundColor: "#F5F3FF", // Violet 50
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  negativeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#8B5CF6", // Violet 500
  },
  sectionLabelPositive: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#4F46E5", // Indigo 600
  },
  negativeText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    color: "#1F2937", // Gray 800
    lineHeight: 26,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E7FF",
  },
  dividerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },

  // Positive Section
  positiveSection: {
    width: "100%",
    gap: 16,
  },
  positiveLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  optionCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#6366F1",
  },
  optionText: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: "#4B5563",
  },
  optionTextSelected: {
    color: "#4338CA", // Indigo 700
    fontWeight: "500",
  },

  // Write Own
  writeOwnContainer: {
    marginTop: 16,
    gap: 8,
  },
  writeOwnLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
    color: "#6B7280",
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  textAreaInput: {
    fontSize: 15,
    color: "#374151",
    minHeight: 80,
  },
});
