import * as React from "react";
import Svg, {
  Path,
  G,
  Defs,
  Mask,
  Filter,
  FeFlood,
  FeColorMatrix,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  FeBlend,
  SvgProps,
  Rect,
  Circle,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const ReportFace = ({ size = 48, ...props }: SvgIconProps) => {
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
        <Mask id="circleMask">
          <Circle cx="24" cy="24" r="24" fill="#fff" />
        </Mask>
        <Filter
          id="report_shadow_greenflag"
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
      </Defs>

      {/* Base Background - Sunny Yellow */}
      <Circle cx="24" cy="24" r="24" fill="#FFF59D" />

      {/* Masked Content */}
      <G mask="url(#circleMask)">
        {/* Layer 1: Chart (Back) - Coral Bars */}
        <G id="ChartElements">
          <Rect x="4" y="24" width="8" height="20" rx="2" fill="#FF7043" />
          <Rect x="16" y="10" width="8" height="34" rx="2" fill="#FF7043" />
          <Rect x="28" y="4" width="8" height="40" rx="2" fill="#FF7043" />
        </G>

        {/* Layer 2: Character (Middle) - Translucent & Shifted Down */}
        <G opacity={0.9} transform="translate(0, 8)">
          {/* Face Shape */}
          <G filter="url(#report_shadow_greenflag)">
            <Path
              fill="#FFDABF"
              d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
            />
          </G>

          {/* Hand */}
          <Path
            fill="#FFDABF"
            d="M32 28 C 34 26, 36 28, 34 30 L 32 28 Z"
            transform="rotate(15, 34, 28)"
          />

          {/* Flagpole */}
          <Rect x="32" y="26" width="3.5" height="14" fill="#757575" rx="1.7" />

          {/* 🌿 Smooth Wavy Cloth */}
          <Path
            fill="#4CAF50"
            d="
            M35 26
            C 40 25, 44 26.5, 45 28.5
            C 46 30.5, 43 32, 40 31.3
            C 37 30.6, 37 32, 34.8 31
            Z
          "
            transform="rotate(-5, 38, 28)"
          />

          {/* Eyes */}
          <Path
            stroke="#212121"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M14 24 Q 16 26, 20 24"
            fill="none"
          />
          <Path
            stroke="#212121"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M28 24 Q 30 26, 32 24"
            fill="none"
          />

          {/* Mouth */}
          <Path
            stroke="#BF360C"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M18 34 Q 24 37, 30 34"
            fill="none"
          />
        </G>

        {/* Layer 3: Arrow (Front) - Green Trend Line */}
        <G id="TrendArrow">
          <Path
            d="M6 30 C 12 30, 20 20, 32 6"
            stroke="#4CAF50"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M26 6 L 32 6 L 31 12"
            stroke="#4CAF50"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      </G>
    </Svg>
  );
};
export default ReportFace;
