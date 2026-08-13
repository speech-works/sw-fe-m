import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useUserStore } from "../../../stores/user";
import { useAnalyticsConsentStore } from "../../../stores/analyticsConsent";
import { applyAnalyticsConsent } from "../../../util/analytics/postHog";
import { postResearchConsent } from "../../../api/users";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  radius,
  ListItem,
  Toggle,
  Page,
} from "../../../design-system";

/**
 * Everything that answers "who can see me, and what leaves this phone".
 *
 * These four controls used to be split across two places for no reason a user
 * could infer: findability and blocking sat at the top level of Settings, while
 * the analytics and research consents were filed under Preferences, which is
 * otherwise about how the app behaves for you (sounds, voice, theme). Consent is
 * not a preference, and "can strangers find me in a stuttering app" is not a
 * sibling of "dark mode". One screen, one question.
 */
const Privacy = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"Privacy">>();
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

  return (
    <Page
      title="Privacy"
      description="Who can find you, and what you share."
      onBack={() => navigation.goBack()}
    >
      <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
        {/* Never conditionally hidden when the block list is empty: this is the
            undo for an irreversible-looking action, and it has to be findable
            before you have blocked anyone — including by an App Review tester
            (Guideline 1.2). */}
        <ListItem
          leftIcon="search"
          label="Being findable"
          sublabel="Whether others can find you as a buddy"
          showChevron
          divider
          onPress={() => navigation.navigate("Discoverability")}
        />
        <ListItem
          leftIcon="users"
          label="Blocked people"
          sublabel="Manage who you've blocked"
          showChevron
          onPress={() => navigation.navigate("BlockedPeople")}
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

export default Privacy;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
