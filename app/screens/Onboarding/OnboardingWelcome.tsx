import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import ScreenView from "../../components/ScreenView";
import {
    OnboardingStackNavigationProp,
    OnboardingStackParamList,
} from "../../navigators/stacks/OnboardingStack/types";
import { useOnboardingStore } from "../../stores/onboarding";
import {
  Button,
  SchemeStatusBar,
  space,
  spacing,
  Text,
  useTheme,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { useUserStore } from "../../stores/user";

const OnboardingWelcome: React.FC = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<
      OnboardingStackNavigationProp<keyof OnboardingStackParamList>
    >();
  const { startFresh } = useOnboardingStore();
  const user = useUserStore((s) => s.user);

  /**
   * Is this a repair rather than a first run?
   *
   * The cleanup migration reset onboarding for every account whose stored
   * answers were the old unreadable tokens. Those people already have history
   * here, so an account older than a day that is somehow "not onboarded" is
   * one of them — a genuinely new user reaches this screen within minutes of
   * signing up. Erring toward the plain welcome: if the timestamp is missing we
   * treat it as a first run.
   */
  const isReask = (() => {
    const created = user?.createdAt ? new Date(user.createdAt).getTime() : null;
    if (!created || Number.isNaN(created)) return false;
    return Date.now() - created > 24 * 60 * 60 * 1000;
  })();

  const handleStart = async () => {
    track(ANALYTICS_EVENTS.ONBOARDING_STARTED);
    try {
      const fetched = await getActiveOnboardingFlow();
      startFresh(fetched);
      navigation.navigate("OnboardingQuestion", { screenNumber: 1 });
    } catch (err) {
      console.error("Failed to load onboarding flow:", err);
    }
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
        {/* RETURNING USER WHOSE ANSWERS WERE UNREADABLE.
            A cleanup migration reset onboarding for accounts whose stored
            answers were the old random tokens — nothing about them could be
            decoded. Dropping those people back at "Welcome to Speechworks"
            would read as the app having lost them. Name what happened
            instead: it is our fix, not their mistake. */}
        {isReask ? (
          <>
            <Text variant="display">A better match, in a minute.</Text>
            <Text variant="body" color="secondary">
              We&apos;ve improved how we match programs to people. A few quick
              questions and yours will fit properly.
            </Text>
          </>
        ) : (
          <>
            <Text variant="display">Welcome to Speechworks</Text>
            <Text variant="body" color="secondary">
              Before we personalise your practice experience, tell us a little
              about your speaking patterns.
            </Text>
          </>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Button label="Start" onPress={handleStart} />
      </View>
    </ScreenView>
  );
};

export default OnboardingWelcome;

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
  buttonContainer: {
    padding: spacing["2xl"],
  },
});
