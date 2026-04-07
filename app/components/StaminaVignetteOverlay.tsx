import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { triggerHeartbeatHaptic } from "../util/functions/haptics";

const PULSE_COUNT = 3;
const PULSE_IN = 850;
const PULSE_OUT = 850;

const GLOW_COLOR = "rgba(251, 113, 36, 0.85)"; // Stronger orange

const StaminaVignetteOverlay: React.FC = () => {
  const { events, clear } = useEventStore();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const insets = useSafeAreaInsets();

  // Dynamic corner radius: Devices with a physical safe area at the bottom
  // (iPhone X and later) feature rounded screens (usually ~50-55pt).
  // Older devices (iPhone SE) have square screens (0pt).
  const CORNER_RADIUS = insets.bottom > 0 ? 50 : 0;

  useEffect(() => {
    const triggered = events.find(
      (e) => e.name === EVENT_NAMES.STAMINA_ALERT_TRIGGERED,
    );
    if (!triggered || isAnimating.current) return;

    clear(EVENT_NAMES.STAMINA_ALERT_TRIGGERED);
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
      <View style={[styles.borderRing, { borderRadius: CORNER_RADIUS }]} />
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
    borderWidth: 4, // Stronger boundary
    borderColor: GLOW_COLOR,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15, // Maximize glowing effect
    elevation: 8, // Adds Android shadow support
  },
});

export default StaminaVignetteOverlay;
