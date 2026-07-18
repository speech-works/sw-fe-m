import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
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
