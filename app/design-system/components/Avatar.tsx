import React from "react";
import { View, Text as RNText, TextStyle } from "react-native";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";

export interface AvatarProps {
  /** A letter, IPA symbol, or flag emoji. */
  glyph?: string;
  size?: number;
  /** Background of the disc (default the white `surface.inverse`). */
  bg?: string;
}

/** Standalone circular avatar: a bright disc with a centered glyph. */
export const Avatar: React.FC<AvatarProps> = ({ glyph, size = 48, bg }) => {
  const { colors } = useTheme();
  const glyphStyle: TextStyle = {
    fontFamily: fonts.bold,
    fontSize: size * 0.52,
    color: colors.text.onInverse,
    lineHeight: size * 0.58,
  };
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg ?? colors.surface.inverse,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glyph ? <RNText style={glyphStyle}>{glyph}</RNText> : null}
    </View>
  );
};
