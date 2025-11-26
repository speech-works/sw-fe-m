import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, { SvgProps, Rect, G, Circle } from "react-native-svg";

const BgPattern_SoundRipples = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";
  const bgColor = "#F0F4F8";
  const rippleColor = "#4FD1C5";

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
      <G opacity="0.3">
        <Circle cx="-50" cy="200" r="300" fill={rippleColor} opacity="0.2" />
        <Circle cx="450" cy="600" r="250" fill={rippleColor} opacity="0.15" />
        <Circle cx="100" cy="900" r="400" fill={rippleColor} opacity="0.1" />
        <Circle cx="300" cy="-100" r="200" fill={rippleColor} opacity="0.25" />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_SoundRipples;
