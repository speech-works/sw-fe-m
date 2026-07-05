import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius } from "../primitives/scale";
import { Text } from "./Text";

export interface SegmentedProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  /** Accent fill for the ACTIVE segment (e.g. the flow's `colors.accent.*`).
   *  Defaults to the neutral `surface.control` step. */
  accentColor?: string;
  /** AA-correct foreground for `accentColor` (`accentOn.*`). */
  onAccentColor?: string;
}

/** Segmented control — one active segment on a track. */
export const Segmented: React.FC<SegmentedProps> = ({
  options,
  value,
  onChange,
  accentColor,
  onAccentColor,
}) => {
  const { colors, elevation } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface.default,
        borderRadius: radius.chip,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        // Default active segment = the (deepened) control fill + a defined edge +
        // a soft shadow, so it reads as a raised, filled thumb on the track in
        // both schemes (a same-tone fill alone vanishes on paper). When an
        // accentColor is supplied it stays a bright accent fill (already legible).
        const activeStyle = accentColor
          ? { backgroundColor: accentColor }
          : {
              backgroundColor: colors.surface.control,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border.strong,
              ...elevation.e2,
            };
        return (
          <PressableScale
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: radius.chip - 4,
              alignItems: "center",
              justifyContent: "center",
              ...(active ? activeStyle : { backgroundColor: "transparent" }),
            }}
          >
            <Text
              variant="bodySm"
              color={
                active
                  ? accentColor
                    ? onAccentColor ?? "primary"
                    : "primary"
                  : "tertiary"
              }
            >
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
};
