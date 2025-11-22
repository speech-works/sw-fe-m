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

const WarriorFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="determined_shadow"
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
          id="determined_mask"
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
      <G mask="url(#determined_mask)">
        {/* Background - Energetic Orange/Red */}
        <Path
          fill="#FF7043"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#determined_shadow)">
          {/* Face Shape */}
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Headband (Red) */}
        <Path fill="#D32F2F" d="M5 14 L 44 14 L 44 20 L 5 20 Z" />
        {/* Headband Knot/Ties */}
        <Path stroke="#D32F2F" strokeWidth="3" fill="none" d="M42 16 L 46 12" />
        <Path stroke="#D32F2F" strokeWidth="3" fill="none" d="M42 18 L 46 22" />

        {/* Eyes (White) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />

        {/* Pupils (Focused Center) */}
        <Path
          fill="#3E2723"
          d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
        />

        {/* Determined Eyebrows (Angled Down) */}
        <Path
          stroke="#3E2723"
          strokeWidth="3"
          strokeLinecap="round"
          d="M12 13 L 20 16"
        />
        <Path
          stroke="#3E2723"
          strokeWidth="3"
          strokeLinecap="round"
          d="M36 13 L 28 16"
        />

        {/* Serious Mouth */}
        <Path
          stroke="#3E2723"
          strokeWidth="3"
          strokeLinecap="round"
          d="M20 34 L 28 34"
        />
      </G>
    </Svg>
  );
};

export default WarriorFace;
