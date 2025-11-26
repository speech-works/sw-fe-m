import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, { SvgProps, Rect, G, Circle } from "react-native-svg";

const BgPattern_DriftingPieces = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";

  // --- THEMED COLORS ---
  // Based on image_4.png background
  const bgColor = "#FDF6EC"; // Warm off-white/cream background
  // Based on the darker brown progress bar/button elements
  const shapeColor = "#8D6E63"; // Muted warm brown
  // ---------------------

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      style={[styles.autoBackground, style]}
      {...props}
    >
      <Rect width="375" height="812" fill={bgColor} />
      {/* Reduced opacity for a subtle, background feel */}
      <G fill={shapeColor} opacity="0.15">
        {/* Scattered shapes with different rotations and sizes */}
        <Rect
          x="60"
          y="180"
          width="50"
          height="50"
          rx="12"
          transform="rotate(15 85 205)"
          opacity="0.6"
        />
        <Circle cx="200" cy="120" r="20" opacity="0.4" />
        <Rect
          x="280"
          y="250"
          width="60"
          height="40"
          rx="10"
          transform="rotate(-10 310 270)"
          opacity="0.5"
        />

        <Circle cx="80" cy="450" r="30" opacity="0.3" />
        <Rect
          x="180"
          y="500"
          width="40"
          height="40"
          rx="8"
          transform="rotate(30 200 520)"
          opacity="0.4"
        />

        <Rect
          x="260"
          y="600"
          width="70"
          height="50"
          rx="15"
          transform="rotate(-5 295 625)"
          opacity="0.6"
        />
        <Circle cx="120" cy="700" r="25" opacity="0.5" />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_DriftingPieces;
