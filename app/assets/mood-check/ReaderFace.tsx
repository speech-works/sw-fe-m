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

const ReaderFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="reader_shadow"
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
          id="reader_mask"
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
      <G mask="url(#reader_mask)">
        {/* Background - Study Green */}
        <Path
          fill="#66BB6A"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        <G filter="url(#reader_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Looking down at script) */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Circle cx="16.8" cy="26" r="2.5" fill="#BF360C" />
        <Circle cx="31.2" cy="26" r="2.5" fill="#BF360C" />

        {/* Thick Reading Glasses (Added) */}
        <G stroke="#1B5E20" strokeWidth="4" fill="none" strokeLinecap="round">
          {/* Left Frame */}
          <Circle cx="16.8" cy="24" r="8" />
          {/* Right Frame */}
          <Circle cx="31.2" cy="24" r="8" />
          {/* Bridge */}
          <Path d="M24.8 24 L 23.2 24" />
          {/* Arms connecting to the side of head */}
          <Path d="M8.8 24 L 4 24" />
          <Path d="M39.2 24 L 44 24" />
        </G>

        {/* Script/Paper Prop */}
        <Path fill="#FFF" d="M14 36 L 34 36 L 32 48 L 16 48 Z" />
        {/* Text Lines on paper */}
        <Path
          stroke="#1B5E20"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M18 40 L 30 40"
        />
        <Path
          stroke="#1B5E20"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M18 44 L 28 44"
        />

        {/* Hand holding paper (Thumb) */}
        <Circle cx="32" cy="42" r="3" fill="#FFAB91" />
      </G>
    </Svg>
  );
};
export default ReaderFace;
