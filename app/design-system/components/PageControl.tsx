import React from "react";
import { View } from "react-native";
import { useTheme } from "../useTheme";

export interface PageControlProps {
  count: number;
  activeIndex: number;
  /** Active dot color (default brand). */
  color?: string;
}

/** Paging dots — active dot stretches into a brand pill. */
export const PageControl: React.FC<PageControlProps> = ({ count, activeIndex, color }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={i}
            style={{
              height: 8,
              width: active ? 20 : 8,
              borderRadius: 4,
              // Inactive dot: a solid muted tone visible in BOTH schemes
              // (surface.control is too faint at 8px on paper). Active = brand pill.
              backgroundColor: active ? color ?? colors.action.primary : colors.text.disabled,
            }}
          />
        );
      })}
    </View>
  );
};
