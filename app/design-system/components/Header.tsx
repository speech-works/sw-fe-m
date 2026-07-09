import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { size, space } from "../primitives/scale";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

export interface HeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** "default" = centered title in the bar; "large" = small bar + big screenTitle below. */
  variant?: "default" | "large";
}

/** Top bar: round back button (≥44) + title. `large` adds a screenTitle beneath. */
export const Header: React.FC<HeaderProps> = ({ title, onBack, right, variant = "default" }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: size.backBtn,
          paddingHorizontal: space.screenX,
        }}
      >
        {onBack ? (
          <IconButton name="arrow-left" onPress={onBack} />
        ) : (
          <View style={{ width: size.backBtn }} />
        )}

        {variant === "default" && title ? (
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
            {title}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={{ width: size.backBtn, alignItems: "flex-end" }}>{right}</View>
      </View>

      {variant === "large" && title ? (
        <Text variant="screenTitle" style={{ paddingHorizontal: space.screenX, marginTop: 8 }}>
          {title}
        </Text>
      ) : null}
    </View>
  );
};
