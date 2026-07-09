import React from "react";
import { View, ScrollView, ViewStyle, StyleProp } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../useTheme";
import { space } from "../primitives/scale";

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ("top" | "bottom")[];
  background?: "canvas" | "raised";
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** Screen container: dark canvas background + safe-area padding + optional scroll. */
export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll,
  padded = true,
  edges = ["top"],
  background = "canvas",
  style,
  contentContainerStyle,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = background === "raised" ? colors.background.raised : colors.background.canvas;
  const pad: ViewStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingHorizontal: padded ? space.screenX : 0,
  };

  if (scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: bg }, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[pad, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: bg }, pad, style]}>{children}</View>;
};
