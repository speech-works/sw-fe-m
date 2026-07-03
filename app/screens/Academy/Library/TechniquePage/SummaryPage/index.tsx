import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { View } from "react-native";
import Reanimated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import PressableScale from "../../../../../components/PressableScale";
import {
    LibStackNavigationProp,
    LibStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import {
    AnimatedNumber,
    Button,
    Divider,
    Gradient,
    GradientName,
    Icon,
    Page,
    SectionHeader,
    Text,
    borderWidth,
    duration,
    easing,
    elevation,
    fadeStaggerEntering,
    hitTarget,
    icons,
    makeStyles,
    radius,
    spacing,
    useMotion,
    useTheme,
    withAlpha,
} from "../../../../../design-system";

type AnswerItem = LibStackParamList["SummaryPage"]["finalAnswers"][number];

/**
 * One reviewed question. The question text is the card's title; status lives in a
 * quiet eyebrow (Q-number + dot + verdict). Answers render as tinted option rows —
 * the same shape they had in the quiz — with a trailing "You" on the user's pick.
 * The "Why?" disclosure resizes the card on the gentle layout spring (no
 * LayoutAnimation pop) while the explanation fades.
 */
const QuestionCard = ({ item, index }: { item: AnswerItem; index: number }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const m = useMotion();
  const [expanded, setExpanded] = useState(false);
  const rot = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));

  const isCorrect = item.yourAnswer.isCorrect;
  const correctAnswer = item.question.options.find((opt) => opt.isCorrect);
  const explanation = correctAnswer?.explanation;

  const toggle = () => {
    rot.value = withTiming(expanded ? 0 : 1, {
      duration: duration.base,
      easing: easing.inOut,
    });
    setExpanded((e) => !e);
  };

  const statusColor = isCorrect
    ? colors.feedback.successText
    : colors.feedback.dangerText;
  const statusDot = isCorrect ? colors.accent.success : colors.accent.danger;
  const yourTint = isCorrect
    ? colors.accentTint.success
    : colors.accentTint.danger;

  return (
    <Reanimated.View
      entering={m.stagger(index)}
      layout={m.layout()}
      style={styles.card}
    >
      {/* Eyebrow — metadata stays small and quiet. */}
      <View style={styles.cardEyebrow}>
        <Text variant="label" color="tertiary" style={styles.qLabel}>
          Q{index + 1}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
          <Text variant="label" color={statusColor}>
            {isCorrect ? "Correct" : "Incorrect"}
          </Text>
        </View>
      </View>

      {/* The question is the title. */}
      <Text variant="title" color="primary" style={styles.questionText}>
        {item.question.text}
      </Text>

      {/* Answers as option rows — the shapes you just tapped in the quiz. */}
      <View style={styles.answerGroup}>
        <View style={[styles.answerRow, { backgroundColor: yourTint }]}>
          <Icon
            name={isCorrect ? icons.success : icons.close}
            size={14}
            color={statusColor}
            style={styles.answerGlyph}
          />
          <Text variant="body" color="primary" style={styles.answerText}>
            {item.yourAnswer.text}
          </Text>
          <Text variant="caption" color="tertiary">
            You
          </Text>
        </View>

        {!isCorrect && (
          <View
            style={[styles.answerRow, { backgroundColor: colors.accentTint.success }]}
          >
            <Icon
              name={icons.success}
              size={14}
              color={colors.feedback.successText}
              style={styles.answerGlyph}
            />
            <Text variant="body" color="primary" style={styles.answerText}>
              {correctAnswer?.text}
            </Text>
          </View>
        )}
      </View>

      {explanation && (
        <View>
          <Divider />
          <PressableScale onPress={toggle} style={styles.whyRow}>
            <Text variant="label" color="secondary">
              Why?
            </Text>
            <Reanimated.View style={chevronStyle}>
              <Icon
                name={icons.chevronDown}
                size={14}
                color={colors.text.secondary}
              />
            </Reanimated.View>
          </PressableScale>
          {expanded && (
            <Reanimated.View
              entering={FadeIn.duration(duration.reveal)}
              exiting={FadeOut.duration(duration.fast)}
            >
              <Text variant="bodySm" color="secondary" style={styles.explanationText}>
                {explanation}
              </Text>
            </Reanimated.View>
          )}
        </View>
      )}
    </Reanimated.View>
  );
};

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { colors } = useTheme();
  const styles = useStyles();
  const m = useMotion();
  const { finalAnswers, from } = route.params;

  const correctCount = finalAnswers.filter(
    (item) => item.yourAnswer.isCorrect,
  ).length;
  const totalCount = finalAnswers.length;
  const scorePercentage = Math.round((correctCount / totalCount) * 100);

  const goBack = () =>
    from === "MOOD_CHECK"
      ? navigation.navigate("Root" as any, { screen: "HOME" })
      : navigation.navigate("Library", { from });

  // The hero gradient is tone-graded by score band — celebrate / energise /
  // encourage. A low score gets the cool aurora, never a shaming red. The ink
  // is the accentOn shade AA-paired with each gradient's end stop.
  const band: { token: GradientName; ink: string } =
    scorePercentage >= 80
      ? { token: "meadow", ink: colors.accentOn.success }
      : scorePercentage >= 60
        ? { token: "sunrise", ink: colors.accentOn.danger }
        : { token: "aurora", ink: colors.accentOn.info };
  const inkMuted = withAlpha(band.ink, 0.72);

  const verdict =
    scorePercentage >= 80
      ? "Excellent work!"
      : scorePercentage >= 60
        ? "Great effort!"
        : "Keep practicing!";

  // The warmth lives inside the hero — the page's one vivid moment — instead of
  // a second bright card colliding with the orange footer button.
  const encouragement =
    scorePercentage >= 80
      ? "You clearly know this inside out. Carry that confidence into your next session."
      : scorePercentage >= 60
        ? "Solid work. Skim the ones you missed and it'll stick for good."
        : "Every answer you review makes the next attempt easier. You've got this.";

  const celebrate = scorePercentage >= 60 && !m.reduced;

  return (
    <View style={styles.root}>
      <Page
        title="Quiz Results"
        onBack={goBack}
        footer={
          <Button
            label={from === "MOOD_CHECK" ? "Back to Home" : "Back to Library"}
            onPress={goBack}
          />
        }
      >
        {/* Hero — the result map. Fraction + verdict on the band gradient, one
            segment per question (solid = correct, faint = missed) previewing the
            review list below in the same order, then the supportive line. */}
        <Gradient token={band.token} style={styles.heroCard}>
          <Text variant="label" color={inkMuted} style={styles.heroEyebrow}>
            QUIZ REPORT
          </Text>
          <View style={styles.fractionRow}>
            <AnimatedNumber value={correctCount} variant="display" color={band.ink} />
            <Text variant="h2" color={inkMuted} style={styles.fractionTotal}>
              /{totalCount}
            </Text>
            <Text variant="h3" color={band.ink} style={styles.verdict}>
              {verdict}
            </Text>
          </View>
          <View style={styles.segRow}>
            {finalAnswers.map((item, i) => (
              <Reanimated.View
                key={item.question.id}
                entering={fadeStaggerEntering(i, m.reduced)}
                style={[
                  styles.seg,
                  {
                    backgroundColor: item.yourAnswer.isCorrect
                      ? band.ink
                      : withAlpha(band.ink, 0.28),
                  },
                ]}
              />
            ))}
          </View>
          <Text variant="bodySm" color={inkMuted} style={styles.heroMessage}>
            {encouragement}
          </Text>
        </Gradient>

        {/* Review — the question cards. */}
        <View style={styles.reviewSection}>
          <SectionHeader icon={icons.checklist} title="Review your answers" />
          {finalAnswers.map((item, index) => (
            <QuestionCard key={item.question.id} item={item} index={index} />
          ))}
        </View>
      </Page>

      {/* Celebration — a viewport overlay (never a scroll child), so the burst
          plays over the page and clears itself instead of parking mid-scroll. */}
      {celebrate ? <ConfettiAnimation /> : null}
    </View>
  );
};

export default SummaryPage;

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },

  // Hero
  heroCard: {
    borderRadius: radius.card,
    overflow: "hidden",
    padding: spacing["2xl"],
    gap: spacing.md,
    ...elevation.e2,
  },
  heroEyebrow: {
    letterSpacing: 1.4,
  },
  fractionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  fractionTotal: {
    marginBottom: 6,
    marginLeft: 2,
  },
  verdict: {
    flex: 1,
    textAlign: "right",
    marginBottom: 8,
  },
  segRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: spacing.xs,
  },
  seg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  heroMessage: {
    lineHeight: 19,
  },

  // Review
  reviewSection: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: c.surface.default,
    borderWidth: borderWidth.thin,
    borderColor: c.border.default,
  },
  cardEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qLabel: {
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  questionText: {
    lineHeight: 23,
  },
  answerGroup: {
    gap: spacing.sm,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
  },
  answerGlyph: {
    marginTop: 3,
  },
  answerText: {
    flex: 1,
    lineHeight: 21,
  },
  whyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: hitTarget.min,
  },
  explanationText: {
    lineHeight: 20,
    paddingBottom: spacing.sm,
  },
}));
