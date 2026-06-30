import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../useTheme";

export interface DividerProps {
  /** Left inset (e.g. to align with text past a leading icon). */
  inset?: number;
  /** Override the rule colour. Pass an on-fill ink (`accentOn.*`) when the divider
   *  sits on a bright accent surface, where the default `border.default` (a faint
   *  white) renders ~1.3:1 and is effectively invisible. */
  color?: string;
}

export const Divider: React.FC<DividerProps> = ({ inset = 0, color }) => {
  const { colors } = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color ?? colors.border.default, marginLeft: inset }} />
  );
};
