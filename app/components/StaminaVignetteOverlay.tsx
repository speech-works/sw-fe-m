import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { triggerHeartbeatHaptic } from "../util/functions/haptics";
import { castShadow, useTheme } from "../design-system";

const PULSE_COUNT = 3;
const PULSE_IN = 850;
const PULSE_OUT = 850;

const StaminaVignetteOverlay: React.FC = () => {
  const { colors } = useTheme();
  const { events, clear } = useEventStore();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  // Corner radius: iPhone X and later have rounded screens (~50-55pt); older
  // devices (iPhone SE) are square.
  //
  // This was `insets.bottom > 0`, which happened to work only because Android
  // reported 0 there. Under edge-to-edge Android reports the real nav bar, so
  // that test would flip every Android device from square to 50pt — a silent,
  // app-wide change to a full-screen overlay. The intent was always "iOS with a
  // home indicator", so test that directly.
  const insets = useSafeAreaInsets();
  const CORNER_RADIUS = Platform.OS === "ios" && insets.bottom > 0 ? 50 : 0;

  useEffect(() => {
    const triggered = events.find(
      (e) => e.name === EVENT_NAMES.STAMINA_ALERT_TRIGGERED,
    );
    if (!triggered || isAnimating.current) return;

    clear(triggered.name);
    isAnimating.current = true;

    triggerHeartbeatHaptic();

    const pulseSequence = Array.from({ length: PULSE_COUNT }).flatMap(() => [
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: PULSE_IN,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: PULSE_OUT,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
    ]);

    Animated.sequence(pulseSequence).start(() => {
      isAnimating.current = false;
      opacityAnim.setValue(0);
    });
  }, [events]);

  return (
    <Animated.View
      style={[styles.container, { opacity: opacityAnim }]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.borderRing,
          { borderRadius: CORNER_RADIUS, borderColor: colors.action.primary },
          // Full alpha is deliberate — this is a pulsing alert glow, not a
          // resting shadow. `blur: 30` is the CSS form of `shadowRadius: 15`.
          castShadow(colors.action.primary, { blur: 30, alpha: 1, elevation: 8 }),
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  borderRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4, // Stronger boundary (colour applied inline from the theme)
    // The glow is applied inline via `castShadow` — it needs the theme colour,
    // and the legacy shadow* props here never reached Android at all.
  },
});

export default StaminaVignetteOverlay;
