import * as React from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  SvgProps,
  Circle } from "react-native-svg";

const ExposureFace = ({
  size = 48,
  shouldAnimate, loop, repeatCount, ...props
}: SvgProps & { size?: number | string; shouldAnimate?: boolean; loop?: boolean; repeatCount?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Mask
        id="hero_mask"
        x="0"
        y="0"
        width="48"
        height="48"
        maskUnits="userSpaceOnUse"
      >
        <Path
          fill="#fff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
      </Mask>
    </Defs>
    <G mask="url(#hero_mask)">
      {/* Background: Red 200 */}
      <Path
        fill="#FFBFBF"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G>
        {/* Face: Orange 200 */}
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>

      {/* Superhero Eye Mask (Red 600) */}
      <Path
        fill="#BF0000"
        d="M4 24 C 4 18, 14 18, 24 24 C 34 18, 44 18, 44 24 L 42 30 C 38 34, 30 30, 24 30 C 18 30, 10 34, 6 30 Z"
      />

      {/* Eyes (White Sclera inside mask) */}
      <Circle cx="16.8" cy="25" r="2.5" fill="#FFF" />
      <Circle cx="31.2" cy="25" r="2.5" fill="#FFF" />
      {/* Pupils (Black) */}
      <Circle cx="16.8" cy="25" r="1.5" fill="#111215" />
      <Circle cx="31.2" cy="25" r="1.5" fill="#111215" />

      {/* Confident Grin (Gray 800) */}
      <Path
        stroke="#111215"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M20 36 Q 26 38, 30 35"
        fill="none"
      />
    </G>
  </Svg>
);
export default ExposureFace;
