import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import ScreenView from "../../../../../components/ScreenView";
import { ROUTE_NAMES } from "../../../../../constants/routes";
import {
  size,
  useTheme,
  useSuccessPop,
  spacing,
  radius,
  Text,
  Button,
  Icon,
  icons,
  onColor,
  withAlpha,
  AnimatedNumber,
  duration,
  spring,
  useNavBarInset,
  type IconName,
} from "../../../../../design-system";
import Reminder from "../Reminder";
import { mapPracticeToCategory } from "../../../../../constants/reminderTemplates";
import { getMyBuddy } from "../../../../../api/buddies";
import { useInboxStore } from "../../../../../stores/inbox";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import { activityKindFromContentType } from "../../../../../util/functions/post";
import {
  VISIBLE_AXES,
  GrowthAxis,
  fetchGrowthTotals,
} from "../../../../../api/dailyPlan";
import { axisAccent } from "../../../../../util/growth/accents";
import { countPhrase } from "../../../../../util/growth/format";
import { useCelebrationStore } from "../../../../../stores/celebration";
import { useUserStore } from "../../../../../stores/user";
import { useOnboardingNudgeStore } from "../../../../../stores/onboardingNudge";
import { useMotion } from "../../../../../design-system/useMotion";
import { useCompletionCelebration } from "./useCompletionCelebration";
import { LevelUpTakeover } from "./LevelUpTakeover";
import MembershipDock from "../../../../../components/MembershipDock";

/** Same glyphs as the growth card — one axis, one icon, wherever it appears. */
const AXIS_ICON: Record<string, IconName> = {
  [GrowthAxis.BRAVER]: icons.courage,
  [GrowthAxis.WIDER]: icons.globe,
  [GrowthAxis.REGULAR]: icons.streak,
};

interface DonePracticeProps {
  practiceName?: string;
  onDone?: () => void;
  isAborted?: boolean;
  from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  /** The completed activity — enables sharing it as a card-post (when paired). */
  activityId?: string;
  contentType?: PracticeActivityContentType;
  accentColor?: string;
  onAccentColor?: string;
}

const DonePractice = ({
  practiceName = "practice",
  onDone,
  isAborted = false,
  from,
  activityId,
  contentType,
  accentColor,
  onAccentColor,
}: DonePracticeProps) => {
  const { colors } = useTheme();
  const navBarInset = useNavBarInset();
  const navigation = useNavigation<any>();
  /** Whether this screen is the one the user is looking at. The takeover is
   *  gated on it so a celebration can NEVER surface over another screen — the
   *  pack `onDone` fallback (`navigate("PackModule")`) leaves DonePractice
   *  mounted but unfocused, and a late-firing arm timer would otherwise pop the
   *  modal on top of PackModule. Focus is an event, so this holds for every exit
   *  path — present and future — without per-button timer bookkeeping. */
  const isFocused = useIsFocused();
  // The inbox store is the source of truth for "do I have a buddy". This screen
  // used to keep its own independently-fetched copy, which meant blocking
  // someone in Community left this showing "Share with your buddy" — pointing
  // at the person just blocked. Fetch only to FILL the store when it hasn't
  // been determined yet, and write the answer back so there is one value.
  const storeHasBuddy = useInboxStore((s) => s.hasBuddy);
  const [fetchedHasBuddy, setFetchedHasBuddy] = useState<boolean | null>(null);
  const hasBuddy = storeHasBuddy ?? fetchedHasBuddy ?? false;
  const [hasShared, setHasShared] = useState(false);
  const pageColor = accentColor ?? colors.background.canvas;
  const foreground = onAccentColor ?? (accentColor ? onColor(accentColor, colors) : colors.text.primary);
  const mutedForeground = accentColor ? withAlpha(foreground, 0.68) : colors.text.secondary;
  const controlBorder = accentColor ? withAlpha(foreground, 0.2) : colors.border.strong;
  const primaryFill = accentColor ? colors.surface.elevated : undefined;
  const primaryInk = accentColor ? colors.text.primary : undefined;

  // Subtle entrance for the status disc — bouncy celebration when completed,
  // a gentler settle when the session was ended early. Reduced-motion aware.
  const discPop = useSuccessPop(true, { celebrate: !isAborted });
  const { reduced } = useMotion();

  /**
   * "That counts as Braver — taking on harder things."
   *
   * The axes come from the SERVER, recorded at the completion chokepoint and
   * bound to this activity's id — the client has no copy of the growth-point
   * registry and must not grow one, because the mapping depends on the practice
   * sub-type and a second copy would drift and be wrong about somebody's
   * growth.
   *
   * ONE axis, not a list. An interview moves both Braver and Wider, but three
   * clauses on a success screen reads as a scoreboard; VISIBLE_AXES is in
   * priority order, so taking the first names the most specific thing earned
   * and Regular only wins when nothing else applies.
   *
   * THE LABEL IS NEVER SHOWN WITHOUT ITS SUBTITLE — "Wider" alone means "did a
   * variety of exercises", the wrong meaning, and this is the one screen where
   * a user meets the word for the first time.
   */
  // Reads through a selector, so `earnedFor` MUST return a referentially stable
  // array on both branches (see NO_AXES in the celebration store) — under
  // zustand v5 a fresh `[]` here is an infinite re-render, not a wasted one.
  const earnedAxes = useCelebrationStore((s) => s.earnedFor(activityId));
  const shownAxis = VISIBLE_AXES.find((axis) => earnedAxes.includes(axis));
  /**
   * The chip's own colour, and the ink that is legible ON it.
   *
   * From the shared axis map so this screen cannot invent a hue, and so the
   * chip here is the same purple as the Regular block on Home and the Regular
   * disc on the growth card. `on`, never `fill`, for the text — the bright
   * fills are a documented contrast failure as foreground.
   *
   * The chip sits on an accent-coloured page (`accentColor`) on some screens,
   * so its own solid fill is what keeps it readable there too.
   */
  const accent = axisAccent(shownAxis ?? "", colors);
  const axisAccentFill = accent.fill;
  const axisAccentOn = accent.on;


  /**
   * THE ONE TIME WE EXPLAIN THE VOCABULARY, if this screen gets there first.
   *
   * Highest attention and lowest defensiveness in the product: they have just
   * finished something and are already reading. The alternative surface is
   * Home's growth row, which only carries it for people whose first count came
   * from the welcome call — that call ends on a feelings check-in we keep free
   * of scorekeeping on purpose.
   *
   * Marked on unmount rather than on render, so leaving the screen is what
   * counts as having had the chance to read it. A completion dismissed in half
   * a second should not burn the only explanation the words ever get.
   */
  const growthIntroduced = useOnboardingNudgeStore(
    (s) => s.growthIntroducedAt !== null,
  );
  const markGrowthIntroduced = useOnboardingNudgeStore(
    (s) => s.markGrowthIntroduced,
  );

  /**
   * THE RUNNING TOTAL, because "3 days" is a reward and "days you've practised"
   * is a definition.
   *
   * A definition is worth reading once; a number that went up because of what
   * you just did is worth reading every time. Fetched here rather than passed
   * down, so no completion screen has to know about growth to show it, and
   * alongside the buddy check this screen already makes.
   *
   * The chip renders on the label alone if this fails or is slow — the axis is
   * still true without its count, and a success screen must never wait on a
   * network call to say well done.
   */
  const [axisCount, setAxisCount] = useState<number | null>(null);
  useEffect(() => {
    if (!shownAxis || isAborted) return;
    let alive = true;
    void fetchGrowthTotals().then((totals) => {
      const n = totals?.axes.find((a) => a.axis === shownAxis)?.count ?? null;
      if (alive) setAxisCount(n);
    });
    return () => {
      alive = false;
    };
  }, [shownAxis, isAborted]);

  /**
   * The unit, spelled out beside the number, and now carrying the whole
   * meaning on its own.
   *
   * This chip used to read "Braver · 11 times", with "Hard things you've done"
   * on a second line underneath to say what Braver meant. Three lines to
   * deliver one number, and the first word of it was a word we invented. It now
   * reads "11 hard things done" and needs no gloss.
   *
   * The three axes deliberately count different things, so they cannot share a
   * noun. `countPhrase` owns the singular/plural so "1 days" cannot slip
   * through; the number itself is stripped because `AnimatedNumber` renders it.
   */
  const countUnit =
    shownAxis && axisCount !== null
      ? countPhrase(shownAxis, axisCount).replace(/^\d+\s/, "")
      : "";

  /**
   * No number, no chip.
   *
   * The old chip could render on the axis NAME alone while the count was in
   * flight, because "Braver" said something by itself. The phrase that replaced
   * it does not: "hard things done" with no figure in front of it is a caption
   * for a missing number. The chip exists to show a total move, so if the total
   * has not arrived there is nothing to show, and the entrance animation simply
   * runs when it does.
   */
  const showChip = !isAborted && !!shownAxis && axisCount !== null;

  /**
   * Declared here rather than beside the store reads above, because it now
   * hangs off `showChip`: the explanation must not appear over a chip that is
   * not there, and burning the once-ever introduction on a screen where the
   * count never loaded would spend it on nothing.
   */
  const showIntro = showChip && !growthIntroduced;
  useEffect(() => {
    if (!showIntro) return;
    return () => markGrowthIntroduced();
  }, [showIntro, markGrowthIntroduced]);

  /**
   * The chip lands AFTER the tick, not with it.
   *
   * Two things popping at once is one event; two things in sequence is a
   * consequence — the tick says "done", then the thing you earned arrives
   * because of it. `spring.bouncy` is the DS preset documented for exactly this
   * ("celebration / reaction pop — small overshoot"), so the overshoot is the
   * system's, not a number picked here.
   *
   * Reduced motion keeps the delay and the opacity and drops the scale, per the
   * house rule: gentler, never zero.
   */
  const chipIn = useSharedValue(0);
  useEffect(() => {
    if (!showChip) return;
    chipIn.value = reduced
      ? withDelay(200, withTiming(1, { duration: duration.base }))
      : withDelay(260, withSpring(1, spring.bouncy));
  }, [showChip, reduced, chipIn]);
  const chipStyle = useAnimatedStyle(() => ({
    opacity: chipIn.value,
    transform: [
      { scale: reduced ? 1 : interpolate(chipIn.value, [0, 1], [0.82, 1]) },
    ],
  }));

  // Routine completions stay a plain warm screen (they happen many times a
  // day). Only a real level-up — rare, genuinely exciting — earns a moment.
  // `activityId` binds the celebration to THIS completion's snapshot.
  const celebration = useCompletionCelebration({ enabled: !isAborted, activityId });
  // Read AFTER the celebration hook, which calls `setUser` with the fresh
  // totals — the manifest itself is untouched by a completion, but taking it
  // from the store keeps the reward cards on whatever the user last saved.
  const user = useUserStore((state) => state.user);
  const [showTakeover, setShowTakeover] = useState(false);
  const takeoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The takeover is a once-per-screen moment: never re-arm after it has been
   *  shown (otherwise an OS reduce-motion toggle re-runs the effect and the
   *  celebration re-appears after the user dismissed it). */
  const armedRef = useRef(false);

  const dismissTakeover = useCallback(() => {
    if (takeoverTimer.current) {
      clearTimeout(takeoverTimer.current);
      takeoverTimer.current = null;
    }
    setShowTakeover(false);
  }, []);

  /** Leaving the screen still clears the pending timer eagerly — the focus gate
   *  below is the real guarantee, this is just tidiness (no orphan timer). */
  const leaveScreen = useCallback(
    (go: () => void) => {
      dismissTakeover();
      go();
    },
    [dismissTakeover],
  );

  /** "Try them on" — the reward reveal's CTA. Routes through `leaveScreen` so
   *  the takeover is dismissed before we navigate: the Studio must not open
   *  underneath a live native Modal. `AvatarStudio` is a root-stack screen, so
   *  it is reachable from here. */
  const openStudio = useCallback(
    () => leaveScreen(() => navigation.navigate("AvatarStudio")),
    [leaveScreen, navigation],
  );

  // Arm the level-up takeover a beat after the success screen settles; reduced
  // motion arms it sooner. Navigating away before it arms simply loses it —
  // Home shows the new level.
  useEffect(() => {
    if (celebration.leveledUp && !armedRef.current) {
      armedRef.current = true;
      takeoverTimer.current = setTimeout(
        () => setShowTakeover(true),
        reduced ? 400 : 900,
      );
    }
    return () => {
      if (takeoverTimer.current) clearTimeout(takeoverTimer.current);
    };
  }, [celebration.leveledUp, reduced]);

  // Blur (the screen stops being focused — e.g. the pack fallback navigates to
  // PackModule over this still-mounted screen) cancels a pending arm. This is
  // the evented cleanup: a navigation event, not a per-exit-button call, so it
  // covers every way off the screen. Rendering is also gated on `isFocused`, so
  // even a timer that already fired can't surface the modal off-screen.
  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      if (takeoverTimer.current) {
        clearTimeout(takeoverTimer.current);
        takeoverTimer.current = null;
      }
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (isAborted) return;
    if (storeHasBuddy !== null) return; // store already knows — don't refetch
    getMyBuddy()
      .then((s) => {
        const v = s.link?.status === "active";
        setFetchedHasBuddy(v);
        useInboxStore.getState().setHasBuddy(v);
      })
      .catch(() => { }); // silently ignore — default is show the button
  }, [isAborted, storeHasBuddy]);

  return (
    <ScreenView style={styles.screen}>
      <StatusBar barStyle={accentColor ? "dark-content" : "light-content"} backgroundColor={pageColor} />

      {/* Dark canvas (replaces the legacy light gradient background). */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: pageColor }]} />

      {/* Confetti (Only if completed) — bright saturated hues read on the dark canvas.
          Gated on reduced motion here: ConfettiAnimation does not self-gate. */}
      {!isAborted && !reduced && <ConfettiAnimation />}

      {/* This screen reads no insets of its own and centres its content in the
          window. Under edge-to-edge the window grows by the nav bar, which would
          drag the centred block down; pad it back so the composition sits where
          it does today. 0 on iOS. */}
      <View style={[styles.content, { paddingBottom: navBarInset }]}>
        {/* Status disc — green success on completion, a calm neutral disc when aborted. */}
        <Animated.View
          style={[
            styles.disc,
            {
              backgroundColor: isAborted
                ? colors.surface.elevated
                : accentColor
                  ? colors.surface.elevated
                  : colors.accent.success,
            },
            discPop,
          ]}
        >
          <Icon
            name={isAborted ? icons.affirmation : icons.success}
            size={isAborted ? 50 : 60}
            color={
              isAborted
                ? colors.text.secondary
                : accentColor ?? colors.accentOn.success
            }
          />
        </Animated.View>

        {/* Success / Encouraging Text */}
        <View style={styles.textContainer}>
          <Text variant="h1" color={foreground} center>
            {isAborted ? "That's okay." : "Great Job!"}
          </Text>
          {/* THE GENERIC LINE IS GONE ON SUCCESS, and that is the point of the
              chip below rather than a side effect of it. "You've completed your
              daily word practice. Keep up the momentum!" was the most
              prominent sentence on this screen and carried no information —
              they had just done the practice, so it told them something they
              had watched happen, in a bigger and brighter style than the one
              line that said something new. Removing it is what let the earned
              thing stop reading as fine print.

              The ABORTED branch keeps its sentence. It is doing real work
              there: it names the way back, and it is the warmest copy in the
              app. */}
          {isAborted ? (
            <Text variant="body" color={mutedForeground} center style={styles.descText}>
              {`Every effort is a step forward. You can always return to your ${practiceName} when you feel ready.`}
            </Text>
          ) : null}

          {/* WHAT THIS COUNTED AS — an object you earned, not a caption.
              The axis was a third paragraph of muted text among four, which
              read as a footnote to a celebration rather than the substance of
              it. It is now a solid chip in the axis's own colour carrying its
              running total, because "3 days" is a reward and "days you've
              practised" is a definition — a definition is worth reading once,
              a number that moved because of what you just did is worth reading
              every time. Nothing at all when the activity moved no VISIBLE
              axis. */}
          {showChip ? (
            <Animated.View style={[styles.earnedChip, { backgroundColor: axisAccentFill }, chipStyle]}>
              <Icon name={AXIS_ICON[shownAxis!] ?? icons.growth} size={size.iconSm} color={axisAccentOn} />
              {/* Counts up rather than appearing, so the number is seen to
                  MOVE. The count is the whole reason it is here. */}
              <AnimatedNumber value={axisCount!} variant="title" color={axisAccentOn} />
              <Text variant="title" color={axisAccentOn}>
                {` ${countUnit}`}
              </Text>
            </Animated.View>
          ) : null}

          {/* The gloss under the chip is GONE, not moved. It existed to explain
              the invented word above it, and the chip now says the plain thing
              itself, so keeping it would just print the same sentence twice. */}

          {/* First time only. Says where the counting lives, and nothing about
              what we are NOT measuring — that was the old version's job and it
              made the reader's first task disproving something. */}
          {showIntro ? (
            <Text variant="caption" color={mutedForeground} center style={styles.introText}>
              We keep a running count. See it in your progress report.
            </Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {/* 1a. Share this session as a post — shown when paired */}
          {!isAborted && hasBuddy && !!activityId && from !== "MOOD_CHECK" && !hasShared && (
            <Button
              variant="secondary"
              label="Share this session"
              leftIcon={icons.share}
              style={accentColor ? { borderColor: controlBorder, backgroundColor: primaryFill } : undefined}
              onPress={() =>
                navigation.navigate("PracticeComposer", {
                  activityId,
                  activityKind: activityKindFromContentType(contentType),
                  activityName: practiceName,
                  accentColor,
                  onAccentColor,
                  onShared: () => setHasShared(true),
                })
              }
            />
          )}

          {/* 1b. Invite buddy — top, hidden when already paired or aborted */}
          {!isAborted && !hasBuddy && from !== "MOOD_CHECK" && (
            <Button
              variant="secondary"
              label="Invite a Practice Buddy"
              leftIcon={icons.addPerson}
              style={accentColor ? { borderColor: controlBorder, backgroundColor: primaryFill } : undefined}
              onPress={() =>
                navigation.navigate("Root", {
                  screen: ROUTE_NAMES.COMMUNITY,
                })
              }
            />
          )}

          {/* 2. Set Reminder — middle */}
          {from !== "MOOD_CHECK" && (
            <Reminder
              suggestedCategory={mapPracticeToCategory(practiceName)}
              renderTrigger={(onOpen) => (
                <Button
                  variant="secondary"
                  label="Set Reminder"
                  leftIcon={icons.reminder}
                  style={accentColor ? { borderColor: controlBorder, backgroundColor: primaryFill } : undefined}
                  onPress={onOpen}
                />
              )}
            />
          )}

          {/* 3. Primary CTA — always at the bottom */}
          {from === "MOOD_CHECK" ? (
            <>
              <Button
                variant="secondary"
                label="Explore More"
                leftIcon={icons.explore}
                style={accentColor ? { borderColor: controlBorder, backgroundColor: primaryFill } : undefined}
                onPress={() =>
                  leaveScreen(() =>
                    navigation.navigate("Root", {
                      screen: ROUTE_NAMES.EXPLORE,
                      params: { screen: "Explore", params: { scrollToJumpIn: true } },
                    }),
                  )
                }
              />
              <Button
                variant="primary"
                label="Back to Home"
                rightIcon={icons.home}
                accentColor={primaryFill}
                onAccentColor={primaryInk}
                onPress={() =>
                  leaveScreen(() =>
                    navigation.navigate("Root", {
                      screen: ROUTE_NAMES.HOME,
                    }),
                  )
                }
              />
            </>
          ) : onDone ? (
            <Button
              variant="primary"
              label="Done"
              rightIcon={icons.success}
              accentColor={primaryFill}
              onAccentColor={primaryInk}
              onPress={() => leaveScreen(onDone)}
            />
          ) : (
            <Button
              variant="primary"
              label="Explore More"
              rightIcon={icons.explore}
              accentColor={primaryFill}
              onAccentColor={primaryInk}
              onPress={() =>
                leaveScreen(() =>
                  navigation.navigate("Root", {
                    screen: ROUTE_NAMES.EXPLORE,
                    params: { screen: "Explore", params: { scrollToJumpIn: true } },
                  }),
                )
              }
            />
          )}
        </View>
      </View>

      {/* ── THE MEMBERSHIP ASK, AT A MOMENT WORTH ASKING IN ─────────────────
          The only place we sell membership today is the instant somebody runs
          out of practice: they wanted to carry on, we stopped them, and the
          next thing they saw was a price. This is the same offer after
          something went well instead.

          A DOCK, not a sheet, and rendered outside the centred content so it
          cannot push the celebration around. It never blocks, it decides for
          itself whether to appear at all (member, payments off, or asked
          already this week), and it stays away entirely on an abandoned
          session — congratulating nobody and then selling would be worse than
          saying nothing.

          It also waits for the level-up takeover. Two things asking for
          attention at once is how both get dismissed. */}
      {!isAborted && !showTakeover && (
        <View style={[styles.membershipDock, { bottom: navBarInset + 16 }]}>
          <MembershipDock />
        </View>
      )}

      {/* Level-up celebration — exclusive AnimatedModal, defers while any other
          native modal (e.g. the Reminder sheet) is up. onClose is the Phase-5
          reward-grant chaining seam. */}
      <LevelUpTakeover
        visible={showTakeover && isFocused}
        fromLevel={celebration.fromLevel}
        newLevel={celebration.newLevel}
        stageTitle={celebration.stageTitle}
        manifest={user?.avatarManifest}
        onClose={dismissTakeover}
        onTryOn={openStudio}
      />
    </ScreenView>
  );
};

export default DonePractice;

const styles = StyleSheet.create({
  /** Pinned to the bottom, over the content rather than inside it. */
  membershipDock: { position: "absolute", left: 16, right: 16 },
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    gap: spacing["4xl"],
  },
  disc: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  descText: {
    lineHeight: 24,
  },
  earnedChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  chipDot: { opacity: 0.55 },
  earnedText: {
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  introText: {
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  actionContainer: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
