import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "../useTheme";
import { Text } from "./Text";

export interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  /** Optional caption under the spinner (e.g. "Loading sounds…"). */
  label?: string;
  /** Fill + center over the parent with a scrim (modal-style loader). */
  fullscreen?: boolean;
}

/** Tokenized loading indicator — inline by default, or a centered overlay. */
export const Spinner: React.FC<SpinnerProps> = ({ size = "large", color, label, fullscreen = false }) => {
  const { colors } = useTheme();
  const inner = (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size={size} color={color ?? colors.action.primary} />
      {label ? (
        <Text variant="bodySm" color="secondary">
          {label}
        </Text>
      ) : null}
    </View>
  );

  if (fullscreen) {
    return (
      <View
        style={{
          ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.overlay.scrim,
        }}
      >
        {inner}
      </View>
    );
  }
  return inner;
};
