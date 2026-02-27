import React from "react";
import Svg, { Defs, G, Mask, Path, SvgProps } from "react-native-svg";
interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const CuriousFace = ({
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
          id="curious_mask"
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
      <G mask="url(#curious_mask)">
        {/* Background - Teal */}
        <Path
          fill="#80CBC4"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G>
          {/* Face Shape - Light Teal/Grey */}
          <Path
            fill="#E0F2F1"
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
        {/* Pupils (Dark) - Moved up and right for thinking look */}
        <Path
          fill="#4A4A4A"
          d="M20 26 a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M34.4 26 a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
        />
        {/* Pursed Mouth "Hmm" */}
        <Path
          fill="#4A4A4A"
          d="M24 34 m-3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0"
        />
        {/* Curious Eyebrows (one high, one low) */}
        <Path
          stroke="#4A4A4A"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M12 16 Q 16.8 16, 21.6 16"
        />
        <Path
          stroke="#4A4A4A"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M26.4 12 Q 31.2 8, 36 12"
        />
      </G>
    </Svg>
  );
};

export default React.memo(CuriousFace);
