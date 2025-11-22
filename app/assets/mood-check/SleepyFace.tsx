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

const SleepyFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="sleepy_shadow"
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
          id="sleepy_mask"
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
      <G mask="url(#sleepy_mask)">
        {/* Background - Night Purple */}
        <Path
          fill="#311B92"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        <G filter="url(#sleepy_shadow)">
          {/* Face Shape - Light Lavender */}
          <Path
            fill="#D1C4E9"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* Closed Eyes (Dark Crescents) */}
        <Path
          stroke="#311B92"
          strokeWidth="3"
          strokeLinecap="round"
          d="M12 24 Q 16.8 28, 21.6 24"
        />
        <Path
          stroke="#311B92"
          strokeWidth="3"
          strokeLinecap="round"
          d="M26.4 24 Q 31.2 28, 36 24"
        />
        {/* Small Mouth */}
        <Path
          stroke="#311B92"
          strokeWidth="3"
          strokeLinecap="round"
          d="M22 34 L 26 34"
        />
        {/* Zzz */}
        <Path
          fill="#B39DDB"
          d="M35 8 L 40 8 L 35 14 L 40 14"
          stroke="#B39DDB"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <Path
          fill="#B39DDB"
          d="M40 4 L 44 4 L 40 8 L 44 8"
          stroke="#B39DDB"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};

export default SleepyFace;
