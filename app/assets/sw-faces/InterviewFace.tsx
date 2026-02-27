import React from "react";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
const InterviewFace = ({
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
      <Mask
        id="senior_mask"
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
    <G mask="url(#senior_mask)">
      {/* Background: Professional Light Blue (Calm & Trustworthy) */}
      <Path
        fill="#E3F2FD"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />

      <G>
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>

      <Path d="M8 42 L 24 44 L 24 38 Z" fill="#FFFFFF" />
      <Path d="M40 42 L 24 44 L 24 38 Z" fill="#FFFFFF" />

      {/* Necktie (Distinguished Burgundy) */}
      <Path d="M24 38 L 28 41 L 27 48 L 21 48 L 20 41 Z" fill="#880E4F" />

      {/* Glasses (Grey Rims) */}
      <Circle
        cx="16.8"
        cy="24"
        r="5.5"
        stroke="#757575"
        strokeWidth="1.5"
        fill="#FFDABF"
        fillOpacity="0.5"
      />
      <Circle
        cx="31.2"
        cy="24"
        r="5.5"
        stroke="#757575"
        strokeWidth="1.5"
        fill="#FFDABF"
        fillOpacity="0.5"
      />
      <Path d="M22.3 24 L 25.7 24" stroke="#757575" strokeWidth="1.5" />

      {/* Wrinkles/Experience lines */}
      <Path
        d="M13 26 Q 11 27, 13 28"
        stroke="#D7CCC8"
        strokeWidth="1"
        fill="none"
      />
      <Path
        d="M35 26 Q 37 27, 35 28"
        stroke="#D7CCC8"
        strokeWidth="1"
        fill="none"
      />

      {/* Eyes */}
      <Circle cx="16.8" cy="24" r="1.5" fill="#263238" />
      <Circle cx="31.2" cy="24" r="1.5" fill="#263238" />

      {/* Mouth */}
      <Path
        stroke="#8D6E63"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M20 34 Q 24 35, 28 34"
        fill="none"
      />
    </G>
  </Svg>
);

export default React.memo(InterviewFace);
