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
  const edge =
    tone === "primary" ? colors.action.primaryEdge : tone === "success" ? colors.accentEdge.success : colors.accentEdge.danger;

  if (dot) {
    // A 9px dot is a THIN GRAPHIC, not a fill, so it takes the on-surface cut
    // rather than the fill hue. An edge is meaningless at this size — there is
    // no interior left to bound — and the bright fills are 1.6–2.7:1 on paper,
    // which at 9px is not a dot, it is a smudge.
    const dotColor =
      tone === "primary" ? colors.text.accent : tone === "success" ? colors.accentText.success : colors.accentText.danger;
    return <View style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: dotColor }} />;
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
        // The count pill keeps its bright fill (it carries dark ink and has to
        // stay loud) and gets a boundary instead. "transparent" on ink.
        ...(edge === "transparent" ? null : { borderWidth: 1, borderColor: edge }),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <RNText style={{ fontFamily: fonts.bold, fontSize: 11, color: fg }}>{label}</RNText>
    </View>
  );
};
