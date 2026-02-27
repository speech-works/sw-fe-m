import * as React from "react";
import Svg, {
    Circle,
    Defs,
    FeBlend,
    FeColorMatrix,
    FeComposite,
    FeFlood,
    FeGaussianBlur,
    FeOffset,
    Filter,
    G,
    Path,
    Rect,
    SvgProps,
} from "react-native-svg";

const MicSimpleAgent = ({
  size = 96,
  ...props
}: SvgProps & { size?: number | string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 96" fill="none" {...props}>
    <Defs>
      <Filter
        id="shadow_agent"
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
        <FeGaussianBlur stdDeviation={2} />
        <FeComposite in2="hardAlpha" operator="out" />
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <FeBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
        <FeBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
      </Filter>
    </Defs>
    <G filter="url(#shadow_agent)">
      {/* Body: White Shirt */}
      <Rect x="14" y="44" width="20" height="8" rx="2" fill="#FFFFFF" />
      <Path d="M 16 50 L 18 88 Q 24 92, 30 88 L 32 50 Z" fill="#ECEFF1" />

      {/* Black Tie (Simple Shape) */}
      <Path d="M 22 44 L 26 44 L 25 65 L 24 68 L 23 65 Z" fill="#111" />

      {/* Switch: Silver */}
      <Rect x="21" y="70" width="6" height="8" rx="2" fill="#B0BEC5" />
      <Circle cx="24" cy="74" r="1.5" fill="#455A64" />

      <G>
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* PROP: Wayfarer Shades (Resized to fit inside face) */}
        {/* Left Lens */}
        <Path d="M 9 23 L 23 23 L 23 29 C 23 29, 16 31, 9 28 Z" fill="#111" />
        {/* Right Lens */}
        <Path d="M 39 23 L 25 23 L 25 29 C 25 29, 32 31, 39 28 Z" fill="#111" />
        {/* Bridge */}
        <Path d="M 23 23 L 25 23" stroke="#111" strokeWidth="1.5" />

        {/* Earpiece Wire */}
        <Path
          d="M 40 26 C 44 26, 46 30, 46 40 L 46 50"
          stroke="#90A4AE"
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        {/* Stoic Mouth */}
        <Path
          d="M 20 36 L 28 36"
          stroke="#111215"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </G>
    </G>
  </Svg>
);
export default MicSimpleAgent;
