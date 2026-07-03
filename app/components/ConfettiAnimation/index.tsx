import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
  delay: number;
  initialX: number; // Store initial X position for sway calculation
}

const COLORS = [
  "#EF4444", // Vibrant Red
  "#F97316", // Bright Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
];

/**
 * A one-shot celebration burst: 50 pieces fall past the bottom once, swaying and
 * spinning a FINITE number of times, then the whole layer unmounts. It must be
 * rendered as a viewport overlay (a sibling of the scroll, never a scroll child) —
 * otherwise the absolute layer scrolls with the content and the settled pieces
 * reappear mid-page. The earlier version looped sway/rotate forever, so pieces
 * parked one screen down and span in place indefinitely.
 */
const ConfettiAnimation = () => {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const [done, setDone] = useState(false);

  // Generate confetti pieces
  if (confettiPieces.current.length === 0) {
    confettiPieces.current = Array.from({ length: 50 }, (_, i) => {
      const startX = Math.random() * width;
      return {
        id: i,
        x: new Animated.Value(startX),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4, // 4-12px
        delay: Math.random() * 800, // 0-800ms stagger
        initialX: startX, // Store for sway calculation
      };
    });
  }

  useEffect(() => {
    const animations = confettiPieces.current.map((piece) => {
      const fallDuration = 2600 + Math.random() * 1400; // 2.6-4s
      const swayAmount = (Math.random() - 0.5) * 100; // -50 to 50
      const swayLeg = fallDuration / 4;

      return Animated.parallel([
        // Fall down and off-screen — one shot.
        Animated.timing(piece.y, {
          toValue: height + 50,
          duration: fallDuration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
        // Sway: a FINITE two out-and-back cycles spanning the fall (no infinite loop).
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(piece.x, { toValue: piece.initialX + swayAmount, duration: swayLeg, useNativeDriver: true }),
          Animated.timing(piece.x, { toValue: piece.initialX, duration: swayLeg, useNativeDriver: true }),
          Animated.timing(piece.x, { toValue: piece.initialX + swayAmount, duration: swayLeg, useNativeDriver: true }),
          Animated.timing(piece.x, { toValue: piece.initialX, duration: swayLeg, useNativeDriver: true }),
        ]),
        // Rotate: two full spins over the fall, then stop.
        Animated.timing(piece.rotate, {
          toValue: 720,
          duration: fallDuration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
      ]);
    });

    const burst = Animated.parallel(animations);
    burst.start(({ finished }) => {
      // Everything has landed off-screen — tear the layer down so nothing lingers.
      if (finished) setDone(true);
    });
    return () => burst.stop();
  }, []);

  if (done) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece) => {
        const rotateInterpolate = piece.rotate.interpolate({
          inputRange: [0, 720],
          outputRange: ["0deg", "720deg"],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.confetti,
              {
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size * 1.5,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

export default ConfettiAnimation;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  confetti: {
    position: "absolute",
    borderRadius: 2,
  },
});
