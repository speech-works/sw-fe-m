import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import {
  size,
  Text,
  Icon,
  Button,
  Surface,
  ProgressBar,
  Sheet,
  usePageScroll,
  useTheme,
  spacing,
  radius,
  borderWidth,
  fonts,
} from "../../design-system";
import { PipPeek } from "../Pip/PipPeek";
import { PIP_HIDE } from "../Pack/zoneSheet";
import { QuizFooterState, quizFooterAction } from "./quizFooter";

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
 * THE HOST CAN OWN THE BUTTON. Pass `onFooterChange` and the card draws no
 * button of its own: it reports what the button would do, and the host calls
 * `press()` on the ref. A program day does this so Check sits in its bottom
 * bar, always on screen, instead of under the options below the fold.
 *
 * NO SCROLL VIEW OF ITS OWN. Both hosts already scroll, and a scroll inside a
 * scroll is how a list becomes impossible to drag.
 * ============================================================================
 */

/** Pip over the answer sheet's edge (mock 03, at 390 wide; smaller on a narrower screen): his width in his own
 *  picture (the mock's 112 is of the 320 wide site picture) and how far his middle is from the screen's right edge. */
const PEEK_W = 130;
const PEEK_CENTRE = 70;

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

  /**
   * The host draws the button. Called whenever what it would do changes; the
   * card then shows no button, and the host calls `press()` on the ref.
   */
  onFooterChange?: (state: QuizFooterState) => void;

  /**
   * Show "Question 1 of 2" alone. For a host with its own progress bar above,
   * where a second bar costs the answers their room on a small phone.
   */
  countOnly?: boolean;

  /**
   * Program days: after Check, the result and the explanation rise in a bottom
   * sheet with its own button, in readable 16pt text, and a wrong pick stays
   * neutral instead of warning yellow ("Not this one"). Program UX review,
   * 2026-11-25. Closing the sheet keeps the explanation inline as before.
   */
  explanationSheet?: boolean;

  /**
   * The quiz sits straight on the day frame's sheet (program screens redesign,
   * 2026-11-27; first used by "From yesterday", where the frame's orange zone
   * holds the label as its title): no card around it, no number tile and
   * eyebrow row, the question in the sheet's own type and the answers as rows.
   * "Question 1 of 1" is not shown: the count line appears from two questions
   * on, and it owns the gap under it.
   */
  plain?: boolean;

  /**
   * With `plain`: one row above the question with the number tile, the
   * eyebrow ("CHECK") and "Question 1 of 3" at the right (a day's check quiz,
   * mock 03). The row owns the gap under it. Without it (From yesterday) the
   * frame's zone title is the label.
   */
  kindRow?: boolean;

  /** An answer was picked (any answer, before Check). */
  onPick?: () => void;
  /** The explanation sheet opened or closed. */
  onSheet?: (open: boolean) => void;
}

/** For a host that draws the button itself (see `onFooterChange`). */
export interface QuizRunnerHandle {
  /** Does what the card's own button would: Check, or the next question. */
  press: () => void;
}

const QuizRunner = forwardRef<QuizRunnerHandle, QuizRunnerProps>(function QuizRunner(
  {
    questions,
    onAnswer,
    onFinished,
    revealExplanation = false,
    eyebrow = "ASSESSMENT QUESTION",
    finishLabel = "Submit Quiz",
    onFooterChange,
    countOnly = false,
    explanationSheet = false,
    plain = false,
    kindRow = false,
    onPick,
    onSheet,
  },
  ref,
) {
  const { colors, scheme } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const pageScroll = usePageScroll();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<QuizRunnerAnswer[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The host hears the sheet open and close (the day frame's Pip steps aside
  // for the Pip that peeks over the sheet). Not on the first render.
  const sheetShown = sheetOpen && revealed;
  const sheetTold = useRef(false);
  const onSheetRef = useRef(onSheet);
  onSheetRef.current = onSheet;
  useEffect(() => {
    if (sheetTold.current === sheetShown) return;
    sheetTold.current = sheetShown;
    onSheetRef.current?.(sheetShown);
  }, [sheetShown]);

  const question = questions[index];
  const isLast = index + 1 === questions.length;
  const progress = useMemo(
    () => (questions.length ? (index + 1) / questions.length : 0),
    [index, questions.length],
  );

  const footerAction = quizFooterAction({
    hasSelection: selected !== undefined,
    revealed,
    isLast,
    revealExplanation,
  });
  useEffect(() => {
    onFooterChange?.({ action: footerAction, busy });
  }, [footerAction, busy, onFooterChange]);

  // The host's button calls the latest press, not the one from the render the
  // ref was first read in.
  const pressRef = useRef<() => void>(() => {});
  useImperativeHandle(ref, () => ({ press: () => pressRef.current() }), []);

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
      if (explanationSheet && question.options[selected]?.explanation) setSheetOpen(true);
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
      // The last question ends on this reveal, not on a second tap. A "Done"
      // button here used to call `advance()`, which resets `selected` and
      // `revealed` for the next question that never comes — so the card the
      // user is looking at appeared to forget their answer instead of moving
      // on. There's nowhere left to move to inside the quiz: the host screen
      // already carries its own Next/Complete action for that.
      if (isLast) onFinished?.([...answers, answer]);
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

  const press = () => {
    if (busy || selected === undefined) return;
    if (revealExplanation && revealed) {
      if (isLast) return;
      advance({
        question,
        selectedIndex: selected,
        isCorrect: gotItRight,
      });
      return;
    }
    void submit();
  };
  pressRef.current = press;

  const footerLabel = () => {
    if (busy) return "Saving...";
    if (revealExplanation && !revealed) return "Check";
    return isLast ? finishLabel : "Next Question";
  };

  // THE ANSWER SHEET (mocks 03 and 12). It grows from the bottom with its text
  // (2 to 6 lines; longer text scrolls), the button is pinned under the text,
  // and Pip rides the sheet's top edge up with it, at the right, where he
  // covers the least of the answers. Correct and "Not this one" are the same
  // sheet in the same voice: no red, no cross, no stars.
  const peekK = Math.min(1, screenW / 390);
  const answerSheet = explanationSheet ? (
    <Sheet
      visible={sheetOpen && revealed}
      onClose={() => setSheetOpen(false)}
      // 28 like every sheet of the day frame (the design-system Sheet defaults to 36)
      contentStyle={styles.sheetCard}
      // Pip peeks over the sheet's top edge for the answer, and stays while
      // the sheet is up (see PipPeek and the two quiz moments in pipMoments)
      above={sheetOpen && revealed ? (space: number) => (
        <View style={styles.peekRow}>
          <View style={{ marginRight: Math.round(PEEK_CENTRE * peekK - (Math.round(PEEK_W * peekK) + 40) / 2) }}>
            <PipPeek key={index + ":" + (gotItRight ? "r" : "n")} moment={gotItRight ? "quiz-right" : "quiz-not-this"} space={space} max={Math.round(PEEK_W * peekK)} hide={PIP_HIDE} stay />
          </View>
        </View>
      ) : undefined}
      footer={
        <Button
          label={isLast ? "Continue" : "Next question"}
          onPress={() => {
            setSheetOpen(false);
            if (!isLast) press();
          }}
        />
      }
    >
      <View style={styles.sheetBody}>
        <View style={styles.sheetResult}>
          <View
            style={[
              styles.sheetDot,
              { backgroundColor: gotItRight ? colors.accent.success : scheme === "dark" ? colors.surface.control : colors.surface.inset },
            ]}
          >
            {/* "Not this one" gets a lightbulb, the app's tip icon: here is the idea, never a mark (founder, Q1 A) */}
            {gotItRight ? (
              <Icon name="check" size={size.iconInline} color={colors.accentOn.success} />
            ) : (
              <Icon name="lightbulb" size={size.iconInline} color={colors.text.secondary} />
            )}
          </View>
          <Text color={gotItRight ? colors.feedback.successText : "primary"} style={styles.sheetTitle}>
            {gotItRight ? "Correct" : "Not this one"}
          </Text>
        </View>
        <Text variant="body" color="primary" style={styles.sheetText}>
          {chosen?.explanation}
        </Text>
      </View>
    </Sheet>
  ) : null;

  const answerRows = (
  <View style={plain ? styles.plainAnswers : styles.answers}>
    {question.options.map((opt, i) => {
      const isSelected = selected === i;
      // Once revealed, the correct option is marked whether or not it is
      // the one they picked. Being shown only that you were wrong, with
      // no indication of what was right, is worse than not asking.
      const showAsCorrect = revealed && opt.isCorrect;
      const showAsWrong = revealed && isSelected && !opt.isCorrect;
      // On the day sheet the right answer carries a green tick whether or not
      // it was the pick (mock 12); elsewhere only a right pick does.
      const tickGreen = Boolean(showAsCorrect && (isSelected || plain));

      const background = showAsCorrect
        ? colors.accentTint.success
        : showAsWrong
          ? plain
            ? // your own pick keeps its orange tick on a plain row (mock 12)
              colors.surface.elevated
            : explanationSheet
            ? colors.surface.control
            : colors.accentTint.warning
          : isSelected
            ? colors.action.primaryTint
            : plain
              ? colors.surface.elevated
              : colors.surface.control;
      const border = showAsCorrect
        ? plain && scheme !== "dark"
          ? colors.accentEdge.success
          : colors.accent.success
        : showAsWrong
          ? plain
            ? colors.border.default
            : explanationSheet
            ? colors.border.strong
            : colors.accent.warning
          : isSelected
            ? colors.border.selected
            : colors.border.default;

      return (
        <TouchableOpacity
          key={i}
          onPress={() => {
            if (revealed) return;
            if (selected !== i) onPick?.();
            setSelected(i);
          }}
          activeOpacity={revealed ? 1 : 0.7}
          disabled={revealed}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected, disabled: revealed }}
          style={[
            styles.ansRow,
            plain && styles.plainRow,
            { backgroundColor: background, borderColor: border },
          ]}
        >
          <View style={[styles.ansRowContent, plain && styles.plainRowContent]}>
            {/* Once checked, a right pick turns its tick green, the same
                green as the border and the reason box. An orange tick on
                a green row read as two different answers. */}
            <View
              style={[
                styles.radioOuter,
                plain && styles.plainRadio,
                {
                  borderColor:
                    tickGreen
                      ? colors.accent.success
                      : isSelected
                        ? colors.action.primary
                        : plain
                          ? colors.text.tertiary
                          : colors.border.strong,
                  backgroundColor:
                    tickGreen
                      ? colors.accent.success
                      : isSelected
                        ? colors.action.primary
                        : "transparent",
                },
              ]}
            >
              {(isSelected || tickGreen) && (
                <Icon
                  name="check"
                  size={size.iconXs}
                  color={
                    tickGreen
                      ? colors.accentOn.success
                      : colors.action.onPrimary
                  }
                />
              )}
            </View>
            <Text
              variant="body"
              color={isSelected || plain ? "primary" : "secondary"}
              style={[styles.ansText, plain && styles.plainRowText]}
            >
              {opt.text}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
  );

  const explanationBox =
    revealed && chosen?.explanation && !(explanationSheet && sheetOpen) ? (
    <View
      // The explanation is the point of the question, and it landed
      // below the fold with only its top edge showing.
      onLayout={() => pageScroll?.scrollToEnd()}
      style={[
        styles.explanation,
        plain && styles.plainExplanation,
        plain
          ? // the neutral field colour for every answer, never blue (mock 12)
            { backgroundColor: colors.input.bg, borderColor: colors.input.border }
          : {
              backgroundColor: gotItRight
                ? colors.accentTint.success
                : colors.accentTint.info,
              borderColor: colors.border.default,
            },
      ]}
    >
      <Text variant="bodySm" color="secondary" style={plain ? styles.plainExplanationText : styles.explanationText}>
        {chosen.explanation}
      </Text>
    </View>
  ) : null;

  if (plain) {
    // Straight on the day frame's sheet. Every part owns the gap above it (or,
    // for the count line, under it), so a part that is not there leaves nothing.
    return (
      <View>
        {kindRow ? (
          <View style={styles.kindRow}>
            <View style={[styles.kindTile, { backgroundColor: colors.action.primaryTint }]}>
              <Text style={[styles.kindNum, { color: colors.text.accent }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.kindLabel, { color: colors.text.secondary }]}>{eyebrow}</Text>
            {questions.length > 1 ? (
              <Text style={[styles.kindCount, { color: colors.text.secondary }]}>
                Question {index + 1} of {questions.length}
              </Text>
            ) : null}
          </View>
        ) : questions.length > 1 ? (
          <Text variant="bodySm" color="secondary" style={styles.plainCount}>
            Question {index + 1} of {questions.length}
          </Text>
        ) : null}
        <Text color="primary" style={styles.plainQuestion}>
          {question.text}
        </Text>
        {answerRows}
        {explanationBox}
        {answerSheet}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text variant="bodySm" color="secondary">
            Question {index + 1} of {questions.length}
          </Text>
          {countOnly ? null : (
            <Text variant="bodySm" color="primary">
              {Math.round(progress * 100)}%
            </Text>
          )}
        </View>
        {countOnly ? null : (
          <ProgressBar value={progress} color={colors.text.accent} height={8} />
        )}
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

        {answerRows}

        {explanationBox}

        {/* Nothing to press once the last question is revealed — the quiz
            already finished (see `submit`), and the host screen's own
            Next/Complete button is the way past it. A button here would
            either repeat that action under a different label or, in the case
            this replaced, invite a tap that only reset the answer on screen. */}
        {onFooterChange || (revealExplanation && revealed && isLast) ? null : (
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
              onPress={press}
            />
          </View>
        )}
      </Surface>

      {answerSheet}
    </View>
  );
});

export default QuizRunner;

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
  // ── the answer sheet: text 24 from the screen edge (the sheet has the 16
  // gutter), the button in the sheet's pinned footer at the gutter ──
  sheetCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  // 8 under the text (and the 12 of the sheet): the sheet's fade above the pinned button starts under the last line, never on it
  sheetBody: { gap: 14, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  sheetResult: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sheetDot: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  sheetText: { lineHeight: 25 },
  // Pip's place over the sheet's edge: the row spans the sheet, he is at its right
  peekRow: { alignSelf: "stretch", alignItems: "flex-end" },
  // ── `kindRow`: number tile, eyebrow, count (4 more above: 28 under the sheet's edge) ──
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
    marginBottom: 22,
    paddingHorizontal: spacing.sm,
  },
  kindTile: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  kindNum: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  kindLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: "uppercase", flexShrink: 1 },
  kindCount: { fontFamily: fonts.medium, fontWeight: "500", fontSize: 13, lineHeight: 18, marginLeft: "auto" },
  // ── `plain`: straight on the day frame's sheet (system.md: question 21/29,
  // rows radius 20 at the screen gutter, text 24 from the screen edge) ──
  plainCount: { paddingHorizontal: spacing.sm, marginBottom: 10 },
  plainQuestion: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 29,
    letterSpacing: -0.3,
    paddingHorizontal: spacing.sm,
  },
  plainAnswers: { gap: 10, marginTop: 22 },
  plainRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: 20,
    minHeight: 64,
    justifyContent: "center",
  },
  plainRowContent: { gap: 14 },
  plainRadio: { width: 24, height: 24, borderWidth: 1.8 },
  plainRowText: { fontFamily: fonts.medium, fontWeight: "500" },
  // the reason under the answers: it owns the gap above it
  plainExplanation: { marginTop: 14, borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: spacing.lg },
  plainExplanationText: { fontSize: 15, lineHeight: 22 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: spacing.lg,
    borderTopWidth: borderWidth.hairline,
  },
});
