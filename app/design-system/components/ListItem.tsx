import React from "react";
import { View, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, space, borderWidth } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

const CHIP = 40; // leading icon-chip diameter
const PAD_H = 16;

export interface ListItemProps {
  label: string;
  sublabel?: string;
  value?: string;
  leftIcon?: IconName;
  /** Optional accent for the icon chip (chip = tint @ 14%, icon = tint). Defaults to neutral. */
  iconTint?: string;
  right?: React.ReactNode;
  showChevron?: boolean;
  /** Render an inset hairline at the bottom (aligned to the text, not the chip). */
  divider?: boolean;
  onPress?: () => void;
}

/**
 * Standard settings-style row (≥44 tap target). A fixed-size leading icon chip
 * gives every row the same left column, so titles align and the optional inset
 * `divider` lines up with the text.
 */
export const ListItem: React.FC<ListItemProps> = ({
  label,
  sublabel,
  value,
  leftIcon,
  iconTint,
  right,
  showChevron,
  divider,
  onPress,
}) => {
  const { colors } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    minHeight: 64,
    paddingHorizontal: PAD_H,
    paddingVertical: 14,
    backgroundColor: colors.surface.default,
  };
  const textInset = leftIcon ? PAD_H + CHIP + space.iconText : PAD_H;

  const content = (
    <>
      {leftIcon ? (
        <View
          style={{
            width: CHIP,
            height: CHIP,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: iconTint ? iconTint + "24" : colors.surface.control,
          }}
        >
          <Icon name={leftIcon} size={20} color={iconTint ?? colors.text.secondary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="title">{label}</Text>
        {sublabel ? (
          <Text variant="bodySm" color="secondary" style={{ marginTop: space.titleSub }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySm" color="secondary">
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Icon name="chevron-right" size={20} color={colors.text.tertiary} /> : null}
      {divider ? (
        <View
          style={{
            position: "absolute",
            left: textInset,
            right: PAD_H,
            bottom: 0,
            height: borderWidth.hairline,
            backgroundColor: colors.border.hairline,
          }}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{content}</View>;
};
