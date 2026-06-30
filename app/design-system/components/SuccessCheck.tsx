import React, { useEffect } from "react";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { duration, spring } from "../motion";
import { radius } from "../primitives/scale";
import { useTheme } from "../useTheme";
import { Icon } from "./Icon";
import { icons } from "../icons";

/**
 * Animated style for a celebratory "pop": scales 0.6 → 1 with a small warm overshoot
 * (spring.bouncy) while fading in — the standard motion for success/delight moments
 * (save, share, reach-out, reminder added). Under reduced motion it fades only, no
 * scale. Drive it by flipping `active` to `true` the moment the success occurs.
 */
export function useSuccessPop(active: boolean) {
  const reduced = useReducedMotion();
  const p = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (active) {
      p.value = reduced ? withTiming(1, { duration: duration.base }) : withSpring(1, spring.bouncy);
    } else {
      p.value = 0;
    }
  }, [active, reduced, p]);

  return useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: reduced ? 1 : interpolate(p.value, [0, 1], [0.6, 1]) }],
  }));
}

export interface SuccessCheckProps {
  /** Disc diameter (default 56). */
  size?: number;
  /** When true, the check pops in (default true — pops on mount). */
  active?: boolean;
}

/**
 * A self-contained success disc — a valence-success circle with a check glyph that
 * pops in via {@link useSuccessPop}. This is a plain inline `Animated.View` (NOT a
 * native Modal), so it can be layered over a Sheet/overlay without the stacked-modal
 * touch-freeze.
 */
export const SuccessCheck: React.FC<SuccessCheckProps> = ({ size = 56, active = true }) => {
  const { colors } = useTheme();
  const style = useSuccessPop(active);
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: colors.accent.success,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon name={icons.success} size={Math.round(size * 0.5)} color={colors.accentOn.success} />
    </Animated.View>
  );
};
