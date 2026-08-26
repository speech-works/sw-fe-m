import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  size,
  Text,
  Icon,
  Button,
  Surface,
  ProgressBar,
  useTheme,
  spacing,
  radius,
  borderWidth,
} from "../../design-system";

/**
 * ============================================================================
 * QUIZ RUNNER
 * ----------------------------------------------------------------------------
 * One question at a time, with a progress bar and a footer button. Knows
 * nothing about where its questions came from or what happens afterwards.
 *
 * Extracted from the library's QuizPage so a paid program day can ask a
 * question without dragging that screen's world along with it. QuizPage
 * fetches by technique id, is typed to the library navigator and hard-navigates
 * to a summary screen that only exists in that stack, so reusing it inside a
 * pack module was never possible. The part worth sharing was always the view.
 *
 * TWO MODES, AND THE DIFFERENCE MATTERS.
 *
 * The library quiz collects answers and explains them all at the end, on its
 * summary screen. Set `revealExplanation` and this instead explains each answer
 * the moment it is given, before moving on. That is what a program day needs:
 * every option carries an explanation, including the wrong ones, and the moment
 * a user has just committed to an answer is the one moment they will actually
 * read it. Wrong answers cost nothing, so there is no reason to make anybody
 * wait to find out.
 *
 * NO SCROLL VIEW OF ITS OWN. Both hosts already scroll, and a scroll inside a
 * scroll is how a list becomes impossible to drag.
 * ============================================================================
 */

export interface QuizRunnerOption {
  text: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface QuizRunnerQuestion {
  /** The database id. It is what the submit endpoint expects. */
  id: string;
  text: string;
  options: QuizRunnerOption[];
}

export interface QuizRunnerAnswer {
  question: QuizRunnerQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

interface QuizRunnerProps {
  questions: QuizRunnerQuestion[];

  /**
   * Called once per question, as it is answered. Awaited, so the button can
   * show its loading state, but a rejection does NOT block the user: a network
   * failure should not trap somebody inside a quiz they have finished.
   */
  onAnswer?: (answer: QuizRunnerAnswer) => Promise<void> | void;

  /** Called once, after the last question is answered. */
  onFinished?: (answers: QuizRunnerAnswer[]) => void;

  /** Explain each answer as it is given, rather than at the end. */
  revealExplanation?: boolean;

  /** Small label above the question. */
  eyebrow?: string;

  /** Footer label on the last question. */
  finishLabel?: string;
}

export default function QuizRunner({
  questions,
  onAnswer,
  onFinished,
  revealExplanation = false,
  eyebrow = "ASSESSMENT QUESTION",
  finishLabel = "Submit Quiz",
}: QuizRunnerProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<QuizRunnerAnswer[]>([]);

  const question = questions[index];
  const isLast = index + 1 === questions.length;
  const progress = useMemo(
    () => (questions.length ? (index + 1) / questions.length : 0),
    [index, questions.length],
  );

  if (!question) return null;

  const advance = (answer: QuizRunnerAnswer) => {
    const all = [...answers, answer];
    setAnswers(all);
    setSelected(undefined);
    setRevealed(false);
    if (isLast) onFinished?.(all);
    else setIndex((i) => i + 1);
  };

  const submit = async () => {
    if (selected === undefined) return;
    const answer: QuizRunnerAnswer = {
      question,
      selectedIndex: selected,
      isCorrect: Boolean(question.options[selected]?.isCorrect),
    };

    // Reveal first, report second. The explanation is the point of the
    // interaction and it should not wait on a request.
    if (revealExplanation && !revealed) {
      setRevealed(true);
      setBusy(true);
      try {
        await onAnswer?.(answer);
      } catch {
        // Swallowed on purpose. The answer is recorded for mastery, which is
        // not something the user is waiting for, and refusing to move on
        // because a request failed would strand them mid-day.
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      await onAnswer?.(answer);
    } catch {
      // Same reasoning as above.
    } finally {
      setBusy(false);
      advance(answer);
    }
  };

  const chosen = selected === undefined ? undefined : question.options[selected];
  const gotItRight = Boolean(chosen?.isCorrect);

  const footerLabel = () => {
    if (busy) return "Saving...";
    if (revealExplanation && !revealed) return "Check";
    return isLast ? finishLabel : "Next Question";
  };

  return (
    <View style={styles.root}>
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text variant="bodySm" color="secondary">
            Question {index + 1} of {questions.length}
          </Text>
          <Text variant="bodySm" color="primary">
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <ProgressBar value={progress} color={colors.text.accent} height={8} />
      </View>

      <Surface level="default" rounded="card" bordered style={styles.card}>
        <View style={styles.questionSection}>
          <View style={styles.questionHeader}>
            <View
              style={[
                styles.questionNumberBadge,
                { backgroundColor: colors.action.primaryTint },
              ]}
            >
              <Text variant="title" color="primary">
                {index + 1}
              </Text>
            </View>
            <Text variant="eyebrow" color="tertiary">
              {eyebrow}
            </Text>
          </View>
          <Text variant="h3" color="primary" style={styles.qText}>
            {question.text}
          </Text>
        </View>

        <View style={styles.answers}>
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            // Once revealed, the correct option is marked whether or not it is
            // the one they picked. Being shown only that you were wrong, with
            // no indication of what was right, is worse than not asking.
            const showAsCorrect = revealed && opt.isCorrect;
            const showAsWrong = revealed && isSelected && !opt.isCorrect;

            const background = showAsCorrect
              ? colors.accentTint.success
              : showAsWrong
                ? colors.accentTint.warning
                : isSelected
                  ? colors.action.primaryTint
                  : colors.surface.control;
            const border = showAsCorrect
              ? colors.accent.success
              : showAsWrong
                ? colors.accent.warning
                : isSelected
                  ? colors.border.selected
                  : colors.border.default;

            return (
              <TouchableOpacity
                key={i}
                onPress={() => !revealed && setSelected(i)}
                activeOpacity={revealed ? 1 : 0.7}
                disabled={revealed}
                style={[
                  styles.ansRow,
                  { backgroundColor: background, borderColor: border },
                ]}
              >
                <View style={styles.ansRowContent}>
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected
                          ? colors.action.primary
                          : colors.border.strong,
                        backgroundColor: isSelected
                          ? colors.action.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSelected && (
                      <Icon
                        name="check"
                        size={size.iconXs}
                        color={colors.action.onPrimary}
                      />
                    )}
                  </View>
                  <Text
                    variant="body"
                    color={isSelected ? "primary" : "secondary"}
                    style={styles.ansText}
                  >
                    {opt.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {revealed && chosen?.explanation ? (
          <View
            style={[
              styles.explanation,
              {
                backgroundColor: gotItRight
                  ? colors.accentTint.success
                  : colors.accentTint.info,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Text variant="bodySm" color="secondary" style={styles.explanationText}>
              {chosen.explanation}
            </Text>
          </View>
        ) : null}

        <View
          style={[styles.footer, { borderTopColor: colors.border.default }]}
        >
          <Button
            key={`quiz-next-${index}-${revealed ? "revealed" : "open"}`}
            label={footerLabel()}
            size="md"
            fullWidth={false}
            loading={busy}
            disabled={selected === undefined || busy}
            onPress={() => {
              if (revealExplanation && revealed) {
                advance({
                  question,
                  selectedIndex: selected as number,
                  isCorrect: gotItRight,
                });
                return;
              }
              void submit();
            }}
          />
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  progressSection: { gap: spacing.md, paddingHorizontal: spacing.xs },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: { gap: spacing["2xl"], padding: spacing["2xl"] },
  questionSection: { gap: spacing.lg },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  questionNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  qText: { lineHeight: 30 },
  answers: { gap: spacing.md },
  ansRow: {
    padding: spacing.lg,
    borderWidth: borderWidth.thick,
    borderRadius: radius.input,
  },
  ansRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: borderWidth.thick,
    justifyContent: "center",
    alignItems: "center",
  },
  ansText: { flex: 1, lineHeight: 24 },
  explanation: {
    padding: spacing.lg,
    borderRadius: radius.input,
    borderWidth: borderWidth.hairline,
  },
  explanationText: { lineHeight: 22 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: spacing.lg,
    borderTopWidth: borderWidth.hairline,
  },
});
