import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import PressableScale from "../../../components/PressableScale";
import { useAppearanceStore, AppearanceMode } from "../../../stores/appearance";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  spacing,
  radius,
  Text,
  Icon,
  Page,
  icons,
  IconName,
} from "../../../design-system";

/**
 * Appearance preference (Light / Dark / System). Selection applies INSTANTLY —
 * the whole app restyles live, which is the confirmation; no save step, no
 * goBack. Persisted device-level (survives logout) via useAppearanceStore.
 */
const OPTIONS: { mode: AppearanceMode; name: string; icon: IconName }[] = [
  { mode: "light", name: "Light", icon: icons.appearanceLight },
  { mode: "dark", name: "Dark", icon: icons.appearanceDark },
  { mode: "system", name: "System", icon: icons.appearance },
];

const Appearance = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"Appearance">>();
  const mode = useAppearanceStore((s) => s.mode);
  const setMode = useAppearanceStore((s) => s.setMode);
  const system = useColorScheme();

  const descriptions: Record<AppearanceMode, string> = {
    light: "Warm paper canvas, dark text",
    dark: "The signature dark canvas",
    system: `Match device setting (currently ${system === "light" ? "Light" : "Dark"})`,
  };

  return (
    <Page
      title="Appearance"
      description="Choose how Speechworks looks. Changes apply instantly."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.optionList}>
        {OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <PressableScale
              key={option.mode}
              onPress={() => setMode(option.mode)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: selected
                    ? colors.action.primaryTint
                    : colors.surface.default,
                  borderColor: selected
                    ? colors.action.primary
                    : colors.border.default,
                },
              ]}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: colors.surface.control },
                ]}
              >
                <Icon name={option.icon} size={22} color={colors.text.primary} />
              </View>
              <View style={styles.optionDescContainer}>
                <Text variant="title">{option.name}</Text>
                <Text variant="bodySm" color="secondary">
                  {descriptions[option.mode]}
                </Text>
              </View>
              {selected ? (
                <Icon name="check-circle" size={22} color={colors.action.primary} />
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </Page>
  );
};

export default Appearance;

const styles = StyleSheet.create({
  optionList: {
    gap: spacing.lg,
  },
  optionCard: {
    width: "100%",
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
  },
  optionIconContainer: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
  },
  optionDescContainer: {
    gap: 4,
    flex: 1,
  },
});
