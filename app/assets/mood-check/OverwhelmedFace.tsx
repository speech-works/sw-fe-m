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

const OverwhelmedFace = ({
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
          id="overwhelmed_shadow"
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
          id="overwhelmed_mask"
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
      <G mask="url(#overwhelmed_mask)">
        {/* Background - Intense Orange */}
        <Path
          fill="#FF7043"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#overwhelmed_shadow)">
          {/* Face Shape - Pale Orange/Peach */}
          <Path
            fill="#FFCCBC"
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
        {/* Pupils (X marks for dizzy/overwhelmed) */}
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M13.5 20.5 L 20.5 27.5 M20.5 20.5 L 13.5 27.5"
        />
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M27.5 20.5 L 34.5 27.5 M34.5 20.5 L 27.5 27.5"
        />

        {/* Distressed Wavy Mouth */}
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          d="M17 35 Q 19 33, 21 35 Q 23 37, 25 35 Q 27 33, 29 35"
        />
        {/* Sweat drop */}
        <Path
          fill="#42A5F5"
          d="M38 10 C 38 10, 35 15, 38 17 C 41 15, 40 10, 40 10 Z"
        />
      </G>
    </Svg>
  );
};

export default OverwhelmedFace;
