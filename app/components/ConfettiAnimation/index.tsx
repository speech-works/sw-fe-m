import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

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

const ConfettiAnimation = () => {
  const confettiPieces = useRef<ConfettiPiece[]>([]);

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
        delay: Math.random() * 1000, // 0-1000ms delay
        initialX: startX, // Store for sway calculation
      };
    });
  }

  useEffect(() => {
    const animations = confettiPieces.current.map((piece) => {
      const fallDuration = 3000 + Math.random() * 2000; // 3-5 seconds
      const swayAmount = (Math.random() - 0.5) * 100; // -50 to 50

      return Animated.parallel([
        // Fall down
        Animated.timing(piece.y, {
          toValue: height + 50,
          duration: fallDuration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
        // Sway horizontally
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(piece.x, {
                toValue: piece.initialX + swayAmount,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(piece.x, {
                toValue: piece.initialX,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
        // Rotate
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.loop(
            Animated.timing(piece.rotate, {
              toValue: 360,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            })
          ),
        ]),
      ]);
    });

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece) => {
        const rotateInterpolate = piece.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
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
