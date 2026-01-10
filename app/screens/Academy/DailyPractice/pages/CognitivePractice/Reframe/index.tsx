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
import RainOverlay from "./components/RainOverlay";

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
                <RainOverlay />
                <View style={styles.negativeLabelRow}>
                  <Icon name="cloud-rain" size={14} color="#A5B4FC" />
                  <Text style={styles.sectionLabel}>NEGATIVE THOUGHT</Text>
                </View>
                <Text style={styles.negativeText}>
                  "{currentScenario?.negativeThought || "Loading..."}"
                </Text>
              </View>

              {/* Divider - Minimalist Space */}
              <View style={styles.dividerContainer} />

              {/* Reframe Options */}
              <View style={styles.positiveSection}>
                <View style={styles.positiveLabelRow}>
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
                        activeOpacity={0.7} // More tactile feedback
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedReframe(item)}
                      >
                        {/* Radio Circle Removed - Tile Interaction */}
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
    minHeight: 650, // Taller card
  },
  cardHeaderGradient: {
    padding: 24,
    paddingBottom: 48, // Space for overlap
    position: "relative",
    height: 160,
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
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 1.5, // Airy tracking
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  glassButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 13,
    color: "#FFF",
    fontWeight: "600",
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.1,
    transform: [{ rotate: "-15deg" }],
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    marginTop: -40, // Overlap
    paddingHorizontal: 24,
    paddingTop: 0, // Let elements float up if needed, or stick to padding
    paddingBottom: 40,
    minHeight: 500,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  // Start Overlay
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20, // Higher zIndex
    justifyContent: "flex-start",
    paddingTop: 100,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)", // More opaque for focus

    borderRadius: 32,
  },
  startContent: {
    padding: 40,
    alignItems: "center",
    gap: 20,
    backgroundColor: "#FFF",
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    width: "85%",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  startTitle: {
    ...parseTextStyle(theme.typography.Heading2), // Larger title
    textAlign: "center",
    color: "#1E1B4B", // Midnight
  },
  startDesc: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    textAlign: "center",
    color: "#4B5563",
    lineHeight: 24,
  },
  startButton: {
    width: "100%",
    backgroundColor: "#4F46E5", // Indigo 600
    height: 56,
    borderRadius: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Content Sections

  // Content Sections

  // Negative Section - Modern Hero
  negativeSection: {
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 32, // More breathing room
    marginBottom: 24,
    alignItems: "center", // Center content
    position: "relative", // Needed for RainOverlay
    overflow: "hidden", // Clip rain drops
  },
  negativeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    opacity: 0.6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2, // Wide tracking
    color: "#6B7280",
    textTransform: "uppercase",
  },
  negativeText: {
    ...parseTextStyle(theme.typography.Heading2), // Larger heading
    fontSize: 28,
    color: "#111827", // Almost black
    lineHeight: 38,
    fontWeight: "600",
    textAlign: "center",
  },

  // Divider - Vertical Space
  dividerContainer: {
    height: 16,
    width: "100%",
  },
  dividerLine: { display: "none" },
  dividerIconBox: { display: "none" },

  // Positive Section
  positiveSection: {
    width: "100%",
    gap: 16,
  },
  positiveLabelRow: {
    marginBottom: 12,
    alignItems: "center",
  },
  sectionLabelPositive: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#6366F1", // Indigo 500
    textTransform: "uppercase",
    textAlign: "center",
  },
  optionsList: {
    gap: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center", // Center vertically
    padding: 24, // Larger click area
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    // Modern "Float" shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03, // Very subtle
    shadowRadius: 16,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#6366F1", // Indigo border
    backgroundColor: "#F5F3FF", // Violet tint
    shadowColor: "#6366F1", // Colored shadow glow
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  // Removed Radio Circle styles
  radioCircle: { display: "none" },
  radioCircleSelected: { display: "none" },

  optionText: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    fontSize: 17,
    color: "#374151",
    lineHeight: 26,
    textAlign: "center", // Center text in tile
  },
  optionTextSelected: {
    color: "#4338CA", // Indigo 700
    fontWeight: "600",
  },

  // Write Own
  writeOwnContainer: {
    marginTop: 32,
    gap: 12,
  },
  writeOwnLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    padding: 8,
  },
  textAreaInput: {
    fontSize: 16,
    color: "#374151",
    minHeight: 100,
    textAlign: "center", // Center input text like the cards
  },
});
