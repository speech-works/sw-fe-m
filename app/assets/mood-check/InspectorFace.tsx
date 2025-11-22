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

const InspectorFace = ({
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
          id="inspector_shadow"
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
          id="inspector_mask"
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
      <G mask="url(#inspector_mask)">
        {/* Background - Serious Grey/Blue */}
        <Path
          fill="#607D8B"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#inspector_shadow)">
          {/* Face Shape */}
          <Path
            fill="#CFD8DC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Left Eye (Normal size) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Circle cx="16.8" cy="24" r="3" fill="#37474F" />

        {/* Magnifying Glass Handle */}
        <Path
          stroke="#37474F"
          strokeWidth="3"
          strokeLinecap="round"
          d="M36 36 L 42 42"
        />

        {/* Magnifying Glass Lens Rim */}
        <Circle
          cx="30"
          cy="24"
          r="11"
          stroke="#37474F"
          strokeWidth="2"
          fill="#E0F7FA"
          opacity="0.8"
        />

        {/* Right Eye (MAGNIFIED inside the lens) */}
        <Path fill="#fff" d="M30 34 a 10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
        <Circle cx="30" cy="24" r="4.5" fill="#37474F" />

        {/* Scrutinizing Mouth */}
        <Path
          stroke="#37474F"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M18 36 Q 22 38, 26 36"
        />
      </G>
    </Svg>
  );
};

export default InspectorFace;
