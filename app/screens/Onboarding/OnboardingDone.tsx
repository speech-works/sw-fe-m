import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../components/ScreenView";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useOnboardingStore } from "../../stores/onboarding";
import { useUserStore } from "../../stores/user";
import { getOffers, type OfferItem } from "../../api";
import OnboardingCelebration, { CelebrationConfetti } from "./OnboardingCelebration";
import {
  Button,
  Gradient,
  Icon,
  icons,
  SchemeStatusBar,
  space,
  spacing,
  radius,
  Text,
  useTheme,
  withAlpha,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

/**
 * THE PAYOFF MOMENT.
 *
 * This screen used to claim "we've built a personalised practice plan for you"
 * and then show nothing — a promise the user had to take on faith, at the exact
 * moment they'd earned proof. They just answered a dozen questions about the
 * situations they find hardest; the least we can do is show what that bought
 * them.
 *
 * So: no toast while they answer (that talks about the system, not them, and
 * interrupts the flow we most need finished). One payoff here instead, in
 * their own words — "you said phone calls are hardest, here's where we'd
 * start".
 *
 * It is deliberately NOT a buy button. Tapping through would mean crossing
 * navigators mid-onboarding, and pitching a purchase in the same breath as
 * "you're all set" reads as a bait-and-switch. The same matched program is
 * waiting on Home and in the shop the moment they continue.
 */
/** Button height + its padding + fade headroom, so content clears the dock. */
const DOCK_CLEARANCE = 56 + spacing["2xl"] + spacing["3xl"];

const OnboardingDone: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const stopOnboarding = useEventStore((s) => s.emit);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const [topMatch, setTopMatch] = useState<OfferItem | null>(null);

  // The clinical baseline is seeded in the same request that completes
  // onboarding, so by the time this screen mounts the backend can already
  // match them. If it can't, we simply say less — never invent a match.
  useEffect(() => {
    let cancelled = false;
    getOffers()
      .then((offers) => {
        if (cancelled || offers.signalLevel === "none") return;
        const best = offers.items.find(
          (i) => i.match?.level === "top" && !i.owned && i.match?.reason,
        );
        setTopMatch(best ?? null);
      })
      .catch((error) => {
        // A failed lookup costs the flourish, never the flow.
        console.error("[OnboardingDone] Failed to load match:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFinish = () => {
    track(ANALYTICS_EVENTS.ONBOARDING_COMPLETED);
    // Mark onboarding done HERE — the actual end of the flow.
    //
    // This used to happen back on the last question, the moment the server
    // confirmed completion. But MainNavigator renders the OnboardingStack on
    // `hasCompletedOnboarding === false`, so flipping it there unmounted the
    // stack mid-flow and the navigation to the phoneme picker died with it.
    // Setting it here means the navigator swaps exactly once, on purpose.
    const { user, setUser } = useUserStore.getState();
    if (user && !user.hasCompletedOnboarding) {
      setUser({ ...user, hasCompletedOnboarding: true });
    }
    // Reset local onboarding UI state
    resetOnboarding();
    // Ask MainNavigator to switch back to App flow
    stopOnboarding(EVENT_NAMES.STOP_ONBOARDING);
  };

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />
      {/* Scheme canvas (overrides the legacy light BgWrapper gradient). */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background.canvas },
        ]}
      />
      {/*
        Scrolls only when it has to. `flexGrow: 1` + `justifyContent: center`
        keeps the celebration centred on a roomy screen, but lets the content
        extend and scroll on a short one. It used to be a plain centred View
        with `paddingTop: 0`, so on an iPhone SE the block overflowed equally at
        both ends and the "You're all set!" heading was clipped underneath the
        status bar — the payoff line, hidden at the payoff moment.
      */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.xl,
            // Reserve the dock's height (+ its fade) so the last line of the
            // match card can always be scrolled clear of the floating button
            // instead of resting permanently underneath it.
            paddingBottom: insets.bottom + DOCK_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display">You&apos;re all set!</Text>

        <Text variant="body" color="secondary">
          {topMatch
            ? "Here's what we'd start with, based on what you told us."
            : "Thanks — that helps us shape what we put in front of you."}
        </Text>

        <OnboardingCelebration />

        {topMatch ? (
          <View
            style={[
              styles.matchCard,
              {
                backgroundColor: colors.surface.default,
                borderColor: withAlpha(colors.action.primary, 0.4),
              },
            ]}
          >
            <View style={styles.matchHeader}>
              <Icon
                name={icons.roadmap}
                size={18}
                color={colors.action.primary}
              />
              <Text variant="label" color={colors.action.primary}>
                MATCHED TO YOU
              </Text>
            </View>

            <Text variant="h3" color="primary">
              {topMatch.title}
            </Text>

            <Text variant="bodySm" color="secondary">
              {topMatch.match?.reason}
            </Text>

            <Text variant="caption" color="tertiary">
              You&apos;ll find it on your home screen.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating dock — the CTA sits ON the canvas, not in a boxed footer.
          The gradient dissolves scrolling content into the background before it
          reaches the button, so nothing ever ghosts through it or collides with
          it. Same recipe as the buy dock in ProgramSalesFlow. */}
      <View style={styles.dock} pointerEvents="box-none">
        <Gradient
          colors={[
            withAlpha(colors.background.canvas, 0),
            colors.background.canvas,
            colors.background.canvas,
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.dockFade}
          pointerEvents="none"
        />
        <View
          style={[
            styles.dockInner,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
          ]}
        >
          <Button label="Continue" onPress={handleFinish} />
        </View>
      </View>

      {/* Full-screen confetti, in front of everything (pointerEvents none, so the
          Continue button stays tappable). Falls from above the top edge to past
          the bottom on any device. */}
      <CelebrationConfetti />
    </ScreenView>
  );
};

export default OnboardingDone;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    // Deliberately NOT `justifyContent: "center"`.
    //
    // Centring a scroll container whose content OVERFLOWS pushes the overflow
    // out at BOTH ends — and the half above the top spills past scroll offset
    // 0, where nothing can ever scroll it back into view. On an iPhone SE that
    // permanently ate the "You're all set!" heading behind the status bar: the
    // payoff line, hidden at the payoff moment, with no way to reach it.
    // This screen always has enough content to fill the viewport, so the
    // centring bought nothing and cost the headline.
    justifyContent: "flex-start",
    gap: space.sectionGap,
  },
  matchCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Headroom so the dissolve finishes above the button.
    paddingTop: spacing["3xl"],
  },
  dockFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Begin the dissolve well above the dock: behind the CTA the backing is
    // fully opaque, so the button always reads at full contrast.
    top: -spacing["4xl"],
  },
  dockInner: {
    paddingHorizontal: space.screenX,
  },
});
