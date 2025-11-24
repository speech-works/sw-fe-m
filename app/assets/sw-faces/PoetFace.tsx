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
  Path as SvgPath,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const PoetFace = ({ size = 48, ...props }: SvgIconProps) => {
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
        <Filter
          id="narrator_shadow"
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
          id="narrator_mask"
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

      <G mask="url(#narrator_mask)">
        {/* Background - Sunny Yellow */}
        <Path
          fill="#c49ccdff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Light Tan */}
        <G filter="url(#narrator_shadow)">
          <Path
            fill="#edcfbbff" /* Light Tan */
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* Cartoonish Side Hair (Spiky Brown) */}
        <G fill="#795548">
          <Path d="M4 18 C 4 11, 7 8, 10 8 C 13 9, 12 17, 9 28 Z" />
          <Path d="M44 18 C 44 11, 41 8, 38 8 C 35 9, 36 17, 39 28 Z" />
        </G>
        {/* Thick Reading Glasses (Cartoon style) - Thick Green frames */}
        <G
          stroke="#4CAF50"
          strokeWidth="4"
          fill="#B0BEC5"
          strokeLinecap="round"
        >
          <Circle cx="16.8" cy="24" r="8" />
          <Circle cx="31.2" cy="24" r="8" />
          <Path d="M24.8 24 L 23.2 24" />
          <Path d="M10 24 L 7 24" />
          <Path d="M38 24 L 41 24" />
        </G>
        {/* Lenses fill (lighter blue tint) */}
        <Circle cx="16.8" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />
        <Circle cx="31.2" cy="24" r="6" fill="#E0F2F7" opacity="0.8" />
        {/* Eyes (Wide-eyed excitement) */}
        <Circle cx="16.8" cy="23" r="3" fill="#212121" />
        <Circle cx="31.2" cy="23" r="3" fill="#212121" />
        <Circle cx="17.5" cy="22" r="0.8" fill="#FFF" opacity="1" />
        <Circle cx="31.9" cy="22" r="0.8" fill="#FFF" opacity="1" />

        {/* --- MOUTH: Quiet Satisfaction (Content/Serene) --- */}
        <G transform="translate(0, -3)">
          <SvgPath
            d="M21 37 Q 24 38, 27 37"
            stroke="#212121"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </G>
    </Svg>
  );
};
export default PoetFace;
