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
  KeyboardAvoidingView,
  Platform,
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
import { withAlpha } from "../utils/color";
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
  /**
   * A control pinned below the scroll area, always in reach.
   *
   * Same name and same job as `Page`'s footer, for the same reason: a commit
   * button placed at the END of long content is only found by people who
   * scroll to the bottom, and a picker whose list is taller than the sheet
   * hides its own "Done". Anything here stays put while the content moves.
   *
   * For ONE primary action. A footer that grows into a toolbar is a sign the
   * sheet wants to be a screen.
   */
  footer?: React.ReactNode;
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
  footer,
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

  // What the fade must end on: the bottom of a gradient sheet, or its solid
  // surface. Getting this wrong shows up as exactly the band the fade exists to
  // avoid.
  const footerBase = gradientColors
    ? gradientColors[gradientColors.length - 1]
    : color ?? colors.surface.elevated;

  const contentPad = {
    paddingHorizontal: space.screenX,
    paddingTop: hasHeader ? space.screenX : spacing.md,
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
      {/*
        THE FOOTER IS IN FLOW, NOT FLOATING OVER THIS.

        It used to be absolutely positioned, with the scroll area padded by the
        footer's measured height so content could pass behind it. That reserve
        is correct while the content scrolls and is pure dead space when it does
        not: a two-line sheet came out tall and empty with its buttons stranded
        at the bottom of a void, because the gap was never a chosen space — it
        was whatever was left after the reserve.

        In flow, the card is content + footer and nothing else, so a short sheet
        is short. A tall one is capped by the card's own maxHeight, this wrapper
        shrinks, and the footer stays put because it is the sibling below it.
        The fade survives (see below), so content still dissolves rather than
        being cut by a band.
      */}
      <View style={styles.scrollWrap}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          /**
           * WITHOUT THIS, EVERY CONTROL IN A SHEET IS DEAD WHILE THE KEYBOARD
           * IS UP.
           *
           * The default is `"never"`: the scroll view swallows the first tap to
           * dismiss the keyboard, and the child under the finger never sees it.
           * So a sheet with a text input has a submit button that does nothing
           * on the first press, and looks broken rather than busy. `"handled"`
           * delivers the tap to the child and only dismisses the keyboard if
           * nothing handled it.
           *
           * It is set HERE rather than at a call site because it is true of
           * every sheet that will ever hold an input, and because the bug is
           * invisible on a simulator with a hardware keyboard attached, which
           * is exactly where it will be tested.
           */
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: footer
              ? spacing.md
              : Math.max(insets.bottom + spacing.lg, spacing["3xl"]),
          }}
        >
          {children}
        </ScrollView>
        {/* NEVER AN OPAQUE BAND. A solid bar with a rule across the top cuts the
            list in half and leaves what is under it looking chopped rather than
            continued. The app's answer everywhere else — `Page`'s footer, the
            recorder dock — is a fade, so content dissolves into the surface
            before it reaches the control.

            `footerBase`, not `scrimDown`, which is canvas-relative and would lay
            a near-black smudge over an elevated surface. `start`/`end` are
            explicit because `Gradient` otherwise falls back to the brand token's
            DIAGONAL direction, and a one-off vertical fade would silently run
            corner to corner. */}
        {footer ? (
          <View pointerEvents="none" style={styles.footerFade}>
            <Gradient
              colors={[withAlpha(footerBase, 0), withAlpha(footerBase, 0.92), footerBase]}
              locations={[0, 0.45, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}
      </View>
      {footer ? (
        <View
          style={[
            styles.footerRow,
            // The safe area belongs to whatever is actually last on screen.
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  // `statusBarTranslucent` below is REQUIRED, not cosmetic. Measured on Android
  // 16: without it this dialog gets its own window that is NOT edge-to-edge
  // (own insets t0 b0), while the `insets` used above come from the HOST window
  // via React context and report the full nav bar (b48) — so the sheet would pad
  // for a bar its own window already clears, double-padding every one of its ~40
  // call sites. With it, the dialog window matches the host and the existing
  // inset maths is correct. It also makes the backdrop cover the status bar
  // instead of stopping short of it.
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
      </KeyboardAvoidingView>
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
  // Shrinks so the footer below it always fits; grows only as far as its own
  // content needs. This is what lets a short sheet be short.
  scrollWrap: { flexShrink: 1 },
  // In flow under the scroll area, on the same gutter as the content, so no
  // negative-margin arithmetic decides where the controls sit.
  footerRow: { paddingTop: space.rowGap },
  // Pinned to the BOTTOM OF THE SCROLL AREA now rather than to the sheet, so it
  // fades the last of the content into the surface just above the controls.
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: space.sectionGap,
  },
});
