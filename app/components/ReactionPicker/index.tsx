import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { REACTIONS } from "../../constants/reactions";
import { ReactionType } from "../../api/threads/types";
import {
  useTheme,
  radius,
  fonts,
  space,
  Text,
  staggerEntering,
  duration,
  easing,
  spring,
} from "../../design-system";
import { AnimatedReaction } from "../AnimatedReactions";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
  anchorY?: number; // Screen Y coordinate of the button
}

const ReactionPicker = ({ visible, onSelect, onDismiss, anchorY = SCREEN_HEIGHT / 2 }: ReactionPickerProps) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // Keep the Modal mounted through the close animation, then unmount.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0); // 0 = hidden, 1 = shown

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Warm overshoot pop on open; opacity-only fade under reduced motion.
      progress.value = reduced
        ? withTiming(1, { duration: duration.base })
        : withSpring(1, spring.bouncy);
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: duration.sheetOut, easing: easing.in },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
  }, [visible, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: reduced ? 1 : interpolate(progress.value, [0, 1], [0.85, 1]) },
      { translateY: reduced ? 0 : interpolate(progress.value, [0, 1], [16, 0]) },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay.scrim }, scrimStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: colors.surface.elevated,
                  shadowColor: colors.shadow,
                  top: Math.max(50, anchorY - 85), // Appear above the button, adjusted for taller pill
                },
                containerStyle,
              ]}
            >
              {REACTIONS.map((r, i) => (
                <Animated.View
                  key={r.type}
                  entering={staggerEntering(i, reduced)}
                  style={styles.emojiContainer}
                  onTouchStart={() => {
                    onSelect(r.type);
                    onDismiss();
                  }}
                >
                  <View style={styles.emojiInner}>
                    <AnimatedReaction type={r.type} selected={false} isPicker={true} size={54} />
                    <Text variant="caption" color="secondary" style={styles.reactionLabel}>{r.label}</Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
  },
  container: {
    position: "absolute",
    borderRadius: radius.card,
    flexDirection: "row",
    paddingHorizontal: space.inlineGap,
    paddingVertical: space.rowGap,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
    alignItems: "center",
  },
  emojiContainer: {
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiInner: {
    alignItems: "center",
  },
  reactionLabel: {
    fontFamily: fonts.bold,
    marginTop: 6,
    textAlign: "center",
  },
});

export default ReactionPicker;
