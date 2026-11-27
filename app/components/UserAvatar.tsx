import React, { createContext, useContext } from "react";
import { View } from "react-native";
import type { AvatarManifest } from "../types/avatar";
import { useMotion } from "../design-system";
import { KitAvatarLive } from "./KitAvatar/KitAvatarLive";
import { KitAvatarStill } from "./KitAvatar/KitAvatarStill";
import type { KitVariant } from "./KitAvatar/kitLook";

/** DEV LAB ONLY (FxLab option mocks): draw every still avatar below with this treatment instead of its own. No screen sets it. */
export const AvatarVariantOverride = createContext<KitVariant | null>(null);

export interface UserAvatarProps {
  /** null/undefined ⇒ the default avatar (user has never saved one). */
  manifest?: AvatarManifest | null;
  /** The square box the avatar fills. The blob spans almost its full width. */
  size: number;
  /**
   * Live: the kit idle (blink, glance, breath). Only for the ONE avatar a
   * screen is about — Home's identity card and the Studio preview (founder,
   * 2026-11-27). Everything else is a still picture: lists, cards and small
   * avatars cost nothing per frame. Forced off by OS reduced motion.
   */
  animate?: boolean;
  /**
   * "circle" (default): the website's treatment — the figure on its colour
   * blob, the body cut by the blob's lower curve (full collar, no body edge).
   *
   * "square": a rounded-square frame the body runs past, for the screens
   * built on square tiles (the Community wall, Discover, buddy requests). The
   * frame is the old tile's size and corner, so those layouts are unchanged.
   *
   * "ring": no blob; the figure fills a circle that cuts it, the body running
   * on past the circle's lower arc (Home's energy ring and its info sheet).
   */
  shape?: "circle" | "square" | "ring";
  accessibilityLabel?: string;
}

/**
 * The user's avatar, drawn with the layered avatar kit (components/KitAvatar,
 * the website's kit). An unknown or old part id draws the kit default for its
 * slot, so a catalog change can never break a stored manifest.
 */
export const UserAvatar = React.memo<UserAvatarProps>(
  ({ manifest, size, animate = false, shape = "circle", accessibilityLabel }) => {
    const { reduced } = useMotion();
    const override = useContext(AvatarVariantOverride);
    const live = animate && !reduced && shape !== "square" && !override;
    return (
      <View
        style={{ width: size, height: size }}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? "Your avatar"}
      >
        {live ? (
          <KitAvatarLive manifest={manifest} size={size} ring={shape === "ring"} />
        ) : (
          <KitAvatarStill manifest={manifest} size={size} variant={override ?? (shape === "square" ? "frame" : shape === "ring" ? "ring" : "blob")} />
        )}
      </View>
    );
  },
);

UserAvatar.displayName = "UserAvatar";
