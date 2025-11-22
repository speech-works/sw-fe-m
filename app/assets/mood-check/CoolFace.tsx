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

const CoolFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="cool_shadow"
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
          id="cool_mask"
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
      <G mask="url(#cool_mask)">
        {/* Background - Fresh Mint/Cyan */}
        <Path
          fill="#26C6DA"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#cool_shadow)">
          {/* Face Shape - Very light cyan */}
          <Path
            fill="#E0F7FA"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Sunglasses */}
        <Path
          fill="#37474F"
          d="M8 20 C 8 20, 10 28, 17 28 C 22 28, 22 20, 22 20 L 8 20 Z"
        />
        <Path
          fill="#37474F"
          d="M26 20 C 26 20, 28 28, 35 28 C 40 28, 40 20, 40 20 L 26 20 Z"
        />
        <Path stroke="#37474F" strokeWidth="2" d="M22 22 L 26 22" />

        {/* Reflection on glasses */}
        <Path fill="#546E7A" d="M10 21 L 15 21 L 10 25 Z" opacity="0.5" />
        <Path fill="#546E7A" d="M28 21 L 33 21 L 28 25 Z" opacity="0.5" />

        {/* Confident Smirk */}
        <Path
          stroke="#37474F"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M20 34 Q 26 36, 30 33"
          fill="none"
        />
      </G>
    </Svg>
  );
};

export default CoolFace;
