import React from "react";
import { View } from "react-native";
import { BlurView } from "expo-blur";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

/**
 * Native mobile feedback — three patterns by PURPOSE (identical on iOS + Android):
 *   Toast    — passive, compact pill, auto-dismiss, no action
 *   Snackbar — one reversible action (Undo/Retry)
 *   Banner   — status, slides from top, material + grab handle
 * Presentational only; the imperative show/queue manager is wired when a screen
 * needs it (Phase E). Floating chrome uses expo-blur material.
 */

export interface ToastProps {
  message: string;
  icon?: IconName;
  iconColor?: string;
}
export const Toast: React.FC<ToastProps> = ({ message, icon = "check-circle", iconColor }) => {
  const { colors } = useTheme();
  return (
    <BlurView intensity={30} tint="dark" style={{ borderRadius: 9999, overflow: "hidden", alignSelf: "center" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.iconText,
          paddingVertical: 12,
          paddingHorizontal: 18,
          backgroundColor: colors.surface.material,
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <Icon name={icon} size={18} color={iconColor ?? colors.feedback.successText} />
        <Text variant="bodySm">{message}</Text>
      </View>
    </BlurView>
  );
};

export interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
export const Snackbar: React.FC<SnackbarProps> = ({ message, actionLabel, onAction }) => {
  const { colors, elevation } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 52,
          paddingLeft: 18,
          paddingRight: 8,
          borderRadius: radius.chip,
          backgroundColor: colors.surface.control,
          borderWidth: 1,
          borderColor: colors.border.default,
        },
        elevation.e3,
      ]}
    >
      <Text variant="bodySm" style={{ flex: 1 }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text variant="label" color="link">
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
};

export interface BannerProps {
  title: string;
  message?: string;
  icon?: IconName;
  tone?: "info" | "success" | "warning" | "danger";
}
export const Banner: React.FC<BannerProps> = ({ title, message, icon = "wifi-off", tone = "info" }) => {
  const { colors } = useTheme();
  const toneText = {
    info: colors.feedback.infoText,
    success: colors.feedback.successText,
    warning: colors.feedback.warningText,
    danger: colors.feedback.dangerText,
  }[tone];
  const toneFill = {
    info: colors.accent.info,
    success: colors.accent.success,
    warning: colors.accent.warning,
    danger: colors.accent.danger,
  }[tone];
  return (
    <BlurView intensity={30} tint="dark" style={{ borderRadius: 22, overflow: "hidden" }}>
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: space.iconText,
          backgroundColor: colors.surface.material,
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: toneFill + "29",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={18} color={toneText} />
        </View>
        <View style={{ flex: 1, paddingTop: 1 }}>
          <Text variant="title">{title}</Text>
          {message ? (
            <Text variant="bodySm" color="secondary" style={{ marginTop: space.titleSub }}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </BlurView>
  );
};
