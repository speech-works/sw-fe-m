import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, { Path, SvgProps, Rect } from "react-native-svg";

const BgPattern_OrganicWaves = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";
  const colorPalette = {
    bg: "#E0F2F1",
    wave1: "#B2DFDB",
    wave2: "#80CBC4",
    wave3: "#4DB6AC",
  };

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
      <Rect width="375" height="812" fill={colorPalette.bg} />
      <Path
        fill={colorPalette.wave1}
        d="M0,400 C120,350 240,450 375,400 L375,812 L0,812 Z"
      />
      <Path
        fill={colorPalette.wave2}
        d="M0,550 C150,500 220,650 375,600 L375,812 L0,812 Z"
      />
      <Path
        fill={colorPalette.wave3}
        d="M0,700 C100,650 280,750 375,700 L375,812 L0,812 Z"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_OrganicWaves;
