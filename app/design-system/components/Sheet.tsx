import React, { useEffect, useId, useRef, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { radius, space, size, spacing } from "../primitives/scale";
import { duration } from "../motion";
import {
  hasOpenModalExcept,
  useNativeModalStore,
} from "../../stores/nativeModal";
import { relativeLuminance } from "../utils/contrast";
import { Text } from "./Text";
import { Gradient } from "./Gradient";

const { height: SCREEN_H } = Dimensions.get("window");
/** Decorative drag affordance shown on headerless sheets. */
const GRAB_HANDLE = { w: 40, h: 5 } as const;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional header title (left-aligned), floats above the card on the backdrop. */
  title?: string;
  /** Optional header actions (right) — typically one or two <IconButton>s. */
  right?: React.ReactNode;
  /** Override the sheet surface color (e.g. an accent for a themed guide). */
  color?: string;
  /** Fill the sheet surface with a gradient instead of a solid color (e.g. to match
   *  a parent gradient card). Takes precedence over `color`. */
  gradientColors?: readonly [string, string, ...string[]];
  /** Fires once the sheet has FULLY animated out and unmounted. Use this to run
   *  navigation after a close — the sheet is a native Modal, so navigating while
   *  it is still visible leaves it on top of (or lingering over) the new screen. */
  onDismissed?: () => void;
  contentStyle?: ViewStyle;
  /**
   * Defer presenting until no other native modal is open, to avoid the iOS
   * two-native-Modal touch freeze. Use for root-mounted sheets that fire on
   * events (e.g. OutcomeModal). Default false = present immediately (unchanged).
   */
  exclusive?: boolean;
}

/** Bottom-sheet modal: opaque backdrop that fades in place (never slides), the
 * card + optional header slide up together. Tap the backdrop to close. */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  children,
  title,
  right,
  color,
  gradientColors,
  onDismissed,
  contentStyle,
  exclusive = false,
}) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetId = useId();
  const hasHeader = !!(title || right);

  // Keep the latest callback in a ref so the exit-animation effect never needs it
  // in its deps (an inline closure would otherwise re-run the animation each render).
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  // The grab handle must read on whatever surface the sheet uses: a bright
  // accent fill needs a dark handle, the default dark card a light one.
  const surface = gradientColors?.[0] ?? color ?? colors.surface.elevated;
  const handleColor =
    relativeLuminance(surface) > 0.18 ? colors.text.onInverse : colors.border.strong;

  const [mounted, setMounted] = useState(visible && !exclusive);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  // Reduced motion: keep the backdrop opacity fade, drop the slide (the sheet appears
  // in place). Emil's rule — keep opacity, remove transform/position.
  const reduced = useReducedMotion();

  // NOTE: this sheet runs on the RN `Animated` engine (not Reanimated), so it can't
  // consume the Reanimated `easing.*` bezier worklets. Durations ARE tokenized
  // (`duration.fast`/`sheetIn`/`sheetOut`); the curves use RN's native out/in-cubic as
  // the engine-local analog of `easing.out`/`easing.in`. This is the one motion
  // engine-boundary exception (cf. the count-up rAF in AnimatedNumber).
  useEffect(() => {
    if (visible) {
      let cancelled = false;
      let unsub: (() => void) | undefined;

      const present = () => {
        if (cancelled) return;
        unsub?.();
        unsub = undefined;
        // Register synchronously before mounting so a second pending exclusive
        // modal, notified in the same registry update, sees us as open and waits.
        useNativeModalStore.getState().register(sheetId);
        setMounted(true);
        if (reduced) translateY.setValue(0);
        Animated.parallel([
          Animated.timing(backdrop, {
            toValue: 1,
            duration: duration.fast,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          ...(reduced
            ? []
            : [
                Animated.timing(translateY, {
                  toValue: 0,
                  duration: duration.sheetIn,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
        ]).start();
      };

      if (exclusive && hasOpenModalExcept(sheetId)) {
        // Another native modal is open — wait for the registry to clear.
        unsub = useNativeModalStore.subscribe(() => {
          if (!cancelled && !hasOpenModalExcept(sheetId)) present();
        });
      } else {
        present();
      }

      return () => {
        cancelled = true;
        unsub?.();
      };
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: duration.fast,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        ...(reduced
          ? []
          : [
              Animated.timing(translateY, {
                toValue: SCREEN_H,
                duration: duration.sheetOut,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
      ]).start(({ finished }) => {
        if (finished) {
          if (reduced) translateY.setValue(SCREEN_H);
          setMounted(false);
          onDismissedRef.current?.();
        }
      });
    }
  }, [visible, backdrop, translateY, reduced, exclusive, sheetId]);

  // Deregister once the native Modal is gone (exit finished, or unmount).
  useEffect(() => {
    if (!mounted) useNativeModalStore.getState().unregister(sheetId);
  }, [mounted, sheetId]);
  useEffect(
    () => () => useNativeModalStore.getState().unregister(sheetId),
    [sheetId],
  );

  if (!mounted) return null;

  const contentPad = {
    paddingHorizontal: space.screenX,
    paddingTop: hasHeader ? space.screenX : spacing.md,
    paddingBottom: Math.max(insets.bottom + spacing.lg, spacing["3xl"]),
  };
  const innerContent = (
    <>
      {!hasHeader ? (
        <View
          style={{
            width: GRAB_HANDLE.w,
            height: GRAB_HANDLE.h,
            borderRadius: radius.full,
            backgroundColor: handleColor,
            alignSelf: "center",
            marginBottom: spacing.lg,
          }}
        />
      ) : null}
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Opaque backdrop — fades in place, never slides. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background.sunken, opacity: backdrop },
          ]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Header + card slide up together as one unit. */}
        <Animated.View style={{ transform: [{ translateY }] }}>
          {hasHeader ? (
            <View style={styles.header}>
              {title ? <Text variant="h2">{title}</Text> : <View style={{ flex: 1 }} />}
              {right ? <View style={styles.actions}>{right}</View> : null}
            </View>
          ) : null}

          {gradientColors ? (
            // Gradient surface: overflow-clip the rounded top; the gradient fills
            // edge-to-edge behind an inner padded wrapper. (overflow:hidden drops the
            // iOS shadow — fine, a bright sheet reads on the dark backdrop regardless.)
            <View
              style={[
                {
                  borderTopLeftRadius: radius.pill,
                  borderTopRightRadius: radius.pill,
                  maxHeight: SCREEN_H * 0.85,
                  overflow: "hidden",
                  backgroundColor: gradientColors[0],
                },
                contentStyle,
              ]}
            >
              <Gradient colors={gradientColors} style={StyleSheet.absoluteFill} />
              <View style={contentPad}>{innerContent}</View>
            </View>
          ) : (
            <View
              style={[
                {
                  backgroundColor: color ?? colors.surface.elevated,
                  borderTopLeftRadius: radius.pill,
                  borderTopRightRadius: radius.pill,
                  ...contentPad,
                  maxHeight: SCREEN_H * 0.85,
                },
                elevation.e3,
                contentStyle,
              ]}
            >
              {innerContent}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: size.backBtn,
    paddingHorizontal: space.screenX,
    paddingBottom: space.groupGap,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
});
