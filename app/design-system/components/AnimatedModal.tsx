import React, { useEffect, useId, useState } from "react";
import { Modal, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { duration, easing, spring } from "../motion";
import { radius, spacing } from "../primitives/scale";
import { useTheme } from "../useTheme";
import {
  hasOpenModalExcept,
  useNativeModalStore,
} from "../../stores/nativeModal";

export interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Dismiss when the scrim behind the card is tapped (default true). */
  dismissOnBackdrop?: boolean;
  /** Max width of the centered card (default 340). */
  maxWidth?: number;
  /** Extra style merged onto the default card chrome. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Render children raw — no card background / padding / elevation. */
  bare?: boolean;
  /**
   * Defer presenting until no other native modal is open, to avoid the iOS
   * two-native-Modal touch freeze. Use for root-mounted modals that fire on
   * events (they can appear over any open screen sheet). Default false = present
   * immediately (unchanged behavior).
   */
  exclusive?: boolean;
}

/**
 * The one standardized centered-modal motion: the card scales 0.96 → 1 while it and
 * the backdrop fade in together (transform-origin stays centered, per Emil). Exit is
 * faster than enter. Under reduced motion the scale is dropped — opacity only. It owns
 * a single native `Modal`, so it is safe to use as the sole modal over a Sheet that has
 * already dismissed (never stack two live native Modals).
 */
export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onClose,
  children,
  dismissOnBackdrop = true,
  maxWidth = 340,
  contentStyle,
  bare,
  exclusive = false,
}) => {
  const { colors, elevation } = useTheme();
  const reduced = useReducedMotion();
  const modalId = useId();
  // Keep the native Modal mounted through the exit animation, then unmount.
  const [mounted, setMounted] = useState(visible && !exclusive);
  const progress = useSharedValue(0); // 0 = hidden, 1 = shown

  useEffect(() => {
    if (visible) {
      let cancelled = false;
      let unsub: (() => void) | undefined;

      const present = () => {
        if (cancelled) return;
        unsub?.();
        unsub = undefined;
        // Register synchronously BEFORE mounting so a second pending exclusive
        // modal, notified in the same registry update, sees us as open and waits.
        useNativeModalStore.getState().register(modalId);
        setMounted(true);
        progress.value = reduced
          ? withTiming(1, { duration: duration.base })
          : withSpring(1, spring.gentle);
      };

      if (exclusive && hasOpenModalExcept(modalId)) {
        // Another native modal is open — wait for the registry to clear.
        unsub = useNativeModalStore.subscribe(() => {
          if (!cancelled && !hasOpenModalExcept(modalId)) present();
        });
      } else {
        present();
      }

      return () => {
        cancelled = true;
        unsub?.();
      };
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: duration.sheetOut, easing: easing.in },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
  }, [visible, reduced, exclusive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deregister once the native Modal is gone (exit finished, or unmount).
  useEffect(() => {
    if (!mounted) useNativeModalStore.getState().unregister(modalId);
  }, [mounted, modalId]);
  useEffect(
    () => () => useNativeModalStore.getState().unregister(modalId),
    [modalId],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduced ? 1 : interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background.sunken }, scrimStyle]}
        pointerEvents="none"
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={dismissOnBackdrop ? onClose : undefined}
      />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            bare
              ? null
              : [
                  styles.card,
                  { backgroundColor: colors.surface.elevated, maxWidth },
                  elevation.e3,
                  contentStyle,
                ],
            cardStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  card: {
    width: "100%",
    borderRadius: radius.sheet,
    padding: spacing["2xl"],
  },
});
