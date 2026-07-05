import React from "react";
import { View, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, space, size, borderWidth } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

const CHIP = size.avatarChip; // leading icon-chip diameter (48)
const PAD_H = space.cardPad; // 16

export interface ListItemProps {
  label: string;
  sublabel?: string;
  value?: string;
  leftIcon?: IconName;
  right?: React.ReactNode;
  showChevron?: boolean;
  /** Render an inset hairline at the bottom (aligned to the text, not the chip). */
  divider?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
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
  right,
  showChevron,
  divider,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    minHeight: size.row,
    paddingHorizontal: PAD_H,
    paddingVertical: space.cardPad,
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
            backgroundColor: colors.surface.control,
            borderWidth: borderWidth.hairline,
            borderColor: colors.border.default,
          }}
        >
          <Icon name={leftIcon} size={22} color={colors.text.primary} />
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

  if (onPress || onLongPress) {
    return (
      <PressableScale onPress={onPress} onLongPress={onLongPress} style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{content}</View>;
};
