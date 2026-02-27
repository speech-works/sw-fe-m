import React from "react";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const TargetFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <Mask
          id="target_mask"
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
      <G mask="url(#target_mask)">
        {/* Background - Target Red */}
        <Path
          fill="#FFEBEE"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Target Rings */}
        <Circle
          cx="24"
          cy="24"
          r="24"
          stroke="#E53935"
          strokeWidth="8"
          fill="none"
          opacity="0.2"
        />

        <G>
          {/* Face Shape */}
          <Path
            fill="#FFCDD2"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (White) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        {/* Pupils (Bullseyes) */}
        <Circle cx="16.8" cy="24" r="3" fill="#B71C1C" />
        <Circle cx="16.8" cy="24" r="1" fill="#fff" />
        <Circle cx="31.2" cy="24" r="3" fill="#B71C1C" />
        <Circle cx="31.2" cy="24" r="1" fill="#fff" />

        {/* Determined Mouth */}
        <Path
          stroke="#B71C1C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M22 34 Q 24 32, 26 34"
        />

        {/* Arrow prop stuck in head (comically) */}
        <Path
          stroke="#B71C1C"
          strokeWidth="3"
          strokeLinecap="round"
          d="M36 10 L 42 4"
        />
        <Path fill="#B71C1C" d="M36 10 L 34 13 L 39 13 Z" />
      </G>
    </Svg>
  );
};

export default React.memo(TargetFace);
