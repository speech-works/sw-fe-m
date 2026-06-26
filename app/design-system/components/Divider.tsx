import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../useTheme";

export interface DividerProps {
  /** Left inset (e.g. to align with text past a leading icon). */
  inset?: number;
}

export const Divider: React.FC<DividerProps> = ({ inset = 0 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border.default, marginLeft: inset }} />
  );
};
