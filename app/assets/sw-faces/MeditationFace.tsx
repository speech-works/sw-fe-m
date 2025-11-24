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

const MeditationFace = ({ size = 48, ...props }: SvgIconProps) => {
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
          id="calm_shadow"
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
          id="calm_mask"
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

      <G mask="url(#calm_mask)">
        {/* Background - Deep Indigo */}
        <Path
          fill="#3F51B5"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Skin Tone (a warm, light peach/beige) */}
        <G filter="url(#calm_shadow)">
          <Path
            fill="#FFDAB9" // Changed to a more neutral skin tone
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Straight, fully closed lines) */}
        <Line
          stroke="#607D8B"
          strokeWidth="2.5"
          strokeLinecap="round"
          x1="15"
          y1="24"
          x2="21"
          y2="24"
        />
        <Line
          stroke="#607D8B"
          strokeWidth="2.5"
          strokeLinecap="round"
          x1="27"
          y1="24"
          x2="33"
          y2="24"
        />

        {/* Mouth (Flat, neutral line) */}
        <Line
          stroke="#607D8B"
          strokeWidth="2.5"
          strokeLinecap="round"
          x1="20"
          y1="34"
          x2="28"
          y2="34"
        />

        {/* Breath Visual: Halo rings with a distinct blue color and higher opacity */}
        {/* Inner ring */}
        <Circle
          cx="24"
          cy="24"
          r="15"
          stroke="#42A5F5"
          strokeWidth="1.5"
          opacity="0.7"
          fill="none"
        />
        {/* Outer ring */}
        <Circle
          cx="24"
          cy="24"
          r="18"
          stroke="#42A5F5"
          strokeWidth="1.2"
          opacity="0.6"
          fill="none"
        />
      </G>
    </Svg>
  );
};
export default MeditationFace;
