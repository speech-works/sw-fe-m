import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ScreenView from "../../components/ScreenView";
import Button from "../../components/Button";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  OnboardingStackNavigationProp,
  OnboardingStackParamList,
} from "../../navigators/stacks/OnboardingStack/types";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import { useOnboardingStore } from "../../stores/onboarding";

// Note: Removed useEventStore/emit because MainNavigator already mounted this stack.
// We just need to navigate within the stack now.

const OnboardingWelcome: React.FC = () => {
  const navigation =
    useNavigation<
      OnboardingStackNavigationProp<keyof OnboardingStackParamList>
    >();
  const startFresh = useOnboardingStore((s) => s.startFresh);

  const handleStart = async () => {
    try {
      const fetched = await getActiveOnboardingFlow();

      // Use startFresh to explicitly ensure we are at Screen 1
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
