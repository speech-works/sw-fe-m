import React from "react";
import { View, Image, Text as RNText, TextStyle } from "react-native";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";
import { borderWidth } from "../primitives/scale";
import { Text } from "./Text";

export interface AvatarProps {
  /** A letter, IPA symbol, or flag emoji (glyph mode). */
  glyph?: string;
  /** A photo URI — takes precedence over `glyph` (photo mode). */
  image?: string;
  /** A custom node (e.g. a UserAvatar) — takes precedence over image/glyph,
   *  rendered centered in the `size` box. Keeps the level-badge frame. */
  content?: React.ReactNode;
  size?: number;
  /** `circle` (default) or `rounded` square. */
  shape?: "circle" | "rounded";
  /** Background of the disc in glyph mode (default the white `surface.inverse`). */
  bg?: string;
  /** Renders an orange level badge overlapping the top-left corner. */
  level?: number;
}

/** Avatar primitive — a bright disc with a centered glyph, a photo, or a custom
 * node. Either shape (`circle` | `rounded` square), with an optional level badge. */
export const Avatar: React.FC<AvatarProps> = ({
  glyph,
  image,
  content,
  size = 48,
  shape = "circle",
  bg,
  level,
}) => {
  const { colors } = useTheme();
  const borderRadius = shape === "circle" ? size / 2 : Math.round(size * 0.28);

  let face: React.ReactNode;
  if (content) {
    face = (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {content}
      </View>
    );
  } else if (image) {
    face = (
      <Image
        source={{ uri: image }}
        style={{ width: size, height: size, borderRadius, backgroundColor: colors.surface.control }}
      />
    );
  } else {
    const glyphStyle: TextStyle = {
      fontFamily: fonts.bold,
      fontSize: size * 0.52,
      color: colors.text.onInverse,
      lineHeight: size * 0.58,
    };
    face = (
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
  }

  if (level == null) return <>{face}</>;

  // Badge geometry scales with the avatar so it reads identically at any size.
  const badge = Math.round(size * 0.4);
  const offset = -Math.round(size * 0.05);
  return (
    <View style={{ width: size, height: size }}>
      {face}
      <View
        style={{
          position: "absolute",
          top: offset,
          left: offset,
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          backgroundColor: colors.action.primary,
          borderColor: colors.surface.elevated,
          borderWidth: borderWidth.thick,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="caption" color={colors.action.onPrimary}>
          {level}
        </Text>
      </View>
    </View>
  );
};
