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
  Circle,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const PilotFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="pilot_shadow"
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
          id="pilot_mask"
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
      <G mask="url(#pilot_mask)">
        {/* Background - Vivid Aviation Blue */}
        <Path
          fill="#0288D1"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        <G filter="url(#pilot_shadow)">
          {/* Face Color - Natural Skin Tone */}
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Aviator Goggles - Vintage Style */}
        <G transform="translate(0, -6)">
          {/* Leather Strap (Dark Brown) */}
          <Path
            fill="#4E342E"
            d="M8 14 C 8 14, 14 10, 24 12 C 34 10, 40 14, 40 14"
            stroke="#3E2723"
            strokeWidth="4"
          />

          {/* Lenses (Dark Grey Tint) with Silver Rims */}
          <Circle
            cx="16"
            cy="14"
            r="6"
            fill="#37474F"
            stroke="#CFD8DC"
            strokeWidth="2"
          />
          <Circle
            cx="32"
            cy="14"
            r="6"
            fill="#37474F"
            stroke="#CFD8DC"
            strokeWidth="2"
          />

          {/* Bridge (Silver) */}
          <Path stroke="#CFD8DC" strokeWidth="2" d="M22 14 L 26 14" />

          {/* Glint on goggles (White Reflection) */}
          <Path
            stroke="#FFF"
            strokeWidth="2"
            d="M14 12 L 16 12"
            opacity="0.4"
          />
          <Path
            stroke="#FFF"
            strokeWidth="2"
            d="M30 12 L 32 12"
            opacity="0.4"
          />
        </G>

        {/* Eyes (Sclera) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        {/* Pupils (Matching Leather Dark Brown) */}
        <Circle cx="16.8" cy="24" r="2.5" fill="#3E2723" />
        <Circle cx="31.2" cy="24" r="2.5" fill="#3E2723" />

        {/* Confident Smile (Matching Leather Dark Brown) */}
        <Path
          stroke="#3E2723"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M20 34 Q 24 36, 28 34"
          fill="none"
        />
      </G>
    </Svg>
  );
};
export default PilotFace;
