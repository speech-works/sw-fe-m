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

interface SvgIconProps {
  size?: number | string;
}

const AuthorFace = ({ size = 48, ...props }: SvgIconProps) => {
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
          id="storyteller_shadow_mustache"
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
          id="storyteller_mask_mustache"
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

      <G mask="url(#storyteller_mask_mustache)">
        {/* Background - Warm, muted yellow */}
        <Path
          fill="#558B2F" /* Warm Yellow */
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* The Brand Face Shape - Slightly darker, warmer skin tone */}
        <G filter="url(#storyteller_shadow_mustache)">
          <Path
            fill="#A1887F" /* Slightly darker, warmer face color */
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Thick Reading Glasses (color adjusted for new palette) */}
        <G stroke="#6D4C41" strokeWidth="4" fill="none" strokeLinecap="round">
          {/* Left Frame */}
          <Circle cx="16.8" cy="24" r="8" />
          {/* Right Frame */}
          <Circle cx="31.2" cy="24" r="8" />
          {/* Bridge */}
          <Path d="M24.8 24 L 23.2 24" />
          {/* Arms connecting to the side of head */}
          <Path d="M10 24 L 7 24" />
          <Path d="M38 24 L 41 24" />
        </G>

        {/* Eyes (Engaged and friendly, within glasses) */}
        <Circle cx="16.8" cy="24" r="2.5" fill="#6D4C41" />
        <Circle cx="31.2" cy="24" r="2.5" fill="#6D4C41" />
        {/* Small highlights for sparkle */}
        <Circle cx="17.5" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
        <Circle cx="31.9" cy="23" r="0.7" fill="#FFF" opacity="0.8" />

        {/* Prop: Friendly Mustache (More manly and thick) */}
        <Path
          d="M16 29 Q 20 35, 24 35 Q 28 35, 32 29"
          stroke="#3E2723"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#3E2723"
        />

        {/* NEW: Stubble Beard as a semi-transparent shape, fixed and contained within the face */}
        <Path
          d="M10 34 C 6 36, 6 48, 10 50 C 18 53, 30 53, 38 50 C 42 48, 42 36, 38 34 Z"
          fill="#3E2723"
          opacity="0.25"
        />

        {/* Overlay a few subtle dots for texture, moved to match the new beard shape */}
        <G fill="#3E2723" opacity="0.35">
          <Circle cx="13" cy="43" r="0.5" />
          <Circle cx="17" cy="46" r="0.6" />
          <Circle cx="24" cy="48" r="0.7" />
          <Circle cx="31" cy="46" r="0.6" />
          <Circle cx="35" cy="43" r="0.5" />
          <Circle cx="15" cy="40" r="0.4" />
          <Circle cx="33" cy="40" r="0.4" />
        </G>
      </G>
    </Svg>
  );
};
export default AuthorFace;
