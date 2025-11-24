import * as React from "react-native";
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
  Line,
  Circle,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const GuidedBreathingFace = ({ size = 48, ...props }: SvgIconProps) => {
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
          id="release_shadow"
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
          id="release_mask"
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

      <G mask="url(#release_mask)">
        {/* Background - HIGH CONTRAST DARK GREY */}
        <Path
          fill="#424242"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Face Shape - Light Terracotta (skin tone) */}
        <G filter="url(#release_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Closed with a gentle upward curve of relief) - Bolder Stroke Color */}
        <Path
          stroke="#000000" // Black
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M14 24 Q 18 23, 22 24"
          fill="none"
        />
        <Path
          stroke="#000000" // Black
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M26 24 Q 30 23, 34 24"
          fill="none"
        />

        {/* Mouth (Soft, slightly open 'O' for exhaling) - Bolder Color */}
        <Circle cx="24" cy="34" r="2.5" fill="#000000" />

        {/* Breath Visual: Wispy, dissipating elements - HIGH CONTRAST DARK BROWN */}
        <Line
          x1="20"
          y1="31"
          x2="18"
          y2="28"
          stroke="#3E2723"
          strokeWidth="2"
          opacity="1"
          strokeLinecap="round"
        />
        <Line
          x1="28"
          y1="31"
          x2="30"
          y2="28"
          stroke="#3E2723"
          strokeWidth="2"
          opacity="1"
          strokeLinecap="round"
        />
        <Line
          x1="24"
          y1="30"
          x2="24"
          y2="27"
          stroke="#3E2723"
          strokeWidth="2"
          opacity="1"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};
export default GuidedBreathingFace;
