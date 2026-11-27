import React, { useMemo } from "react";
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
 * The user's owned avatar as a tappable identity (Settings hero, My Profile).
 * Reads the manifest straight from the user store, so a save in the studio
 * reflects here immediately without any refetch.
 *
 * The character stands on its own colour blob, uncropped: a round or square
 * crop would cut the body flat and could cut the collar (repo rule: full
 * collar, body ends on the blob). The level badge sits at the top-left corner,
 * by the head, never over the collar. `shape` is kept for callers; the blob is
 * the same either way.
 */
export const AvatarButton: React.FC<AvatarButtonProps> = ({
  size,
  level,
  shape = "circle",
  onPress,
}) => {
  const { user } = useUserStore();
  const manifest = useMemo(
    () => normalizeManifest(user?.avatarManifest),
    [user?.avatarManifest],
  );
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
        content={<UserAvatar manifest={manifest} size={size} />}
      />
    </PressableScale>
  );
};
