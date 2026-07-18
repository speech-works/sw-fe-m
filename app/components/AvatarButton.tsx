import React, { useMemo } from "react";
import { View } from "react-native";
import PressableScale from "./PressableScale";
import { UserAvatar } from "./UserAvatar";
import { useUserStore } from "../stores/user";
import { normalizeManifest } from "../types/avatar";
import { Avatar } from "../design-system";

interface AvatarButtonProps {
  /** Outer disc size. */
  size: number;
  /** Orange level badge overlapping the top-left, when provided. */
  level?: number;
  shape?: "circle" | "rounded";
  /** Tapped → open the avatar studio (callers own navigation / sheet-closing). */
  onPress: () => void;
}

/**
 * The user's owned avatar as a tappable identity disc (Settings hero, My
 * Profile). Reads the manifest straight from the user store, so a save in the
 * studio reflects here immediately without any refetch. The character is drawn
 * oversized and clipped to the disc (filled with its own backdrop colour) so it
 * reads as a solid avatar and the level badge sits flush on the edge.
 */
export const AvatarButton: React.FC<AvatarButtonProps> = ({
  size,
  level,
  shape = "rounded",
  onPress,
}) => {
  const { user } = useUserStore();
  const manifest = useMemo(
    () => normalizeManifest(user?.avatarManifest),
    [user?.avatarManifest],
  );
  const borderRadius = shape === "circle" ? size / 2 : Math.round(size * 0.28);
  // The tile is 0.75×size, so render at 4/3×size for the tile to fill the disc.
  const inner = Math.round(size * (4 / 3));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        user?.avatarManifest
          ? "Your avatar. Open the avatar studio."
          : "Create your avatar."
      }
    >
      <Avatar
        size={size}
        shape={shape}
        level={level}
        content={
          <View
            style={{
              width: size,
              height: size,
              borderRadius,
              overflow: "hidden",
              backgroundColor: manifest.colors.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserAvatar manifest={manifest} size={inner} />
          </View>
        }
      />
    </PressableScale>
  );
};
