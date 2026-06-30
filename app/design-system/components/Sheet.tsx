import React, { useEffect, useRef, useState } from "react";
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
import { useTheme } from "../useTheme";
import { radius, space, size, spacing } from "../primitives/scale";
import { duration } from "../motion";
import { relativeLuminance } from "../utils/contrast";
import { Text } from "./Text";

const { height: SCREEN_H } = Dimensions.get("window");
/** Decorative drag affordance shown on headerless sheets. */
const GRAB_HANDLE = { w: 40, h: 5 } as const;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional header title (left), floats above the card on the backdrop. */
  title?: string;
  /** Optional header actions (right) — typically one or two <IconButton>s. */
  right?: React.ReactNode;
  /** Override the sheet surface color (e.g. an accent for a themed guide). */
  color?: string;
  /** Fires once the sheet has FULLY animated out and unmounted. Use this to run
   *  navigation after a close — the sheet is a native Modal, so navigating while
   *  it is still visible leaves it on top of (or lingering over) the new screen. */
  onDismissed?: () => void;
  contentStyle?: ViewStyle;
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
  onDismissed,
  contentStyle,
}) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = !!(title || right);

  // Keep the latest callback in a ref so the exit-animation effect never needs it
  // in its deps (an inline closure would otherwise re-run the animation each render).
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  // The grab handle must read on whatever surface the sheet uses: a bright
  // accent fill needs a dark handle, the default dark card a light one.
  const surface = color ?? colors.surface.elevated;
  const handleColor =
    relativeLuminance(surface) > 0.18 ? colors.text.onInverse : colors.border.strong;

  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: duration.fast,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.sheetIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: duration.fast,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: duration.sheetOut,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onDismissedRef.current?.();
        }
      });
    }
  }, [visible, backdrop, translateY]);

  if (!mounted) return null;

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
              {title ? <Text variant="h2">{title}</Text> : <View />}
              {right ? <View style={styles.actions}>{right}</View> : null}
            </View>
          ) : null}

          <View
            style={[
              {
                backgroundColor: color ?? colors.surface.elevated,
                borderTopLeftRadius: radius.pill,
                borderTopRightRadius: radius.pill,
                paddingHorizontal: space.screenX,
                paddingTop: hasHeader ? space.screenX : spacing.md,
                paddingBottom: Math.max(insets.bottom + spacing.lg, spacing["3xl"]),
                maxHeight: SCREEN_H * 0.85,
              },
              elevation.e3,
              contentStyle,
            ]}
          >
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
          </View>
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
