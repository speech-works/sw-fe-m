import React from "react";
import { View, Text as RNText } from "react-native";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";

export interface BadgeProps {
  /** Numeric count; >99 shows "99+". Ignored when `dot`. */
  count?: number;
  /** Render a small dot instead of a count. */
  dot?: boolean;
  tone?: "danger" | "primary" | "success";
}

/** Notification badge — a count pill or a dot. */
export const Badge: React.FC<BadgeProps> = ({ count = 0, dot, tone = "danger" }) => {
  const { colors } = useTheme();
  const bg =
    tone === "primary" ? colors.action.primary : tone === "success" ? colors.accent.success : colors.accent.danger;
  // Dark-on-bright foreground (AA) — never white on these fills.
  const fg =
    tone === "primary" ? colors.action.onPrimary : tone === "success" ? colors.accentOn.success : colors.accentOn.danger;

  if (dot) {
    return <View style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: bg }} />;
  }
  const label = count > 99 ? "99+" : String(count);
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9999,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <RNText style={{ fontFamily: fonts.bold, fontSize: 11, color: fg }}>{label}</RNText>
    </View>
  );
};
