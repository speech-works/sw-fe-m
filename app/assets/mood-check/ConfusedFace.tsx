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

const ConfusedFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="confused_shadow"
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
          id="confused_mask"
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
      <G mask="url(#confused_mask)">
        {/* Background - Dusty Purple */}
        <Path
          fill="#9575CD"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#confused_shadow)">
          {/* Face Shape - Pale Purple */}
          <Path
            fill="#EDE7F6"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Left Eye (Normal) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Circle cx="16.8" cy="24" r="3" fill="#4527A0" />

        {/* Right Eye (Squinting/Small) */}
        <Path fill="#fff" d="M31.2 29 a 5 5 0 1 0 0-10 5 5 0 0 0 0 10" />
        <Circle cx="31.2" cy="24" r="2" fill="#4527A0" />

        {/* Crooked Mouth */}
        <Path
          stroke="#4527A0"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M18 36 L 24 34 L 30 36"
        />

        {/* Question Mark */}
        <Path
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          d="M38 12 C 38 12, 42 12, 42 16 C 42 18, 38 18, 38 22"
          fill="none"
        />
        <Circle cx="38" cy="26" r="1.5" fill="#fff" />
      </G>
    </Svg>
  );
};

export default ConfusedFace;
