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

const OnboardingWelcome: React.FC = () => {
  const { colors } = useTheme();
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
        <Text variant="display">Welcome to Speechworks</Text>
        <Text variant="body" color="secondary">
          Before we personalise your practice experience, tell us a little about
          your speaking patterns.
        </Text>
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
