import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";

export interface SectionHeaderProps {
  /** Optional leading icon in a neutral chip. */
  icon?: IconName;
  title: string;
}

/** A titled section header — a neutral icon chip + an h-level title. Used to
 * head the cards/groups inside a form or detail screen. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.iconText }}>
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface.control,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border.default,
          }}
        >
          <Icon name={icon} size={16} color={colors.text.primary} />
        </View>
      ) : null}
      <Text variant="title">{title}</Text>
    </View>
  );
};
