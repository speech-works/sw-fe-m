import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Sheet,
  Text,
  Button,
  useTheme,
  radius,
  spacing,
  withAlpha,
  darkenForContrast,
  mix,
} from "../design-system";

interface PromptBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  primaryButton?: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
  };
  secondaryButton?: {
    label: string;
    onPress: () => void;
  };
  accentColor?: string;
  onAccentColor?: string;
}

/**
 * Shared confirmation prompt on the design-system `Sheet`, so every prompt across
 * the app shares one chrome: grab handle + backdrop-tap dismiss (NO cross button),
 * with a centred body (accent icon disc → title → message → stacked action
 * buttons) matching `OutcomeModal`. Callers pass only content.
 */
const PromptBottomSheet: React.FC<PromptBottomSheetProps> = ({
  visible,
  onClose,
  title,
  message,
  icon = "alert-circle-outline",
  iconColor,
  primaryButton,
  secondaryButton,
  accentColor,
  onAccentColor,
}) => {
  const { colors } = useTheme();
  const accent = accentColor ?? iconColor ?? colors.action.primary;
  // The header icon + ghost-button label are colored foreground on the sheet —
  // darken the caller's hue to clear AA on paper (a no-op on dark). Keep bright
  // `accent` for the icon-disc wash fill; the primary Button computes its own ink.
  const accentFg = darkenForContrast(accent, mix(colors.surface.elevated, accent, 0.14));

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.iconDisc, { backgroundColor: withAlpha(accent, 0.14) }]}>
          <MaterialCommunityIcons name={icon as any} size={28} color={accentFg} />
        </View>

        <Text variant="h2" center>
          {title}
        </Text>
        <Text variant="bodySm" color="secondary" center>
          {message}
        </Text>

        <View style={styles.buttons}>
          {primaryButton && (
            <Button
              label={primaryButton.label}
              variant={primaryButton.destructive ? "danger" : "primary"}
              accentColor={primaryButton.destructive ? undefined : accentColor}
              onAccentColor={primaryButton.destructive ? undefined : onAccentColor}
              onPress={() => {
                primaryButton.onPress();
                onClose();
              }}
            />
          )}

          {secondaryButton && (
            <Button
              label={secondaryButton.label}
              variant="ghost"
              onColor={accentFg}
              onPress={() => {
                secondaryButton.onPress();
                onClose();
              }}
            />
          )}
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

export default PromptBottomSheet;
