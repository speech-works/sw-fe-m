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

const PushFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="push_shadow"
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
          id="push_mask"
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
      <G mask="url(#push_mask)">
        {/* Background - Azure Blue */}
        <Path
          fill="#2979FF"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#push_shadow)">
          {/* Face Shape - Warm Peach (Shifted slightly left to show effort) */}
          <Path
            fill="#FFCCBC"
            d="M6.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* Eyes (White - Straining/Closed tight) */}
        <Path
          stroke="#BF360C"
          strokeWidth="3"
          strokeLinecap="round"
          d="M12 20 L 18 24 L 12 28"
        />{" "}
        {/* > shape */}
        <Path
          stroke="#BF360C"
          strokeWidth="3"
          strokeLinecap="round"
          d="M28 20 L 22 24 L 28 28"
        />{" "}
        {/* < shape */}
        {/* Mouth - Gritting teeth */}
        <Path
          stroke="#BF360C"
          strokeWidth="3"
          strokeLinecap="round"
          d="M16 34 L 24 34"
        />
        {/* Hand pushing against edge */}
        <Circle cx="38" cy="24" r="5" fill="#FFAB91" />
        {/* The "Bar" being pushed */}
        <Path fill="#0D47A1" d="M42 0 L 48 0 L 48 48 L 42 48 Z" />
      </G>
    </Svg>
  );
};

export default PushFace;
