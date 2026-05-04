import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import CustomScrollView from "../../../../../components/CustomScrollView";
import ScreenView from "../../../../../components/ScreenView";
import {
    LibStackNavigationProp,
    LibStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { finalAnswers, from } = route.params;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const rotationAnim = useRef<Record<string, Animated.Value>>({}).current;

  finalAnswers.forEach((item) => {
    if (!rotationAnim[item.question.id]) {
      rotationAnim[item.question.id] = new Animated.Value(0);
    }
  });

  const toggleExplanation = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const isExp = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: isExp }));
    Animated.timing(rotationAnim[id], {
      toValue: isExp ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const correctCount = finalAnswers.filter(
    (item) => item.yourAnswer.isCorrect,
  ).length;
  const totalCount = finalAnswers.length;
  const scorePercentage = Math.round((correctCount / totalCount) * 100);

  return (
    <ScreenView style={styles.screenView}>
      {/* Confetti Animation */}
      <ConfettiAnimation />

      <LinearGradient
        colors={["#FFF7ED", "#FFF", "#FFF"]}
        locations={[0, 0.4, 1]}
        style={styles.gradientBackground}
      />

      <View style={styles.container}>
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          {/* Beautiful Checkmark */}
          <View style={styles.checkmarkSection}>
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkmarkCircle}
            >
              <Icon name="check" size={52} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.encouragingMessage}>
              {scorePercentage >= 80
                ? "Excellent work!"
                : scorePercentage >= 60
                  ? "Great effort!"
                  : "Keep practicing!"}
            </Text>
          </View>

          {/* Carousel Stats Dashboard */}
          <View style={styles.statsContainer}>
            <View style={styles.carouselCard}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carousel}
                contentContainerStyle={styles.carouselContent}
              >
                {/* Score Slide */}
                <View style={styles.carouselSlide}>
                  <LinearGradient
                    colors={["#A78BFA", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideHeader}>
                      <Text style={styles.slideTitle}>Your Score</Text>
                      <Icon
                        name="trophy"
                        size={20}
                        color="rgba(255,255,255,0.9)"
                      />
                    </View>
                    <View style={styles.slideContent}>
                      <Text style={styles.slideValue}>{scorePercentage}%</Text>
                      <Text style={styles.slideLabel}>Overall Performance</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Questions Slide */}
                <View style={styles.carouselSlide}>
                  <LinearGradient
                    colors={["#60A5FA", "#3B82F6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideHeader}>
                      <Text style={styles.slideTitle}>Questions</Text>
                      <Icon
                        name="list"
                        size={20}
                        color="rgba(255,255,255,0.9)"
                      />
                    </View>
                    <View style={styles.slideContent}>
                      <Text style={styles.slideValue}>{totalCount}</Text>
                      <Text style={styles.slideLabel}>Total Attempted</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Correct Slide */}
                <View style={styles.carouselSlide}>
                  <LinearGradient
                    colors={["#34D399", "#10B981"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideHeader}>
                      <Text style={styles.slideTitle}>Correct</Text>
                      <Icon
                        name="check-circle"
                        size={20}
                        color="rgba(255,255,255,0.9)"
                      />
                    </View>
                    <View style={styles.slideContent}>
                      <Text style={styles.slideValue}>{correctCount}</Text>
                      <Text style={styles.slideLabel}>Right Answers</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Wrong Slide */}
                <View style={styles.carouselSlide}>
                  <LinearGradient
                    colors={["#F87171", "#EF4444"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideHeader}>
                      <Text style={styles.slideTitle}>Wrong</Text>
                      <Icon
                        name="times-circle"
                        size={20}
                        color="rgba(255,255,255,0.9)"
                      />
                    </View>
                    <View style={styles.slideContent}>
                      <Text style={styles.slideValue}>
                        {totalCount - correctCount}
                      </Text>
                      <Text style={styles.slideLabel}>Incorrect Answers</Text>
                    </View>
                  </LinearGradient>
                </View>
              </ScrollView>

              {/* Pagination Dots */}
              <View style={styles.paginationDots}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          </View>

          {/* Question Cards */}
          <View style={styles.questContainer}>
            <Text style={styles.sectionTitle}>Review Your Answers</Text>
            {finalAnswers.map((item, index) => {
              const isCorrect = item.yourAnswer.isCorrect;
              const yourAnswerText = item.yourAnswer.text;
              const correctAnswer = item.question.options.find(
                (opt) => opt.isCorrect,
              );
              const correctAnswerText = correctAnswer?.text;
              const questionText = item.question.text;
              const explanation = correctAnswer?.explanation;

              const rotate = rotationAnim[item.question.id].interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "180deg"],
              });

              const gradientColors = isCorrect
                ? (["#10B981", "#059669"] as const) // Dim green
                : (["#DC2626", "#B91C1C"] as const); // Dim red

              return (
                <View key={item.question.id}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.questCard}
                  >
                    <View
                      style={[
                        styles.bubble,
                        { top: -20, right: -20, width: 80, height: 80 },
                      ]}
                    />
                    <View
                      style={[
                        styles.bubble,
                        {
                          bottom: 10,
                          left: 10,
                          width: 40,
                          height: 40,
                          opacity: 0.1,
                        },
                      ]}
                    />

                    <View style={styles.cardHeader}>
                      <View style={styles.questionBadge}>
                        <Text style={styles.questionBadgeText}>
                          Q{index + 1}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Icon
                          solid
                          name={isCorrect ? "check-circle" : "times-circle"}
                          color="#FFF"
                          size={12}
                        />
                        <Text style={styles.statusText}>
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.questionText}>{questionText}</Text>

                    <View style={styles.answerBox}>
                      <Text style={styles.answerLabel}>Your Answer</Text>
                      <View style={styles.answerContent}>
                        <Icon
                          name={isCorrect ? "check" : "times"}
                          size={14}
                          color="#FFF"
                        />
                        <Text style={styles.answerText}>{yourAnswerText}</Text>
                      </View>
                    </View>

                    {!isCorrect && (
                      <View style={styles.answerBox}>
                        <Text style={styles.answerLabel}>Correct Answer</Text>
                        <View style={styles.answerContent}>
                          <Icon name="check" size={14} color="#FFF" />
                          <Text style={styles.answerText}>
                            {correctAnswerText}
                          </Text>
                        </View>
                      </View>
                    )}

                    {explanation && (
                      <View style={styles.explanationSection}>
                        <TouchableOpacity
                          style={styles.explanationToggle}
                          onPress={() => toggleExplanation(item.question.id)}
                        >
                          <View style={styles.explanationLeft}>
                            <Icon name="lightbulb" size={12} color="#FFF" />
                            <Text style={styles.explanationLabel}>Why?</Text>
                          </View>
                          <Animated.View style={{ transform: [{ rotate }] }}>
                            <Icon
                              name="chevron-down"
                              size={11}
                              color="rgba(255,255,255,0.8)"
                            />
                          </Animated.View>
                        </TouchableOpacity>
                        {expanded[item.question.id] && (
                          <View style={styles.explanationContent}>
                            <Text style={styles.explanationText}>
                              {explanation}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              from === "MOOD_CHECK"
                ? navigation.navigate("Root" as any, { screen: "HOME" })
                : navigation.navigate("Library", { from })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>
              {from === "MOOD_CHECK" ? "Back to Home" : "Back to Library"}
            </Text>
          </TouchableOpacity>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SummaryPage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "transparent",
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    paddingBottom: 130,
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 24,
  },
  // Beautiful Checkmark
  checkmarkSection: {
    alignItems: "center",
    paddingVertical: 12,
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  encouragingMessage: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  // Carousel Stats Dashboard
  statsContainer: {
    gap: 0,
  },
  carouselCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    width: Dimensions.get("window").width - 40, // Match slide width
  },
  carousel: {
    width: "100%",
  },
  carouselContent: {
    // No gap to prevent spacing issues
  },
  carouselSlide: {
    width: Dimensions.get("window").width - 40, // Full width minus padding
  },
  slideGradient: {
    padding: 24,
    minHeight: 180,
    justifyContent: "space-between",
  },
  slideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slideTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  slideContent: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  slideValue: {
    ...parseTextStyle(theme.typography.Heading1),
    color: "#FFFFFF",
    fontSize: 56,
    fontWeight: "800",
    lineHeight: 56,
  },
  slideLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  dotActive: {
    backgroundColor: "#A78BFA",
    width: 24,
  },
  // Section Title
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 18,
    fontWeight: "700",
  },
  // Question Cards
  questContainer: {
    gap: 16,
  },
  questCard: {
    padding: 20,
    borderRadius: 18,
    gap: 14,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#FFF",
    opacity: 0.15,
    zIndex: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  questionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  questionBadgeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  statusText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFF",
    fontWeight: "600",
    fontSize: 11,
  },
  questionText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    zIndex: 1,
  },
  answerBox: {
    gap: 6,
    zIndex: 1,
  },
  answerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  answerText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  explanationSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
    zIndex: 1,
  },
  explanationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  explanationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explanationLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  explanationContent: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  explanationText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.95)",
    lineHeight: 19,
    fontSize: 13,
  },
  // Back Button
  backButton: {
    backgroundColor: theme.colors.library.orange[500],
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
