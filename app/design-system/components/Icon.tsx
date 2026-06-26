import React from "react";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../useTheme";

/**
 * The design-system icon set is Feather (clean line icons, the family Lucide
 * forked from) — already bundled via @expo/vector-icons, so no new dependency.
 * New components use ONLY this; legacy icon sets (FontAwesome5, MaterialCommunity)
 * stay in un-migrated screens until their wave.
 */
export type IconName = React.ComponentProps<typeof Feather>["name"];

export interface IconProps {
  name: IconName;
  size?: number; // use scale.size.icon (20) / iconSm (16) / tabIcon (24)
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color }) => {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.text.primary} />;
};
