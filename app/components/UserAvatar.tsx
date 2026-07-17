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
 * Layer order (fixed): backdrop tile → head plate → HAIR → face → eyewear →
 * headgear, all masked to the tile circle — then the prop, unmasked, so it
 * lives beside the avatar rather than painted on it. Hair sits UNDER the face
 * so the eyes read on top of it; headgear sits ON TOP of eyewear so a hat brim
 * covers the top of the glasses instead of the glasses drawing over the brim.
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
            {part("head")}
            {part("hair")}
            {part("face")}
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
