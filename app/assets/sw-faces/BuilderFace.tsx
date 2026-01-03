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

const BuilderTouristMapFace = ({ size = 48, ...props }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Filter
        id="finish_cool_shadow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
        filterUnits="userSpaceOnUse"
      >
        <FeFlood floodOpacity={0} result="bgFix" />
        <FeColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <FeOffset dx={4} dy={4} />
        <FeGaussianBlur stdDeviation={1} />
        <FeComposite in2="hardAlpha" operator="out" />
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <FeBlend in2="bgFix" result="sh" />
        <FeBlend in="SourceGraphic" in2="sh" />
      </Filter>
      <Mask id="m">
        <Path
          fill="#fff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
      </Mask>
    </Defs>
    <G mask="url(#m)">
      {/* Background - Deep Ocean */}
      <Path fill="#01579B" d="M0 0h48v48H0z" />

      {/* DETAILED WORLD MAP BACKGROUND */}
      <G fill="#4CAF50" opacity="0.9">
        <Path d="M2 2 L 12 0 L 18 5 L 14 12 L 8 15 L 2 12 Z" />
        <Path d="M22 1 L 26 0 L 28 4 L 24 6 Z" />
        <Path d="M30 5 L 35 2 L 45 4 L 48 12 L 40 18 L 32 15 Z" />
        <Path d="M42 22 L 48 24 L 46 35 L 40 38 L 38 30 Z" />
        <Path d="M4 35 L 12 38 L 10 48 H 2 Z" />
        <Path d="M38 42 L 44 40 L 46 45 L 42 48 H 36 Z" />
      </G>

      {/* GRID LINES */}
      <Path
        d="M0 24 H 48 M 24 0 V 48"
        stroke="#FFFFFF"
        strokeWidth="0.2"
        opacity="0.3"
      />

      {/* DROPPED FACE STRUCTURE */}
      <G filter="url(#finish_cool_shadow)" transform="translate(0, 6)">
        <Path
          fill="#FFD180"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* --- BUILDER HARD HAT --- */}
        {/* Hat Base */}
        <Path d="M6 14 Q 24 2, 42 14 L 44 18 H 4 Z" fill="#FFEB3B" />
        {/* Hat Ridge */}
        <Path
          d="M14 10 Q 24 4, 34 10"
          stroke="#FDD835"
          strokeWidth="2"
          fill="none"
        />
        {/* Safety Emblem/Badge */}
        <Rect
          x="22"
          y="8"
          width="4"
          height="4"
          rx="1"
          fill="#FFF"
          opacity="0.8"
        />
        <Path d="M23 10 H 25 M 24 9 V 11" stroke="#FBC02D" strokeWidth="1" />

        {/* --- FRIENDLY BUILDER EYES --- */}
        <Circle cx="16" cy="26" r="2.5" fill="#5D4037" />
        <Circle cx="32" cy="26" r="2.5" fill="#5D4037" />

        {/* Deterministic Eyebrows */}
        <Path
          d="M13 21 Q 16 19, 19 21"
          stroke="#5D4037"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M29 21 Q 32 19, 35 21"
          stroke="#5D4037"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Friendly Smile */}
        <Path
          d="M18 36 Q 24 42, 30 36"
          stroke="#5D4037"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </G>

      {/* TOP FOG / CLOUDS */}
      <Path
        d="M0 0 Q 12 8, 24 0 T 48 0 V 6 Q 24 12, 0 6 Z"
        fill="#FFFFFF"
        opacity="0.4"
      />
    </G>
  </Svg>
);

export default BuilderTouristMapFace;
