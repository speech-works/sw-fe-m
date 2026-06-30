import React, { useEffect, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { duration as durationTokens } from "../motion";
import { TypographyVariant } from "../primitives/typography";
import { Text, TextProps } from "./Text";

export interface AnimatedNumberProps {
  value: number;
  variant?: TypographyVariant;
  color?: TextProps["color"];
  /** Count-up duration (ms). Defaults to `duration.count` (700). */
  duration?: number;
}

/**
 * Counts up 0 → `value` on mount with an ease-out-cubic curve (premium "tallying"
 * feel for stat numbers — XP, days, streak). Instant under reduced motion. Uses rAF
 * (the value is text, not a transform, so this stays off the layout/paint path).
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  variant = "h1",
  color,
  duration = durationTokens.count,
}) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion || value <= 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduceMotion]);

  return (
    <Text variant={variant} color={color}>
      {display.toLocaleString()}
    </Text>
  );
};
