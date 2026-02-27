import React from "react";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
const RobotoicPhoneFace = ({
  size = 48,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgProps & {
  size?: number | string;
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Mask id="mask_rotary">
        <Path
          fill="#fff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
      </Mask>
    </Defs>

    <G mask="url(#mask_rotary)">
      {/* Background: Wallpaper Pattern */}
      <Path
        fill="#F0E68C"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      {/* Face: Black Bakelite */}
      <G>
        <Path
          fill="#212121"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>
      {/* The Dial Mechanism */}
      <Circle
        cx="24"
        cy="26"
        r="10"
        fill="#424242"
        stroke="#E0E0E0"
        strokeWidth="1"
      />
      <Circle cx="24" cy="26" r="3" fill="#E0E0E0" />
      {/* Finger Holes (Eyes/Mouth area) */}
      <Circle cx="24" cy="18" r="1.5" fill="#FFFFFF" />
      <Circle cx="30" cy="20" r="1.5" fill="#FFFFFF" />
      <Circle cx="18" cy="20" r="1.5" fill="#FFFFFF" />
      <Circle cx="32" cy="26" r="1.5" fill="#FFFFFF" />
      <Circle cx="16" cy="26" r="1.5" fill="#FFFFFF" />
      {/* Coiled Cord */}
      <Path
        d="M12 40 Q 8 44, 12 48 M 12 42 Q 16 46, 12 50"
        stroke="#212121"
        strokeWidth="2"
        fill="none"
      />
    </G>
  </Svg>
);
export default React.memo(RobotoicPhoneFace);
