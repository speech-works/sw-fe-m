import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";
import { SemanticColors } from "../semantic/roles";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tints the icon to a practice-category hue (pair with an icon + label). */
  category?: keyof SemanticColors["category"];
  icon?: IconName;
}

/** Compact pill chip. Selected = orange/dark; category sets the icon tint only. */
export const Chip: React.FC<ChipProps> = ({ label, selected, onPress, category, icon }) => {
  const { colors } = useTheme();
  const catColor = category ? colors.category[category] : undefined;
  const bg = selected ? colors.action.primary : colors.surface.control;
  const fg = selected ? colors.action.onPrimary : colors.text.secondary;
  const iconColor = selected ? colors.action.onPrimary : catColor ?? colors.text.secondary;

  const chipStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: bg,
    // BOTH states carry an edge on paper, for the same reason and from opposite
    // directions: the unselected control fill is ~1.27:1 against the canvas, and
    // the selected orange fill is 2.02:1. Neither shape draws itself there. On
    // ink `primaryEdge` is "transparent", so the selected chip stays a clean
    // solid pill exactly as it is today.
    ...(selected
      ? colors.action.primaryEdge === "transparent"
        ? null
        : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.action.primaryEdge }
      : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border.strong }),
  };

  const content = (
    <>
      {icon ? <Icon name={icon} size={16} color={iconColor} /> : null}
      <Text variant="bodySm" color={fg}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={chipStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={chipStyle}>{content}</View>;
};
