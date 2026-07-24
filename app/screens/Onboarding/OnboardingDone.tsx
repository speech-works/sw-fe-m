import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import ScreenView from "../../components/ScreenView";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useOnboardingStore } from "../../stores/onboarding";
import { getOffers, type OfferItem } from "../../api";
import OnboardingCelebration from "./OnboardingCelebration";
import {
  Button,
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
const OnboardingDone: React.FC = () => {
  const { colors } = useTheme();
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
      <View style={styles.container}>
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
      </View>

      <View style={styles.footer}>
        <Button label="Continue" onPress={handleFinish} />
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: space.screenX,
    justifyContent: "center",
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
  footer: {
    padding: spacing["2xl"],
  },
});
