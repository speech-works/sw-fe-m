import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, { SvgProps, Rect, G, Ellipse } from "react-native-svg";

const BgPattern_EtherealFlow = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";

  // --- APP SCREENSHOT THEME COLORS ---
  // Based on the teal, light blue, and warm brown/beige palette from the images.
  const bgColor = "#F5F0E6"; // Light beige background from the app screens.
  const color1 = "#A7D7C5"; // Calming teal/mint from the popup background shapes.
  const color2 = "#8FD1D9"; // Soft, light blue-green, similar to the teal accents.
  const color3 = "#D9C5A7"; // Muted light brown/tan from buttons and text.
  // --------------------------------

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
      <G opacity="0.3" style={{ mixBlendMode: "multiply" }}>
        {/* Large, soft overlapping blobs indicating fluid thought and speech flow */}
        <Ellipse
          cx="50"
          cy="200"
          rx="180"
          ry="150"
          fill={color1}
          transform="rotate(20 50 200)"
        />
        <Ellipse
          cx="350"
          cy="500"
          rx="200"
          ry="220"
          fill={color2}
          transform="rotate(-15 350 500)"
        />
        <Ellipse
          cx="120"
          cy="750"
          rx="150"
          ry="120"
          fill={color3}
          opacity="0.8"
        />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_EtherealFlow;
