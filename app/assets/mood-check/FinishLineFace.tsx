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
  Rect,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const FinishLineCoolFace = ({
  size = 48,
  width,
  height,
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
        <Filter
          id="finish_cool_shadow"
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
          id="finish_cool_mask"
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
      <G mask="url(#finish_cool_mask)">
        {/* Background - Victory Gold/Yellow */}
        <Path
          fill="#FFC107"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        <G filter="url(#finish_cool_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* --- COOL SUNGLASSES --- */}
        {/* Lenses */}
        <Path
          fill="#263238"
          d="M8 22 C 8 22, 10 29, 17 29 C 22 29, 22 22, 22 22 L 8 22 Z"
        />
        <Path
          fill="#263238"
          d="M26 22 C 26 22, 28 29, 35 29 C 40 29, 40 22, 40 22 L 26 22 Z"
        />
        {/* Bridge */}
        <Path stroke="#263238" strokeWidth="2.5" d="M22 23 L 26 23" />

        {/* Reflections (To make them look shiny) */}
        <Path fill="#546E7A" opacity="0.5" d="M10 23 L 15 23 L 10 27 Z" />
        <Path fill="#546E7A" opacity="0.5" d="M28 23 L 33 23 L 28 27 Z" />

        {/* --- SMART SMIRK --- */}
        {/* Confident, asymmetric smile */}
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          d="M22 35 Q 26 37, 30 33"
        />

        {/* Checkered Tape Snapping (Broken in middle) */}
        {/* Left piece */}
        <G transform="rotate(10 12 40)">
          <Rect x="0" y="38" width="20" height="6" fill="#FFF" />
          <Rect x="0" y="38" width="5" height="3" fill="#000" />
          <Rect x="10" y="38" width="5" height="3" fill="#000" />
          <Rect x="5" y="41" width="5" height="3" fill="#000" />
          <Rect x="15" y="41" width="5" height="3" fill="#000" />
        </G>
        {/* Right piece */}
        <G transform="rotate(-10 36 40)">
          <Rect x="28" y="38" width="20" height="6" fill="#FFF" />
          <Rect x="28" y="38" width="5" height="3" fill="#000" />
          <Rect x="38" y="38" width="5" height="3" fill="#000" />
          <Rect x="33" y="41" width="5" height="3" fill="#000" />
          <Rect x="43" y="41" width="5" height="3" fill="#000" />
        </G>

        {/* Confetti bits */}
        <Rect
          x="10"
          y="10"
          width="3"
          height="3"
          fill="#FFF"
          transform="rotate(45 10 10)"
        />
        <Rect
          x="38"
          y="12"
          width="3"
          height="3"
          fill="#000"
          transform="rotate(20 38 12)"
        />
        <Circle cx="24" cy="8" r="1.5" fill="#FFF" />
      </G>
    </Svg>
  );
};

export default FinishLineCoolFace;
