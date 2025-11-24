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
  Rect,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const OnCallFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="speaker_shadow_theme"
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
          id="speaker_mask_theme"
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
      <G mask="url(#speaker_mask_theme)">
        {/* Background - New Theme Orange */}
        <Path
          fill="#FF9040"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        <G filter="url(#speaker_shadow_theme)">
          {/* Face - Lighter tint of theme color */}
          <Path
            fill="#FFB77F"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Headset Band - Warm dark brown */}
        <Path
          stroke="#5D4037"
          strokeWidth="2.5"
          fill="none"
          d="M6 22 C 6 12, 14 4, 24 4 C 34 4, 42 12, 42 22"
          strokeLinecap="round"
        />

        {/* Earpiece (Right side) - Deeper brown */}
        <Rect x="40" y="18" width="6" height="12" rx="2" fill="#4E342E" />

        {/* Mic Boom */}
        <Path
          stroke="#5D4037"
          strokeWidth="2"
          fill="none"
          d="M42 24 L 36 34"
          strokeLinecap="round"
        />
        <Circle cx="36" cy="34" r="2.5" fill="#3E2723" />

        {/* Eyes (Confident) - Sclera */}
        <Path
          fill="#fff"
          d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        <Path
          fill="#fff"
          d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
        />
        {/* Pupils - Deep brown */}
        <Circle cx="16.8" cy="24" r="2.5" fill="#4E342E" />
        <Circle cx="31.2" cy="24" r="2.5" fill="#4E342E" />

        {/* Mouth (Speaking) - Deep brown */}
        <Path fill="#4E342E" d="M20 34 Q 24 38, 28 34 Z" />
      </G>
    </Svg>
  );
};
export default OnCallFace;
