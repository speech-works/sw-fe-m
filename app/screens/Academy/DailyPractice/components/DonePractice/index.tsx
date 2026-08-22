import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated, {
} from "react-native-reanimated";

import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import ScreenView from "../../../../../components/ScreenView";
import { ROUTE_NAMES } from "../../../../../constants/routes";
import {
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
  useNavBarInset,
} from "../../../../../design-system";
import Reminder from "../Reminder";
import { mapPracticeToCategory } from "../../../../../constants/reminderTemplates";
import { getMyBuddy } from "../../../../../api/buddies";
import { useInboxStore } from "../../../../../stores/inbox";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import { activityKindFromContentType } from "../../../../../util/functions/post";
import { useUserStore } from "../../../../../stores/user";
import { useMotion } from "../../../../../design-system/useMotion";
import { useCompletionCelebration } from "./useCompletionCelebration";
import { LevelUpTakeover } from "./LevelUpTakeover";
import MembershipDock from "../../../../../components/MembershipDock";

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

          {/* NO RUNNING COUNT HERE.
              A chip used to land after the tick with a lifetime total on it,
              first as "Braver · 11 times" and later as "11 hard things done".
              Both were the same idea: a number the app keeps about you, shown
              on the screen that exists to say you finished.

              The counts themselves are gone from the product. Reach carries
              what somebody set out to do, and XP carries the game. A third
              scoreboard, in words this app had to invent and then teach, was
              never the thing anyone came back for. */}
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
