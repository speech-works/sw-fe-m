import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { REACTIONS } from "../../constants/reactions";
import { ReactionType } from "../../api/threads/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
  anchorY?: number; // Screen Y coordinate of the button
}

const ReactionPicker = ({ visible, onSelect, onDismiss, anchorY = SCREEN_HEIGHT / 2 }: ReactionPickerProps) => {
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
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  top: Math.max(50, anchorY - 70), // Appear above the button
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
                    <Text style={styles.emoji}>{r.emoji}</Text>
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
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
  },
  container: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 35,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    alignItems: "center",
  },
  emojiContainer: {
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 32,
  },
});

export default ReactionPicker;
