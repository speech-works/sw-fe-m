import React from "react";
import { View, Image, Text as RNText, TextStyle } from "react-native";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";

export interface AvatarProps {
  /** A letter, IPA symbol, or flag emoji (glyph mode). */
  glyph?: string;
  /** A photo URI — takes precedence over `glyph` (photo mode). */
  image?: string;
  size?: number;
  /** `circle` (default) or `rounded` square. */
  shape?: "circle" | "rounded";
  /** Background of the disc in glyph mode (default the white `surface.inverse`). */
  bg?: string;
}

/** Avatar primitive — a bright disc with a centered glyph, OR a photo. Either
 * shape (`circle` | `rounded` square). */
export const Avatar: React.FC<AvatarProps> = ({
  glyph,
  image,
  size = 48,
  shape = "circle",
  bg,
}) => {
  const { colors } = useTheme();
  const borderRadius = shape === "circle" ? size / 2 : Math.round(size * 0.28);

  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={{ width: size, height: size, borderRadius, backgroundColor: colors.surface.control }}
      />
    );
  }

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
        borderRadius,
        backgroundColor: bg ?? colors.surface.inverse,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glyph ? <RNText style={glyphStyle}>{glyph}</RNText> : null}
    </View>
  );
};
