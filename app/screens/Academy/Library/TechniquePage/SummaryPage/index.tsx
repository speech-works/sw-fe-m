import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import {
    LibStackNavigationProp,
    LibStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import {
    Page,
    Text,
    Icon,
    icons,
    Button,
    Divider,
    useTheme,
    spacing,
    radius,
    space,
    SemanticColors,
} from "../../../../../design-system";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StatAccent = keyof SemanticColors["accent"];

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { colors } = useTheme();
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

  const goBack = () =>
    from === "MOOD_CHECK"
      ? navigation.navigate("Root" as any, { screen: "HOME" })
      : navigation.navigate("Library", { from });

  const SLIDE_WIDTH = Dimensions.get("window").width - space.screenX * 2;

  const stats: {
    label: string;
    icon: keyof typeof icons | string;
    value: string | number;
    caption: string;
    accent: StatAccent;
  }[] = [
    {
      label: "Your Score",
      icon: icons.milestone,
      value: `${scorePercentage}%`,
      caption: "Overall Performance",
      accent: "purple",
    },
    {
      label: "Questions",
      icon: icons.checklist,
      value: totalCount,
      caption: "Total Attempted",
      accent: "info",
    },
    {
      label: "Correct",
      icon: icons.success,
      value: correctCount,
      caption: "Right Answers",
      accent: "success",
    },
    {
      label: "Wrong",
      icon: icons.close,
      value: totalCount - correctCount,
      caption: "Incorrect Answers",
      accent: "danger",
    },
  ];

  return (
    <Page
      title="Quiz Results"
      description={
        scorePercentage >= 80
          ? "Excellent work!"
          : scorePercentage >= 60
            ? "Great effort!"
            : "Keep practicing!"
      }
      onBack={goBack}
      footer={
        <Button
          label={from === "MOOD_CHECK" ? "Back to Home" : "Back to Library"}
          onPress={goBack}
        />
      }
    >
      {/* Confetti Animation */}
      <ConfettiAnimation />

      {/* Score hero — a success-accent disc on the dark canvas. */}
      <View style={styles.checkmarkSection}>
        <View
          style={[styles.checkmarkCircle, { backgroundColor: colors.accent.success }]}
        >
          <Icon name="check" size={48} color={colors.accentOn.success} />
        </View>
      </View>

      {/* Stats carousel — one solid-accent slide per metric. */}
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SLIDE_WIDTH + spacing.md}
        >
          {stats.map((stat, i) => {
            const on = colors.accentOn[stat.accent];
            return (
              <View
                key={stat.label}
                style={[
                  styles.slide,
                  {
                    width: SLIDE_WIDTH,
                    backgroundColor: colors.accent[stat.accent],
                    marginRight: i === stats.length - 1 ? 0 : spacing.md,
                  },
                ]}
              >
                <View style={styles.slideHeader}>
                  <Text variant="h3" color={on}>
                    {stat.label}
                  </Text>
                  <Icon name={stat.icon as any} size={20} color={on} />
                </View>
                <View style={styles.slideContent}>
                  <Text variant="display" color={on}>
                    {stat.value}
                  </Text>
                  <Text variant="body" color={on}>
                    {stat.caption}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Question Cards */}
      <View style={styles.questContainer}>
        <Text variant="h3" color="primary">
          Review Your Answers
        </Text>
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

          const accent: StatAccent = isCorrect ? "success" : "danger";
          const fill = colors.accent[accent];
          const on = colors.accentOn[accent];

          return (
            <View
              key={item.question.id}
              style={[styles.questCard, { backgroundColor: fill }]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.questionBadge,
                    { backgroundColor: colors.surface.default },
                  ]}
                >
                  <Text variant="label" color="primary">
                    Q{index + 1}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Icon
                    name={isCorrect ? icons.success : icons.warning}
                    color={on}
                    size={14}
                  />
                  <Text variant="label" color={on}>
                    {isCorrect ? "Correct" : "Incorrect"}
                  </Text>
                </View>
              </View>

              <Text variant="body" color={on} style={styles.questionText}>
                {questionText}
              </Text>

              {/* Your answer — bare label + copy on the fill (content, not a pill). */}
              <View style={styles.answerBox}>
                <Text variant="label" color={on} style={styles.answerLabel}>
                  Your Answer
                </Text>
                <View style={styles.answerContent}>
                  <Icon name={isCorrect ? "check" : icons.close} size={14} color={on} />
                  <Text variant="bodySm" color={on} style={styles.answerText}>
                    {yourAnswerText}
                  </Text>
                </View>
              </View>

              {!isCorrect && (
                <View style={styles.answerBox}>
                  <Text variant="label" color={on} style={styles.answerLabel}>
                    Correct Answer
                  </Text>
                  <View style={styles.answerContent}>
                    <Icon name="check" size={14} color={on} />
                    <Text variant="bodySm" color={on} style={styles.answerText}>
                      {correctAnswerText}
                    </Text>
                  </View>
                </View>
              )}

              {explanation && (
                <View style={styles.explanationSection}>
                  <Divider color={on} />
                  <TouchableOpacity
                    style={styles.explanationToggle}
                    onPress={() => toggleExplanation(item.question.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.explanationLeft}>
                      <Icon name={icons.tip} size={14} color={on} />
                      <Text variant="label" color={on}>
                        Why?
                      </Text>
                    </View>
                    <Animated.View style={{ transform: [{ rotate }] }}>
                      <Icon name={icons.chevronDown} size={14} color={on} />
                    </Animated.View>
                  </TouchableOpacity>
                  {expanded[item.question.id] && (
                    <Text variant="bodySm" color={on} style={styles.explanationText}>
                      {explanation}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Page>
  );
};

export default SummaryPage;

const styles = StyleSheet.create({
  // Score hero
  checkmarkSection: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  checkmarkCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  // Carousel slides
  slide: {
    padding: spacing["2xl"],
    minHeight: 176,
    borderRadius: radius.card,
    justifyContent: "space-between",
  },
  slideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slideContent: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  // Section
  questContainer: {
    gap: spacing.lg,
  },
  questCard: {
    padding: spacing.xl,
    borderRadius: radius.card,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  questionText: {
    lineHeight: 22,
  },
  answerBox: {
    gap: spacing.xs,
  },
  answerLabel: {
    opacity: 0.85,
  },
  answerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  answerText: {
    flex: 1,
    lineHeight: 20,
  },
  explanationSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  explanationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  explanationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  explanationText: {
    lineHeight: 20,
    opacity: 0.95,
  },
});
