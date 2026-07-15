import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";

import { useVoicePreferenceStore } from "../../../stores/voicePreference";
import { useAppearanceStore } from "../../../stores/appearance";
import { ACCENT_META_BY_LOCALE } from "../../../util/voice";
import { useUserStore } from "../../../stores/user";
import { useAnalyticsConsentStore } from "../../../stores/analyticsConsent";
import { applyAnalyticsConsent } from "../../../util/analytics/postHog";
import { postResearchConsent } from "../../../api/users";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  radius,
  icons,
  ListItem,
  Toggle,
  Page,
} from "../../../design-system";

const Preferences = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"Preferences">>();
  const { user, setUser } = useUserStore();
  const analyticsOn = useAnalyticsConsentStore((s) => s.enabled);
  const setAnalyticsOn = useAnalyticsConsentStore((s) => s.setEnabled);

  // Research consent (production-readiness pass, WS5) — opt-in, server is
  // the source of truth (read straight off the fetched user, no separate
  // local store, so there's no logout-scoping question).
  const handleResearchConsentChange = async (enabled: boolean) => {
    if (!user) return;
    setUser({ ...user, researchConsent: enabled });
    try {
      await postResearchConsent(enabled);
    } catch {
      setUser({ ...user, researchConsent: !enabled });
    }
  };
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

  const appearanceMode = useAppearanceStore((s) => s.mode);
  const appearanceDesc =
    appearanceMode === "system" ? "System" : appearanceMode === "dark" ? "Dark" : "Light";

  return (
    <Page title="Preferences" onBack={() => navigation.goBack()}>
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
              divider
              onPress={() => navigation.navigate("ReadingVoice")}
            />
            <ListItem
              leftIcon={icons.appearance}
              label="Appearance"
              sublabel={appearanceDesc}
              showChevron
              onPress={() => navigation.navigate("Appearance")}
            />
          </View>

          <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
            <ListItem
              leftIcon="bar-chart-2"
              label="Share anonymous analytics"
              sublabel="Helps us improve the app. Never your voice or personal details."
              divider
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
            <ListItem
              leftIcon="heart"
              label="Help improve care for people who stutter"
              sublabel="Optional. Lets us use your practice data for stuttering research. You can turn this off anytime."
              right={
                <Toggle
                  value={!!user?.researchConsent}
                  onChange={handleResearchConsentChange}
                />
              }
            />
      </View>
    </Page>
  );
};

export default Preferences;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
