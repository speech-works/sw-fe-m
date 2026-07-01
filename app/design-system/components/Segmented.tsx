import React from "react";
import { View } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius } from "../primitives/scale";
import { Text } from "./Text";

export interface SegmentedProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

/** Segmented control — one active segment on a track. */
export const Segmented: React.FC<SegmentedProps> = ({ options, value, onChange }) => {
  const { colors } = useTheme();
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
              backgroundColor: active ? colors.surface.control : "transparent",
            }}
          >
            <Text variant="bodySm" color={active ? "primary" : "tertiary"}>
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
};
