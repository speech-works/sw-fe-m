import { useIsFocused, useNavigation } from "@react-navigation/native";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { View, useWindowDimensions } from "react-native";
import {
    createPracticeActivityFromPack,
    PracticeActivityContentType,
} from "../../api";
import {
    startPracticeActivity,
} from "../../api/practiceActivities";
import {
    ContentBlockType,
    FormBlockContent,
    GoalsBlockContent,
    ModuleContentBlock,
    WeekReviewBlockContent,
    QuizBlockContent,
    ReferenceBlockContent,
    TextBlockContent,
    VideoBlockContent,
} from "../../api/packs/types";
import { GoalsBlock } from "./blocks/GoalsBlock";
import { WeekReviewBlock } from "./blocks/WeekReviewBlock";
import {
    Text,
    TextLink,
    icons,
    useTheme,
    makeStyles,
    spacing,
} from "../../design-system";
import { PageScrollContext } from "../../design-system/pageScroll";
import { LIST_TEXT_INDENT, SimpleMarkdown } from "./SimpleMarkdown";
import { LessonParts } from "./LessonText";
import { readMinutes, teachParts } from "../../util/packs/teachParts";
import QuizRunner, { QuizRunnerHandle } from "../Quiz/QuizRunner";
import type { QuizFooterState } from "../Quiz/quizFooter";
import { submitQuizAnswer } from "../../api/quiz";

import { useActivityStore } from "../../stores/activity";
import { useUserStore } from "../../stores/user";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../util/functions/bottomSheet";
import ExhaustionSheet from "../ExhaustionSheet";
import { CopyTextButton, StepCardSheet, StepHint, fallbackCard } from "./StepCardSheet";
import {
  classifyPackError,
  packErrorMessage,
} from "../../util/packs/packErrors";
import { formCardText, formScreenHeader, formStartLabel } from "../../util/packs/formBlock";
import { navigateToPackActivity } from "../../utils/packActivityNavigation";
import { reframePairs, savedPairsFromBlock } from "../../util/packs/reframeReplies";
import { SavedReframes } from "./SavedReframes";
import { DayLaunch, useDayFrame } from "./DayFrame";
import { PIP_BACK, PIP_CARD_DONE, PIP_PICKED } from "./dayStepFrame";
import { LaunchCard, LaunchLink, LaunchPart } from "./LaunchCard";
import { VideoPlayer } from "../VideoPlayer";

interface ContentRendererProps {
  block: ModuleContentBlock;
  packId?: string;
  moduleId?: string;
  isMandatory?: boolean;
  isCompleted?: boolean;
  blockIndex?: number;
  onActivityCreated?: (blockId: string, activityId: string) => void;
  onFormCompleted?: (blockId: string) => void;
  /** Fired when every question in a QUIZ block has been answered. */
  onQuizCompleted?: (blockId: string) => void;
  /**
   * A QUIZ block's button lives in the host's bottom bar: the quiz reports
   * what it would do here, and the host presses it through `quizRef`.
   */
  quizRef?: React.Ref<QuizRunnerHandle>;
  onQuizFooterChange?: (state: QuizFooterState) => void;
  /** A lesson split at its headings shows this part (see util/packs/teachParts). */
  textPart?: number;
  /** Lesson text size from the reading sheet. */
  textSize?: number;
  /**
   * A practice or log card: the day's other action for this step, the one its
   * dock shows ("Skip"). A launch layout that gives the dock's pill to the
   * card's own button shows it as a small link in the sheet (launchLayout.ts).
   */
  dockAction?: { label: string; onPress: () => void };
}

/**
 * ── A FINISHED STEP, AND THE WAY BACK INTO IT ──────────────────────────────
 * A practice or a log step is a launch card on the day frame's sheet
 * (LaunchCard, mocks 04 and 05). Done work recedes: a quiet "Completed" tag in
 * the label's slot, and "Do it again" as a quiet button, because the only
 * thing the screen still wants is to move on, which the dock's "Next" says in
 * the one filled button.
 *
 * But the way back has to be THERE. Practice you cannot repeat is not
 * practice, and these are techniques whose whole value is the reps.
 *
 * Doing it again NEVER un-finishes the step — see util/packs/blockCompletion
 * for why that has to be enforced rather than assumed.
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({
  block,
  packId,
  moduleId,
  isCompleted,
  blockIndex,
  onActivityCreated,
  onQuizCompleted,
  quizRef,
  onQuizFooterChange,
  textPart = 0,
  textSize,
  dockAction,
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  // The day frame this step sits in (null outside it): its Pip answers a tap.
  const dayFrame = useDayFrame();
  const storeActivities = useActivityStore((s) => s.activities);
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  /**
   * Out of calls when a day's call block is started: the same top-up sheet
   * the call screen opens, not the generic "Can't start this yet" dialog,
   * which offered no way forward.
   */
  const [showExhaustionSheet, setShowExhaustionSheet] = useState(false);
  const [showStepSheet, setShowStepSheet] = useState(false);
  /** A purchase landed. Confirm it once the sheet has gone. */
  const purchaseLandedRef = useRef(false);
  /**
   * Room for a video between the step header and the docked Next button, so
   * the whole frame, captions included, shows without scrolling. 470 is that
   * chrome on an iPhone 16 Pro with a two-line day title. Never below half
   * the screen: on an iPhone SE the rule alone left a 124pt-wide video, and a
   * short scroll is better than a lesson too small to read.
   */
  const { height: windowHeight } = useWindowDimensions();
  // On the day frame the sheet says how much room it has: the video fills it,
  // 28 under the sheet's edge (the frame's 24 and 4 here) and clear of the
  // fade above the dock (28), with nothing to scroll (mock 09).
  const sheetRoom = useContext(PageScrollContext)?.viewportHeight ?? 0;

  /**
   * Back on the card with the step just done (a practice finished, a log
   * saved): Pip in the zone shows the warm face and nods once. The same for
   * both cards, and nothing else: no stars, no XP. A step that is already
   * done when the card opens gets the same nod from the frame when he has
   * come up (dayStepFrame), so here it is only the face.
   */
  const isCard = block.type === ContentBlockType.ACTIVITY || block.type === ContentBlockType.FORM;
  /**
   * What a launch card draws in its own sheet, right under the description: a small link, "Do it again" when the step is
   * done, otherwise the dock's other action ("Skip this practice"). The card's own button is the dock's pill (DayLaunch).
   * Null when there is nothing: the part and its gap are then not drawn.
   */
  const launchAction = (start: { label: string; loading?: boolean; onPress: () => void }, skipLabel: string) => {
    if (isCompleted) {
      return (
        <LaunchPart gap={6}>
          <LaunchLink label="Do it again" disabled={start.loading} onPress={start.onPress} />
        </LaunchPart>
      );
    }
    if (!dockAction) return null;
    return (
      <LaunchPart gap={6}>
        <LaunchLink label={dockAction.label === "Skip" ? skipLabel : dockAction.label} onPress={dockAction.onPress} />
      </LaunchPart>
    );
  };
  const wasCompleted = useRef(!!isCompleted), openedAt = useRef(Date.now());
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const doneBeat = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => doneBeat.current.forEach(clearTimeout), []);
  useEffect(() => {
    // Only while this screen is the one on show: the step is marked done
    // while the practice or the form is still over the card, and a beat he
    // plays behind it is not seen.
    if (!isCard || !isCompleted || !focused || wasCompleted.current) return;
    wasCompleted.current = true;
    const pip = () => dayFrame?.pip()?.pip;
    if (Date.now() - openedAt.current < 1200) { pip()?.face("warm"); return; }
    // The beats of PIP_CARD_DONE on timers of this card's own, so that
    // nothing else he is asked to do on the way back can drop them.
    doneBeat.current = PIP_CARD_DONE.map((beat) =>
      setTimeout(() => {
        if (beat.face) pip()?.face(beat.face);
        if (beat.body && !reducedMotion) void pip()?.body(beat.body);
      }, beat.at),
    );
  }, [isCard, isCompleted, focused, dayFrame, reducedMotion]);
  // `windowHeight - 360` is the room between the heading and the buttons. It only
  // takes over on small phones, where half the screen ran under the buttons.
  const videoMaxHeight =
    dayFrame && sheetRoom > 0
      ? Math.max(160, sheetRoom - 24 - 4 - 28)
      : Math.max(
          Math.min(windowHeight * 0.5, windowHeight - 360),
          windowHeight - 470,
        );

  switch (block.type) {
    case ContentBlockType.TEXT: {
      const textContent = block.content as TextBlockContent;
      const isTeach = !textContent.role || textContent.role === "teach";
      // A long lesson, one part at a time (program UX review, 2026-11-25).
      // The day player owns which part is showing and moves through the parts
      // with its own Next and Back, so this only draws the part it is given.
      const lessonParts = isTeach && !textContent.copy ? teachParts(textContent.markdown) : [];
      if (lessonParts.length > 1) {
        const at = Math.max(0, Math.min(textPart, lessonParts.length - 1));
        // The chip row, the part's heading and its text, and the cross-fade
        // between parts: see LessonText.
        return (
          <LessonParts
            parts={lessonParts}
            at={at}
            minutes={readMinutes(textContent.markdown)}
            textSize={textSize}
          />
        );
      }
      // The start and the close of the day (bridge_in / bridge_out) are plain
      // text straight on the day frame's sheet, 24 from the screen edge. Each
      // paragraph is its own block in SimpleMarkdown, so a text with one
      // paragraph (the last day has no "tomorrow") leaves no gap behind.
      const isBridge = textContent.role === "bridge_in" || textContent.role === "bridge_out";
      // A lesson with one part, on the day frame's sheet: no chip row (and so
      // no gap for it), the big heading with its rule at the top.
      const lessonOnSheet = isTeach && !!dayFrame;
      return (
        <View style={isBridge ? styles.bridgeText : lessonOnSheet ? styles.lessonText : styles.textBlock}>
          {/* Reading copy sits directly on the dark canvas — light-on-dark. */}
          {/* `{{copyButton}}` on its own line marks where the Copy button goes,
              right under the sentence that tells the reader to send the text.
              With no marker the button follows the text. */}
          {(() => {
            const parts = textContent.markdown.split(/\n*\{\{copyButton\}\}\n*/);
            const copy = textContent.copy;
            // Under a list item the button lines up with that item's text, so
            // it reads as part of the step that tells the reader to copy.
            const button = (before: string) => {
              if (!copy) return null;
              const lastLine = before.trimEnd().split("\n").pop() ?? "";
              const inList = /^\s*(\d+\.|[-*])\s/.test(lastLine);
              return (
                <CopyTextButton
                  label={copy.label}
                  text={copy.text}
                  indent={inList ? LIST_TEXT_INDENT : 0}
                />
              );
            };
            return (
              <>
                {parts.map((part, i) => (
                  <React.Fragment key={i}>
                    {part.trim() ? (
                      <SimpleMarkdown
                        content={part}
                        textColor={colors.text.primary}
                        readingSize={isTeach ? textSize : undefined}
                        keyLeadIns={isTeach}
                        leadHeading={lessonOnSheet && i === 0 ? "big" : undefined}
                      />
                    ) : null}
                    {i < parts.length - 1 ? button(part) : null}
                  </React.Fragment>
                ))}
                {parts.length === 1 ? button(parts[0]) : null}
              </>
            );
          })()}
        </View>
      );
    }
    case ContentBlockType.VIDEO: {
      const videoContent = block.content as VideoBlockContent;
      const videoUri = videoContent.videoUrl || videoContent.videoId;
      console.log(
        "[ContentRenderer] Video URI:",
        videoUri,
        "| thumbnailUrl:",
        videoContent.thumbnailUrl,
      );
      return (
        <View style={dayFrame ? styles.mediaOnSheet : styles.mediaContainer}>
          {/*
            No isLocked or onPressUnlock. Both were passed for years and neither
            ever did anything: the server writes isLocked nowhere, so the prop
            was always undefined and the unlock path unreachable. It is not a
            gap in the paywall. getModuleWithBlocks refuses a pack the user has
            not bought before it returns any block at all, so a video that
            reaches this renderer is one they own.

            The title is fixed for the same reason: VideoBlockContent has no
            titleOverride on the server, so this read undefined every time and
            fell through to the same string.
          */}
          <VideoPlayer
            uri={videoUri}
            poster={videoContent.thumbnailUrl}
            autoPlay={true}
            maxHeight={videoMaxHeight}
            fallbackAspectRatio={dayFrame ? 9 / 16 : undefined}
          />
        </View>
      );
    }


    case ContentBlockType.ACTIVITY: {
      const content = block.content as ReferenceBlockContent;
      // The replies kept from a Reframe step, each with its thought. The copy
      // on this phone wins, since it is there the moment they come back; the
      // server's copy covers a reload or another device.
      const savedReframes = (() => {
        const mine = storeActivities
          .filter(
            (a) =>
              a.status === "COMPLETED" &&
              a.reframeCompletionData &&
              a.packId === packId &&
              a.moduleId === moduleId &&
              a.cognitivePractice?.id === content.refId,
          )
          .sort(
            (x, y) =>
              new Date(y.completedAt ?? 0).getTime() -
              new Date(x.completedAt ?? 0).getTime(),
          )[0]?.reframeCompletionData;
        const pairs = reframePairs(mine);
        return pairs.length > 0 ? pairs : savedPairsFromBlock(content);
      })();

      const handleStartActivity = async () => {
        console.log("Full Content Block:", JSON.stringify(content, null, 2));
        if (!packId || !moduleId) {
          showErrorBottomSheet("Error", "Pack context missing");
          return;
        }

        try {
          console.log("handleStartActivity triggered for block:", block.id);
          setLoading(true);

          // Fallback if activityType is undefined (it might be content.contentType)
          const contentType =
            content.activityType || (content as any).contentType;

          if (!contentType) {
            console.error("Missing contentType in block content", content);
            throw new Error("Content type is missing");
          }

          // Step 1: Create the activity record
          console.log(
            ">> Pack: Creating activity via POST /practice-activities",
            {
              packId,
              moduleId,
              contentType,
              contentId: content.refId,
            },
          );
          const activity = await createPracticeActivityFromPack({
            packId,
            moduleId,
            contentType: contentType as PracticeActivityContentType,
            contentId: content.refId,
          });
          console.log("<< Pack: Activity created successfully", activity.id);

          // Step 2: Start the activity (stamina check happens here)
          // If stamina is exhausted, this throws and the GlobalModal shows the upsell.
          // Navigation is blocked because we are still in the try block.
          const userId = useUserStore.getState().user?.id;
          if (!userId) {
            throw new Error("User not authenticated");
          }
          console.log(">> Pack: Starting activity (stamina check)", activity.id);
          // The generic dialog is suppressed so NO_CREDITS can open the
          // top-up sheet instead; every other refusal is still answered in
          // the catch below, and INSUFFICIENT_STAMINA still opens its upsell.
          const startedActivity = await startPracticeActivity({
            id: activity.id,
            userId,
            suppressErrorModal: true,
          });
          console.log("<< Pack: Activity started successfully (stamina OK)", startedActivity.id);

          // Notify parent that activity was created
          onActivityCreated?.(block.id, activity.id);

          // Add to store so completion updates work (use the started version)
          useActivityStore.getState().addActivity(startedActivity);

          // Step 3: Navigate ONLY after stamina check passes
          track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
            packId,
            moduleId,
            activityId: startedActivity.id,
            contentType,
            contentId: content.refId,
            title: content.titleOverride || "Practice Activity"
          });

          navigateToPackActivity(navigation, startedActivity, {
            blockId: block.id,
            moduleId,
            packId,
            blockIndex,
            alreadyStarted: true, // Tell the activity screen to skip its own start call
            writePrompt: content.completionPromptOverride,
            writePlaceholder: content.completionPlaceholderOverride,
            instructions: content.instructionsOverride,
            encouragement: content.encouragementOverride,
          });
        } catch (error: any) {
          console.error("Failed to start activity:", error);
          if (error.response) {
            console.error("Error status:", error.response.status);
            console.error("Error data:", error.response.data);
          }

          if (error?.response?.data?.errorCode === "NO_CREDITS") {
            setShowExhaustionSheet(true);
            return;
          }

          // Classification and copy live in util/packs/packErrors so the same
          // decision cannot drift between this screen and PackModule — and so
          // it can be tested without rendering a React Native tree.
          const message = packErrorMessage(classifyPackError(error));
          if (message) {
            showErrorBottomSheet(message.title, message.body);
          }
        } finally {
          setLoading(false);
        }
      };

      const activityDescription =
        content.descriptionOverride ||
        // Not "clinical challenge" — this is a practice activity, and calling
        // it clinical implies treatment we don't provide.
        "Start when you are ready.";

      // The card shows the task line and at most two hints; the rest of the
      // description is one tap away (StepCardSheet). Content without a
      // `card` falls back to its first sentence when it is long.
      const stepCard = content.card;
      const fallback = stepCard ? null : fallbackCard(activityDescription);
      const cardLine = stepCard ? stepCard.line : fallback!.line;
      const hasMore = stepCard ? true : fallback!.hasMore;
      const stepTitle = content.titleOverride || "Practice Activity";
      // A step that is not a practice (the real call) can name its own button.
      const startLabel = content.startLabel?.trim() || "Start practice";
      const stepSheet = hasMore ? (
        <StepCardSheet
          visible={showStepSheet}
          title={stepTitle}
          sections={stepCard ? stepCard.sections : [{ text: activityDescription }]}
          actionLabel={isCompleted ? "Do it again" : startLabel}
          onClose={() => setShowStepSheet(false)}
          onAction={handleStartActivity}
        />
      ) : null;

      const exhaustionSheet = (
        <ExhaustionSheet
          inProgram
          visible={showExhaustionSheet}
          onClose={() => setShowExhaustionSheet(false)}
          onResolved={() => {
            // Close only; confirm from onDismissed (see the PhoneCall screen).
            purchaseLandedRef.current = true;
            setShowExhaustionSheet(false);
          }}
          onDismissed={() => {
            if (!purchaseLandedRef.current) return;
            purchaseLandedRef.current = false;
            showSuccessBottomSheet(
              "You're all set",
              "Tap the practice again to start the call.",
            );
          }}
        />
      );

      // The whole sheet is the card (LaunchCard). Only the pinned button
      // starts the step, so the hints and "More about this step" are their
      // own taps and never start a call.
      const minutes = (content as ReferenceBlockContent & { estimatedMinutes?: number }).estimatedMinutes;
      return (
        <>
          <LaunchCard tone="practice" minutes={minutes} completed={isCompleted} title={stepTitle}>
            <LaunchPart>
              <SimpleMarkdown content={cardLine} textColor={colors.text.secondary} readingSize={15} />
            </LaunchPart>
            {launchAction({ label: startLabel, loading, onPress: handleStartActivity }, "Skip this practice")}
            {!isCompleted && stepCard?.hints.length ? (
              <LaunchPart gap={8}>
                <View style={styles.hints}>
                  {stepCard.hints.map((h, i) => (
                    <StepHint key={i} kind={h.kind} text={h.text} color={colors.text.secondary} />
                  ))}
                </View>
              </LaunchPart>
            ) : null}
            {isCompleted && savedReframes.length > 0 ? (
              <LaunchPart gap={12}>
                <SavedReframes pairs={savedReframes} />
              </LaunchPart>
            ) : null}
            {hasMore ? (
              <LaunchPart gap={12}>
                <TextLink label="More about this step" onPress={() => setShowStepSheet(true)} align="left" underline />
              </LaunchPart>
            ) : null}
          </LaunchCard>
          <DayLaunch label={startLabel} icon={icons.play} loading={loading} completed={!!isCompleted} onPress={handleStartActivity} />
          {stepSheet}
          {exhaustionSheet}
        </>
      );
    }

    case ContentBlockType.FORM: {
      const formContent = block.content as FormBlockContent;
      const config = formContent?.configuration;
      // The day's own text for this step first, as the ACTIVITY card does.
      // See util/packs/formBlock for why `config.description` alone showed
      // nothing.
      const { title: formTitle, body: formBody } = formCardText(formContent);

      const handleStartForm = () => {
        if (!packId || !moduleId) {
          showErrorBottomSheet("Error", "Pack context missing");
          return;
        }
        if (!config) {
          showErrorBottomSheet("Error", "Form configuration is missing");
          return;
        }
        (navigation as any).navigate("PackForm", {
          configuration: config,
          formId: formContent.formId,
          packId,
          moduleId,
          blockId: block.id,
          titleOverride: formContent.titleOverride,
          descriptionOverride: formContent.descriptionOverride,
          // Only a flag. The form screen fetches the answers when it opens,
          // because this day payload was loaded before the user left for the
          // activity and is not refetched on the way back.
          hasRecall: !!formContent.recallFrom,
          // No longer read by the form screen (its action is the brand orange,
          // founder decision 2026-11-27). Kept so the route's params do not change.
          accentKey: "purple",
        });
      };

      // The same launch card as a practice (LaunchCard, mock 05). Purple is
      // only the small "LOG" label; the action is the brand orange (founder
      // decision, 2026-11-27).
      // With no text of its own for the card, the step shows the form's
      // one-line summary, the line the form screen shows under the same title.
      const cardBody =
        formBody || formScreenHeader(config, formContent?.titleOverride, formContent?.descriptionOverride).description;
      return (
        <>
          <LaunchCard tone="log" completed={isCompleted} title={formTitle}>
            {cardBody ? (
              <LaunchPart>
                <SimpleMarkdown content={cardBody} textColor={colors.text.secondary} readingSize={15} />
              </LaunchPart>
            ) : null}
            {launchAction({ label: formStartLabel(config?.formKey, config?.fields), onPress: handleStartForm }, "Skip for now")}
          </LaunchCard>
          <DayLaunch label={formStartLabel(config?.formKey, config?.fields)} icon={icons.play} completed={!!isCompleted} onPress={handleStartForm} />
        </>
      );
    }

    case ContentBlockType.QUIZ: {
      const quiz = block.content as QuizBlockContent;
      const questions = quiz.questions ?? [];

      if (questions.length === 0) {
        // The server sends no questions when it could not resolve the block's
        // keys. Saying nothing is better than an empty card the user cannot
        // get past, and the day's other blocks still work.
        return null;
      }

      // Unlike FORM and ACTIVITY, which push a screen and come back, this one
      // renders where it stands. A recall question is two taps and pushing a
      // screen for it would cost more than the question does.
      return (
        <QuizRunner
          ref={quizRef}
          questions={questions}
          eyebrow={quiz.mode === "recall" ? "FROM YESTERDAY" : "CHECK"}
          // Every quiz of a day sits straight on the day frame's sheet. For
          // "From yesterday" the frame's orange zone says so (dayStepFrame),
          // so the number tile and the label row are not drawn.
          plain={!!dayFrame}
          // A check quiz has no zone title, so it keeps its own row: number
          // tile, "CHECK" and "Question 1 of 3" (mock 03). No card: the sheet
          // is the card.
          kindRow={quiz.mode !== "recall"}
          // Pip in the zone nods when an answer is picked: the same nod for
          // every answer, before Check, so it never marks right or wrong.
          onPick={quiz.mode === "recall" ? () => void dayFrame?.pip()?.pip?.perform(PIP_PICKED) : undefined}
          // While the answer sheet is up, the Pip that peeks over it has the
          // moment: the one in the zone goes down behind the page sheet, and
          // comes back up when the answer sheet has closed.
          onSheet={
            quiz.mode === "recall"
              ? (open) => {
                  const pip = dayFrame?.pip();
                  if (!pip) return;
                  if (open) void pip.down();
                  else void pip.rise({ quiet: true }).then(() => pip.pip?.perform(PIP_BACK));
                }
              : undefined
          }
          // Explain each answer as it is given. Every option carries an
          // explanation and a wrong answer costs nothing here, so there is no
          // reason to make somebody wait until the end to find out.
          revealExplanation
          // The day screen's bar above already shows the progress.
          countOnly
          // The explanation rises in a sheet (program UX review, 2026-11-25).
          explanationSheet
          onAnswer={async ({ question, selectedIndex }) => {
            // blockId, and nothing more. The server reads the pack, the day and
            // whether this asks about today or yesterday off the block itself.
            await submitQuizAnswer(question.id, [selectedIndex], block.id);
          }}
          onFinished={() => onQuizCompleted?.(block.id)}
          // The day screen's bottom bar is the quiz's button, so Check is
          // never below the fold. See util/packs/packFooter.
          onFooterChange={onQuizFooterChange}
        />
      );
    }

    // Both of these count as complete once rendered, the same as TEXT. They
    // ask nothing the day has to wait for, so neither reports a completion.
    case ContentBlockType.GOALS: {
      return (
        <GoalsBlock
          content={block.content as GoalsBlockContent}
          packId={packId}
        />
      );
    }

    case ContentBlockType.WEEK_REVIEW: {
      return (
        <WeekReviewBlock content={block.content as WeekReviewBlockContent} />
      );
    }

    // ... handle other types
    default:
      return (
        <Text variant="body" color="secondary">
          Unsupported block type: {block.type}
        </Text>
      );
  }
};

const useStyles = makeStyles(() => ({
  // A one-part lesson on the day frame's sheet: 24 from the screen edge (the
  // frame's content has the 16 gutter). Split lessons: LessonText.
  lessonText: { paddingHorizontal: spacing.sm, gap: spacing.lg },
  // 24 from the screen edge (the frame's content has the 16 gutter), 10 more above
  // (34 under the sheet's edge)
  bridgeText: {
    paddingHorizontal: spacing.sm,
    paddingTop: 10,
    gap: spacing.lg,
  },
  textBlock: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
    gap: spacing.lg,
  },
  // No fill: the player takes the video's own shape and may be narrower than
  // the column, and a grey card beside it would read as a frame around nothing.
  mediaContainer: {
    marginBottom: spacing.xl,
  },
  // The video on the day frame's sheet: 28 under the sheet's edge. It is the
  // only thing on the sheet, so it owns no gap under it.
  mediaOnSheet: {
    paddingTop: 4,
  },
  hints: { gap: spacing.sm, alignSelf: "stretch" },
}));
