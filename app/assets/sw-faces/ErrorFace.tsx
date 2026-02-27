import React from "react";
import Svg, { Circle, Defs, G, Mask, Path, SvgProps } from "react-native-svg";
interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const ErrorFace = ({
  size = 48,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = size;
  const activeHeight = size;

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
          id="static_mask"
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

      <G mask="url(#static_mask)">
        {/* Background - Cool, purple-grey */}
        <Path
          fill="#B0BEC5"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Face Shape - Pale, cool skin tone */}
        <G>
          <Path
            fill="#ECEFF1"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Slightly uneven/glitched) */}
        <Circle cx="16" cy="22" r="2.5" fill="#455A64" />
        <Circle cx="32" cy="21" r="2.5" fill="#455A64" />

        {/* Mouth - Jagged Static Line */}
        <Path
          d="M 14 34 L 16 32 L 18 35 L 21 31 L 24 36 L 27 31 L 30 35 L 32 32 L 34 34"
          stroke="#455A64"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};
export default React.memo(ErrorFace);
