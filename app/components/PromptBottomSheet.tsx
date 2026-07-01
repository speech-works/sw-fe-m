import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Sheet,
  IconButton,
  Text,
  Button,
  useTheme,
  spacing,
  icons,
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
}

/**
 * Shared confirmation prompt, built on the design-system `Sheet` so every prompt
 * across the app shares the same chrome: a floating close button in the sheet's
 * header (OUTSIDE the card, the DS convention) + a consistent centred body
 * (accent icon → title → message → stacked action buttons). Callers only pass
 * content — the look and feel is owned here, so it stays uniform everywhere.
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
}) => {
  const { colors } = useTheme();
  const accent = iconColor ?? colors.action.primary;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      right={<IconButton name={icons.close} onPress={onClose} />}
    >
      <View style={styles.container}>
        {/* Accent icon disc — a calm, consistent replacement for the old
            oversized rotated watermark. */}
        <View style={[styles.iconDisc, { backgroundColor: colors.action.primaryTint }]}>
          <MaterialCommunityIcons name={icon as any} size={28} color={accent} />
        </View>

        <Text variant="h3" color="primary" center style={styles.title}>
          {title}
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          {message}
        </Text>

        <View style={styles.buttons}>
          {primaryButton && (
            <Button
              label={primaryButton.label}
              variant={primaryButton.destructive ? "danger" : "primary"}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    lineHeight: 24,
    marginBottom: spacing["2xl"],
  },
  buttons: {
    width: "100%",
    gap: spacing.md,
  },
});

export default PromptBottomSheet;
