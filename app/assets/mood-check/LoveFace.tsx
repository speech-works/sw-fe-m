import * as React from "react";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  SvgProps,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const LoveFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
        <Filter
          id="love_shadow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity={0} result="BackgroundImageFix" />
          <FeColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <FeOffset dx={4} dy={4} />
          <FeGaussianBlur stdDeviation={1} />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <FeBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <FeBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </Filter>
        <Mask
          id="love_mask"
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
      <G mask="url(#love_mask)">
        {/* Background - Hot Pink */}
        <Path
          fill="#E91E63"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#love_shadow)">
          {/* Face Shape - Light Pink */}
          <Path
            fill="#F8BBD0"
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
        {/* Pupils (Heart Shapes) */}
        <Path
          fill="#C2185B"
          d="M16.8 22 C 14 20, 12 22, 12 24 C 12 27, 16.8 30, 16.8 30 C 16.8 30, 21.6 27, 21.6 24 C 21.6 22, 19.6 20, 16.8 22 Z"
        />
        <Path
          fill="#C2185B"
          d="M31.2 22 C 28.4 20, 26.4 22, 26.4 24 C 26.4 27, 31.2 30, 31.2 30 C 31.2 30, 36 27, 36 24 C 36 22, 34 20, 31.2 22 Z"
        />
        {/* Happy Mouth */}
        <Path
          stroke="#C2185B"
          strokeWidth="3"
          strokeLinecap="round"
          d="M18 34 Q 24 38, 30 34"
        />
        {/* Blush marks */}
        <Path fill="#F48FB1" d="M8 28 a 3 2 0 1 0 6 0 a 3 2 0 1 0 -6 0" />
        <Path fill="#F48FB1" d="M34 28 a 3 2 0 1 0 6 0 a 3 2 0 1 0 -6 0" />
      </G>
    </Svg>
  );
};

export default LoveFace;
