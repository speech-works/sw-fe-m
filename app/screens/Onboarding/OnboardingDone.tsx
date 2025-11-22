import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenView from "../../components/ScreenView";
import Button from "../../components/Button";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useOnboardingStore } from "../../stores/onboarding";

const OnboardingDone: React.FC = () => {
  const stopOnboarding = useEventStore((s) => s.emit);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  const handleFinish = () => {
    // Reset local onboarding UI state
    resetOnboarding();

    // Ask MainNavigator to switch back to App flow
    stopOnboarding(EVENT_NAMES.STOP_ONBOARDING);
  };

  return (
    <ScreenView>
      <View style={styles.container}>
        <Text style={styles.title}>You're all set! 🎉</Text>

        <Text style={styles.subtitle}>
          Based on your answers, we’ve built a personalised practice plan for
          you.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button text="Continue" variant="normal" onPress={handleFinish} />
      </View>
    </ScreenView>
  );
};

export default OnboardingDone;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 24,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  footer: {
    padding: 24,
  },
});
