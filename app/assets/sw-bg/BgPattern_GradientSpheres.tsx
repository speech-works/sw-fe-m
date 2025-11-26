import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  SvgProps,
  Rect,
  G,
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";

const BgPattern_GradientSpheres = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";
  const bgColor = "#F0F8FF";

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
      <Defs>
        <RadialGradient id="sphere-grad" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#E6F7FF" />
          <Stop offset="100%" stopColor="#B3E5FC" />
        </RadialGradient>
      </Defs>
      <G opacity="0.6">
        <Circle
          cx="100"
          cy="200"
          r="80"
          fill="url(#sphere-grad)"
          opacity="0.8"
        />
        <Circle
          cx="300"
          cy="500"
          r="100"
          fill="url(#sphere-grad)"
          opacity="0.6"
        />
        <Circle
          cx="-20"
          cy="700"
          r="120"
          fill="url(#sphere-grad)"
          opacity="0.5"
        />
      </G>
    </Svg>
  );
};

const styles = StyleSheet.create({
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_GradientSpheres;
