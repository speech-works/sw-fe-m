import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  View,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { REACTIONS } from "../../constants/reactions";
import { ReactionType } from "../../api/threads/types";
import { useTheme, radius, fonts, Text } from "../../design-system";
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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const emojiAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

  // Open / Close animation
  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }).start();

      Animated.stagger(
        40,
        emojiAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 150,
          })
        )
      ).start();
    } else {
      scaleAnim.setValue(0);
      emojiAnims.forEach((anim) => anim.setValue(0));
    }
  }, [visible, scaleAnim, emojiAnims]);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay.scrim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow },
                {
                  top: Math.max(50, anchorY - 85), // Appear above the button, adjusted for taller pill
                  transform: [
                    { scale: scaleAnim },
                    { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                  ],
                },
              ]}
            >
              {REACTIONS.map((r, i) => (
                <View
                  key={r.type}
                  style={styles.emojiContainer}
                  onTouchStart={() => {
                    onSelect(r.type);
                    onDismiss();
                  }}
                >
                  <Animated.View
                    style={{
                      alignItems: "center",
                      transform: [
                        { scale: emojiAnims[i] },
                        {
                          translateY: emojiAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [15, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <AnimatedReaction type={r.type} selected={false} isPicker={true} size={54} />
                    <Text variant="caption" color="secondary" style={styles.reactionLabel}>{r.label}</Text>
                  </Animated.View>
                </View>
              ))}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
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
  reactionLabel: {
    fontFamily: fonts.bold,
    marginTop: 6,
    textAlign: "center",
  },
});

export default ReactionPicker;
