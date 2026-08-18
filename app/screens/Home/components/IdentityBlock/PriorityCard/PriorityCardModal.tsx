import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import PressableScale from "../../../../../components/PressableScale";
import {
  Text,
  Icon,
  useTheme,
  spacing,
  radius,
  fonts,
  duration,
  easing,
} from "../../../../../design-system";
import { useRegisterNativeModal } from "../../../../../stores/nativeModal";
import type {
  HomePriorityCard,
  HomePriorityCardAction,
} from "../../../../../api/homeCards";
import { resolveAccent } from "./accent";

/**
 * ============================================================================
 * THE CHOOSER — a bottom sheet
 * ----------------------------------------------------------------------------
 * Only ever reached from a card that offers TWO OR THREE choices. A card with a
 * single destination navigates straight there: putting a panel in front of it
 * would be one tap of ceremony in exchange for nothing.
 *
 * ── WHY A SHEET, AND WHAT THAT COST ────────────────────────────────────────
 * This was a centred panel that grew out of the card's measured rect — the
 * folder becoming the panel. That reads beautifully once and is the wrong shape
 * for something opened most days: it arrives in the middle of the screen, far
 * from the thumb, and nothing about it suggests how to get rid of it.
 *
 * A sheet is anchored to the bottom, reachable one-handed, and its grabber says
 * "swipe me away" without a word. The trade, taken deliberately: the visual link
 * between the pressed card and the panel is gone. All the FLIP machinery went
 * with it — the origin rect, `measureInWindow`, the first-open-only rule, the
 * per-presentation scale maths. That machinery was also the source of the jank,
 * so the sheet is both simpler and smoother.
 *
 * ── THE ACCENT COMES FROM THE CONSOLE ──────────────────────────────────────
 * `card.accent` is a design-system KEY, not a colour. `resolveAccent` turns it
 * into the fill, the AA-correct ink on that fill, the AA text cut for a normal
 * surface, and the boundary a filled object needs on paper. The primary action
 * is the only thing that takes the fill, which is how this app uses accent
 * everywhere else: one filled object per surface, never a field of them.
 *
 * ── TWO THINGS THAT MUST NOT CHANGE ─────────────────────────────────────────
 * 1. No Reanimated `entering` / `exiting` / `layout` animation inside a native
 *    `Modal`. Unreliable on Android. All motion here is one shared value.
 * 2. Never let a second native Modal be open at once — an app-wide touch freeze
 *    on iOS, which is why this registers itself.
 * ============================================================================
 */

export interface PriorityCardModalProps {
  visible: boolean;
  card: HomePriorityCard;
  onChoose: (action: HomePriorityCardAction) => void;
  /** A deliberate refusal. Retires the card for good. */
  onSkip: () => void;
  onClose: () => void;
}

export const PriorityCardModal: React.FC<PriorityCardModalProps> = ({
  visible,
  card,
  onChoose,
  onSkip,
  onClose,
}) => {
  const { colors, elevation } = useTheme();
  const reduced = useReducedMotion();

  // Keep the native Modal mounted through the exit, then unmount.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useRegisterNativeModal(mounted);

  const accent = resolveAccent(card.accent, colors);
  const [primary, ...secondary] = card.actions;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: duration.sheetIn,
        easing: easing.out,
      });
      return;
    }
    if (!mounted) return;
    // Exit is faster than enter: slow where the user is deciding, fast where the
    // system is responding.
    progress.value = withTiming(
      0,
      { duration: duration.sheetOut, easing: easing.out },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const sheetStyle = useAnimatedStyle(() => {
    // Reduced motion keeps the opacity and drops the travel, per the design
    // system's rule. Gentler, not zero.
    if (reduced) return { opacity: progress.value, transform: [] };
    return {
      opacity: progress.value,
      // A PERCENTAGE, so the sheet always starts exactly its own height below
      // the fold regardless of how much copy the console wrote into it.
      // A PERCENTAGE, so the sheet always starts exactly its own height below
      // the fold regardless of how much copy the console wrote into it — no
      // measuring, and correct for a two-line title as well as a five-line one.
      transform: [
        { translateY: `${interpolate(progress.value, [0, 1], [100, 0])}%` },
      ],
    };
  });

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.background.sunken },
          scrimStyle,
        ]}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={styles.dock} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.raised,
              borderColor: colors.border.default,
            },
            elevation.e3,
            sheetStyle,
          ]}
        >
          {/* The grabber. Decorative here — there is no drag gesture yet — but it
              is the one mark that tells a thumb this is dismissible downward,
              and it costs four points of height. */}
          <View
            style={[styles.grab, { backgroundColor: colors.text.tertiary }]}
          />

          <Text variant="eyebrow" color={accent.text} numberOfLines={1}>
            {card.label}
          </Text>
          <Text variant="h2" color="primary" style={styles.title}>
            {card.modalTitle ?? card.line1}
          </Text>
          {card.modalBody ? (
            <Text variant="bodySm" color="tertiary" style={styles.body}>
              {card.modalBody}
            </Text>
          ) : null}

          <View style={styles.group}>
            {/* The ONE filled object on this surface. Everything else is a row,
                which is how the accent stays a signal rather than decoration. */}
            <PressableScale
              onPress={() => onChoose(primary)}
              accessibilityRole="button"
              accessibilityLabel={primary.label}
              style={[styles.btn, { backgroundColor: accent.fill }, accent.edge]}
            >
              <Text variant="label" color={accent.ink} style={styles.btnLabel}>
                {primary.label}
              </Text>
            </PressableScale>

            {secondary.map((action) => (
              <PressableScale
                key={action.id}
                onPress={() => onChoose(action)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={[
                  styles.btn,
                  styles.btnRow,
                  {
                    backgroundColor: colors.surface.elevated,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <Text
                  variant="label"
                  color="primary"
                  numberOfLines={2}
                  style={styles.grow}
                >
                  {action.label}
                </Text>
                <Icon
                  name="chevron-right"
                  size={16}
                  color={colors.text.tertiary}
                />
              </PressableScale>
            ))}
          </View>

          {/* The ONLY dismissal that retires the card. There is deliberately no
              equivalent on the card itself: two considered taps to refuse a
              message means no stray tap can throw one away. Tapping the scrim
              closes the sheet and leaves the card exactly where it was. */}
          <PressableScale
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Do not show this again"
            style={styles.skip}
          >
            <Text variant="caption" color="tertiary">
              Do not show this again
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PriorityCardModal;

const styles = StyleSheet.create({
  dock: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    // No bottom border: the sheet is flush with the screen edge, and a hairline
    // there would draw a seam along the bezel.
    borderBottomWidth: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    // Clears the home indicator on a gesture phone without a safe-area inset,
    // which is not available inside a native Modal on every platform.
    paddingBottom: spacing["3xl"],
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.extrabold,
    letterSpacing: -0.2,
    marginTop: spacing.xs,
  },
  body: { marginTop: spacing.sm },
  group: { marginTop: spacing.xl, gap: spacing.sm },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
  },
  btnRow: {
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnLabel: { fontFamily: fonts.extrabold },
  grow: { flex: 1, minWidth: 0 },
  skip: {
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
