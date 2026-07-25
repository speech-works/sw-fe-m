import React, { useEffect, useMemo } from "react";
import Svg, { G, Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AvatarManifest, normalizeManifest } from "../types/avatar";
import { AvatarDefs, TILE } from "../assets/avatar/avatarKit";
import { PART_REGISTRY } from "../assets/avatar/registry";
import { easing, useMotion } from "../design-system";

/** Bespoke ambient loop period — the DS "Ambient (avatar float)" taxonomy row.
 *  Slow enough to be company, not a bid for attention. */
const FLOAT_PERIOD = 4000;

export interface UserAvatarProps {
  /** null/undefined ⇒ the default avatar (user has never saved one). */
  manifest?: AvatarManifest | null;
  /** Outer rendered square. The tile is 0.75 × size — the viewBox carries an
   *  8-unit bleed where props live (camera beside the chin, the summit flag). */
  size: number;
  /** Idle float. Forced off by OS reduced motion. */
  animate?: boolean;
  accessibilityLabel?: string;
}

/**
 * The user's avatar — one Svg, ordered layers, parts resolved from the
 * FE-owned registry. An unknown part id renders NOTHING by design: a catalog
 * change can never corrupt a stored manifest, and Phase E grant ids slot in
 * without touching this renderer.
 *
 * LAYER TABLE (fixed, bottom → top — the same discipline Reddit encodes as
 * numeric z-suffixes on its asset ids, _30 body … _70 hair … _80 hat):
 *
 *   L0 backdrop tile   — colors.bg fill
 *   L1 hair BACK       — the drape, behind the head (long/waves); hangs at the
 *                        sides/shoulders and shows below a hat brim
 *   L2 head plate      — skin
 *   L3 hair FRONT      — the crown, on the head — what a hat covers
 *   L4 beard           — facial hair on the lower face, UNDER the mouth
 *   L5 face            — eyes + mouth, over the crown/fringe + beard
 *   L6 eyewear         — over the face
 *   L7 headgear        — topmost ON the head: opaque, so it COVERS the crown
 *                        (never cut) and a brim covers the glasses' top
 *   L8 prop            — unmasked, beside the avatar (outside the tile circle)
 *
 * L0–L7 are masked to the tile circle; the prop alone escapes it.
 */
export const UserAvatar = React.memo<UserAvatarProps>(
  ({ manifest, size, animate = false, accessibilityLabel }) => {
    const { reduced } = useMotion();
    const m = useMemo(() => normalizeManifest(manifest), [manifest]);

    const float = useSharedValue(0);
    const floating = animate && !reduced;

    useEffect(() => {
      if (!floating) {
        cancelAnimation(float);
        float.value = 0;
        return;
      }
      float.value = withRepeat(
        withTiming(1, { duration: FLOAT_PERIOD, easing: easing.loop }),
        -1,
        true,
      );
      return () => cancelAnimation(float);
    }, [floating, float]);

    const floatStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: (float.value - 0.5) * (size * 0.016) }],
    }));

    const part = (slot: keyof AvatarManifest["parts"]) => {
      const id = m.parts[slot];
      if (!id) return null;
      const Component = PART_REGISTRY[slot][id];
      return Component ? <Component colors={m.colors} /> : null;
    };

    /** Hair renders in two passes — the back drape (behind the head) and the
     *  front crown (on it). A style with no drape returns null for "back". */
    const hair = (layer: "back" | "front") => {
      const id = m.parts.hair;
      if (!id) return null;
      const Component = PART_REGISTRY.hair[id];
      return Component ? <Component colors={m.colors} layer={layer} /> : null;
    };

    /** Collars wrap the neck: the "back" band sits behind the head, the "front"
     *  drape/knot lands over the chin. Same two-pass idiom as hair. */
    const collar = (layer: "back" | "front") => {
      const id = m.parts.collar;
      if (!id) return null;
      const Component = PART_REGISTRY.collar[id];
      return Component ? <Component colors={m.colors} layer={layer} /> : null;
    };

    return (
      <Animated.View
        style={floatStyle}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? "Your avatar"}
      >
        <Svg viewBox="-8 -8 64 64" width={size} height={size}>
          <AvatarDefs />
          <G mask="url(#av-circ)">
            <Path d={TILE} fill={m.colors.bg} />
            {collar("back")}
            {hair("back")}
            {part("head")}
            {hair("front")}
            {part("beard")}
            {part("face")}
            {collar("front")}
            {part("eyewear")}
            {part("headgear")}
          </G>
          {part("prop")}
        </Svg>
      </Animated.View>
    );
  },
);

UserAvatar.displayName = "UserAvatar";
