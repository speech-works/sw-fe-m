import * as React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  SvgProps,
  Rect,
  G,
  Path,
  Text as SvgText,
} from "react-native-svg";

const BgPattern_404 = ({ style, ...props }: SvgProps) => {
  const viewBox = "0 0 375 812";

  // Updated colors to an orange theme
  const bgColor = "#fff"; // Light orange background
  const blockColor1 = "#455A64"; // Medium orangeish
  const blockColor2 = "#455A64"; // Deep orange
  const textColor = "#455A64"; // Dark orange for text contrast

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
      {/* Background color fill */}
      <Rect width="375" height="812" fill={bgColor} />

      {/* Background pattern blocks with new orange theme colors */}
      <G opacity="0.2" transform="rotate(-10 187.5 406)">
        <Rect x="50" y="600" width="80" height="120" fill={blockColor1} />
        <Rect x="130" y="550" width="60" height="80" fill={blockColor2} />
        <Rect x="190" y="500" width="100" height="100" fill={blockColor1} />
        <Rect x="250" y="420" width="70" height="90" fill={blockColor2} />
        <Path d="M50 500 L130 450 L190 500 L130 550 Z" fill={blockColor2} />
      </G>

      {/* Bold 404 Text centered on the screen */}
      <SvgText
        x="187.5" // Center X (375 / 2)
        y="406" // Center Y (812 / 2)
        fill={textColor}
        fontSize="140"
        fontWeight="900" // Extra bold
        textAnchor="middle" // Centers text horizontally around x
        alignmentBaseline="middle" // Centers text vertically around y
        opacity={0.1}
      >
        404
      </SvgText>
    </Svg>
  );
};

const styles = StyleSheet.create({
  // This style ensures the SVG sits behind all other content and fills its parent
  autoBackground: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

export default BgPattern_404;
