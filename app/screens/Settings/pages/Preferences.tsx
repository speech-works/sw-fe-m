import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useVoicePreferenceStore } from "../../../stores/voicePreference";
import { useAppearanceStore } from "../../../stores/appearance";
import { ACCENT_META_BY_LOCALE } from "../../../util/voice";
import { useUserStore } from "../../../stores/user";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  radius,
  icons,
  ListItem,
  Page,
} from "../../../design-system";

/**
 * How the app behaves for you. Consent and findability live in Privacy — this
 * screen is only the dials.
 */
const Preferences = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"Preferences">>();
  const { user } = useUserStore();

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
          label="Difficult sounds"
          sublabel={`${user?.fearedSounds?.length || 0} sounds selected`}
          showChevron
          divider
          onPress={() => navigation.navigate("FearedSounds")}
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
