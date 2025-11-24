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
  Circle,
  Path as SvgPath,
  Line,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const HappyScreamFace = ({ size = 48, ...props }: SvgIconProps) => {
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
          id="scream_shadow"
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
          id="scream_mask"
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

      <G mask="url(#scream_mask)">
        {/* Background - Bright Teal */}
        <Path
          fill="#009688"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Energetic Yellow */}
        <G filter="url(#scream_shadow)">
          <Path
            fill="#FFEB3B"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* Eyes (Narrowed for screaming, but happy arch) */}
        <Path
          stroke="#212121"
          strokeWidth="3"
          strokeLinecap="round"
          d="M15 22 Q 17 20, 19 22"
          fill="none"
        />
        <Path
          stroke="#212121"
          strokeWidth="3"
          strokeLinecap="round"
          d="M29 22 Q 31 20, 33 22"
          fill="none"
        />
        {/* Mouth (Wide open oval for screaming) */}
        <Circle cx="24" cy="35" r="5" fill="#212121" />
        <Circle cx="24" cy="37" r="2.5" fill="#D32F2F" />
        {/* Prop: Excitement Burst lines around the head */}
        <Line
          x1="45"
          y1="24"
          x2="48"
          y2="24"
          stroke="#FF4081"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="38"
          y1="40"
          x2="40"
          y2="42"
          stroke="#FF4081"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="3"
          y1="24"
          x2="0"
          y2="24"
          stroke="#FF4081"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="10"
          y1="40"
          x2="8"
          y2="42"
          stroke="#FF4081"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};
export default HappyScreamFace;
