import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";

import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import { useVoicePreferenceStore } from "../../../stores/voicePreference";
import { ACCENT_META_BY_LOCALE } from "../../../util/voice";
import { useUserStore } from "../../../stores/user";
import { useAnalyticsConsentStore } from "../../../stores/analyticsConsent";
import { applyAnalyticsConsent } from "../../../util/analytics/postHog";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  Text,
  ListItem,
  Toggle,
  IconButton,
} from "../../../design-system";

const Preferences = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsStackNavigationProp<"Preferences">>();
  const { user } = useUserStore();
  const analyticsOn = useAnalyticsConsentStore((s) => s.enabled);
  const setAnalyticsOn = useAnalyticsConsentStore((s) => s.setEnabled);
  const [targetMins, setTargetMins] = useState(15);
  const [taskCount, setTaskCount] = useState(3);
  const [selectedGoalType, setSelectedGoalType] = useState("");

  const handleIncrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = prevMins + 5;
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleDecrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = Math.max(5, prevMins - 5);
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleIncrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = prevMins + 1;
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  const handleDecrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = Math.max(1, prevMins - 1);
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      const pref = await getUserPreferences(user.id);
      if (!pref) return;
      const {
        practiceGoalType,
        dailyPracticeLimitMinutes,
        dailyTaskCount,
      } = pref;
      if (practiceGoalType) {
        if (practiceGoalType === PracticeGoalType.TASK_BASED) {
          setSelectedGoalType("Task based");
        } else if (practiceGoalType === PracticeGoalType.TIME_BASED) {
          setSelectedGoalType("Time based");
        }
      }
      if (dailyPracticeLimitMinutes) setTargetMins(dailyPracticeLimitMinutes);
      if (dailyTaskCount) setTaskCount(dailyTaskCount);
    };
    fetchPreferences();
  }, [user]);

  const voicePref = useVoicePreferenceStore((s) => s.preference);
  const voiceDesc = voicePref
    ? `${ACCENT_META_BY_LOCALE[voicePref.accent]?.label ?? "Selected"} accent`
    : "Choose an accent";

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0, backgroundColor: colors.background.canvas }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            height: 60 + insets.top,
            backgroundColor: colors.background.canvas,
          },
        ]}
      >
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="h3">Preferences</Text>
        <View style={{ width: size.backBtn }} />
      </View>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: 60 + insets.top + 20 },
          ]}
        >
          <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
            <ListItem
              leftIcon="mic"
              label="Difficult Sounds"
              sublabel={`${user?.fearedSounds?.length || 0} sounds selected`}
              showChevron
              divider
              onPress={() => navigation.navigate("FearedSounds" as any)}
            />
            <ListItem
              leftIcon="volume-2"
              label="Reading voice"
              sublabel={voiceDesc}
              showChevron
              onPress={() => navigation.navigate("ReadingVoice")}
            />
          </View>

          <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
            <ListItem
              leftIcon="bar-chart-2"
              label="Share anonymous analytics"
              sublabel="Helps us improve the app. Never your voice or personal details."
              right={
                <Toggle
                  value={analyticsOn}
                  onChange={(v) => {
                    setAnalyticsOn(v);
                    applyAnalyticsConsent(v);
                  }}
                />
              }
            />
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Preferences;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  scrollView: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["4xl"],
  },
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
