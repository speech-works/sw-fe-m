import * as React from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  SvgProps,
  Circle } from "react-native-svg";

const KeyholeFace = ({
  size = 48,
  shouldAnimate, loop, repeatCount, ...props
}: SvgProps & { size?: number | string; shouldAnimate?: boolean; loop?: boolean; repeatCount?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Mask id="m">
        <Path
          fill="#fff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
      </Mask>
    </Defs>
    <G mask="url(#m)">
      <Path
        fill="#212121"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G>
        <Path
          fill="#424242"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>
      <Circle cx="24" cy="24" r="4" fill="#FDD835" />
      <Path d="M22 26 L 20 34 H 28 L 26 26" fill="#FDD835" />
    </G>
  </Svg>
);
export default KeyholeFace;
