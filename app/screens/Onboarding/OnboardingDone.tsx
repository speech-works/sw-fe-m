import React from "react";
import { StyleSheet, View } from "react-native";
import ScreenView from "../../components/ScreenView";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
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

const OnboardingDone: React.FC = () => {
  const { colors } = useTheme();
  const stopOnboarding = useEventStore((s) => s.emit);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

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
        <Text variant="display">You're all set!</Text>

        <Text variant="body" color="secondary">
          Based on your answers, we’ve built a personalised practice plan for
          you.
        </Text>
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
  footer: {
    padding: spacing["2xl"],
  },
});
