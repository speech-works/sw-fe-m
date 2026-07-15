import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { REACTIONS } from "../../constants/reactions";
import { ReactionType } from "../../api/threads/types";
import { useTheme, radius, fonts, space, Text, duration, easing, spring } from "../../design-system";
import { AnimatedReaction } from "../AnimatedReactions";
import { useRegisterNativeModal } from "../../stores/nativeModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Emoji stagger expressed in PROGRESS space (0..1), not via Reanimated `entering`
// layout animations — those are unreliable inside a native <Modal> on Android, so
// every emoji instead derives its reveal from the shared `progress` on the UI thread.
const EMOJI_STAGGER = 0.06; // phase offset per emoji
const EMOJI_RISE = 0.55; // fraction of progress over which each emoji reveals

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
  anchorY?: number; // Screen Y coordinate of the button
}

interface ReactionEmojiProps {
  reaction: (typeof REACTIONS)[number];
  index: number;
  progress: SharedValue<number>;
  reduced: boolean;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
}

/** A single staggered emoji, revealed off the shared `progress` (no layout animation). */
const ReactionEmoji = ({ reaction, index, progress, reduced, onSelect, onDismiss }: ReactionEmojiProps) => {
  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [] };
    const start = index * EMOJI_STAGGER;
    const local = interpolate(progress.value, [start, start + EMOJI_RISE], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: local,
      transform: [
        { translateY: interpolate(local, [0, 1], [14, 0]) },
        { scale: interpolate(local, [0, 1], [0.5, 1]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.emojiContainer, style]}
      onTouchStart={() => {
        onSelect(reaction.type);
        onDismiss();
      }}
    >
      <View style={styles.emojiInner}>
        <AnimatedReaction type={reaction.type} selected={false} isPicker={true} size={54} />
        <Text variant="caption" color="secondary" style={styles.reactionLabel}>{reaction.label}</Text>
      </View>
    </Animated.View>
  );
};

const ReactionPicker = ({ visible, onSelect, onDismiss, anchorY = SCREEN_HEIGHT / 2 }: ReactionPickerProps) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // Keep the Modal mounted through the close animation, then unmount.
  const [mounted, setMounted] = useState(visible);
  useRegisterNativeModal(mounted);
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

  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value) }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value),
    transform: [
      { scale: reduced ? 1 : interpolate(progress.value, [0, 1], [0.85, 1]) },
      { translateY: reduced ? 0 : interpolate(progress.value, [0, 1], [16, 0]) },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
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
                <ReactionEmoji
                  key={r.type}
                  reaction={r}
                  index={i}
                  progress={progress}
                  reduced={reduced}
                  onSelect={onSelect}
                  onDismiss={onDismiss}
                />
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
