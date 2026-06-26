import React from "react";
import { View, ViewStyle } from "react-native";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

export interface ListItemProps {
  label: string;
  sublabel?: string;
  value?: string;
  leftIcon?: IconName;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
}

/** Standard settings-style row (≥44 tap target). */
export const ListItem: React.FC<ListItemProps> = ({
  label,
  sublabel,
  value,
  leftIcon,
  right,
  showChevron,
  onPress,
}) => {
  const { colors } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.input,
    backgroundColor: colors.surface.default,
  };

  const content = (
    <>
      {leftIcon ? <Icon name={leftIcon} size={20} color={colors.text.secondary} /> : null}
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
