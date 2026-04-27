import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import Button from "../../components/Button";
import ScreenView from "../../components/ScreenView";
import {
    OnboardingStackNavigationProp,
    OnboardingStackParamList,
} from "../../navigators/stacks/OnboardingStack/types";
import { useOnboardingStore } from "../../stores/onboarding";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const OnboardingWelcome: React.FC = () => {
  const navigation =
    useNavigation<
      OnboardingStackNavigationProp<keyof OnboardingStackParamList>
    >();
  const { startFresh } = useOnboardingStore();

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
    <ScreenView>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Speechworks 👋</Text>
        <Text style={styles.subtitle}>
          Before we personalise your practice experience, tell us a little about
          your speaking patterns.
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button text="Start" variant="normal" onPress={handleStart} />
      </View>
    </ScreenView>
  );
};

export default OnboardingWelcome;

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
    textAlign: "left",
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  buttonContainer: {
    padding: 24,
  },
});
