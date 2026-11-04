import React from "react";
import { DimensionValue, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../useTheme";
import { Gradient } from "./Gradient";

/**
 * The layers overlap from the bottom edge, so the blur builds up on the way
 * down. Each step is too small to see as an edge. Tops are shares of the box.
 * Kept light on purpose: the founder chose the version where the text behind
 * the buttons stays partly readable over twice and three times this strength
 * (2026-11-03).
 */
const LAYERS: { height: DimensionValue; intensity: number }[] = [
  { height: "100%", intensity: 1 },
  { height: "90%", intensity: 1.5 },
  { height: "80%", intensity: 2 },
  { height: "70%", intensity: 3 },
  { height: "60%", intensity: 4 },
  { height: "50%", intensity: 6 },
  { height: "40%", intensity: 8 },
];

/** Frosted glass that melts in from nothing. Fills its parent, bottom aligned. */
export const ProgressiveBlur: React.FC = () => {
  const { scheme } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LAYERS.map(({ height, intensity }) => (
        <BlurView
          key={intensity}
          intensity={intensity}
          tint={scheme === "dark" ? "dark" : "light"}
          style={[styles.layer, { height }]}
        />
      ))}
      <Gradient token="canvasFade" style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
