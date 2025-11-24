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

const StorytellerFace = ({
  size = 48,
  width,
  height,
  ...props
}: SvgIconProps) => {
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
          id="storyteller_shadow"
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
          id="storyteller_mask"
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

      <G mask="url(#storyteller_mask)">
        {/* Background - A subtle, pleasant shade of turquoise/teal (solid color) */}
        <Path
          fill="#80CBC4" /* Muted Teal/Turquoise */
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* The Brand Face Shape - Light skin tone (maintained for contrast) */}
        <G filter="url(#storyteller_shadow)">
          <Path
            fill="#FFCCBC" /* Light face color for contrast against background */
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Thick Reading Glasses (color maintained for feature definition) */}
        <G stroke="#BF360C" strokeWidth="4" fill="none" strokeLinecap="round">
          {/* Left Frame */}
          <Circle cx="16.8" cy="24" r="8" />
          {/* Right Frame */}
          <Circle cx="31.2" cy="24" r="8" />
          {/* Bridge */}
          <Path d="M24.8 24 L 23.2 24" />
          {/* Arms connecting to the side of head - adjusted to align with face shape */}
          <Path d="M10 24 L 7 24" />
          <Path d="M38 24 L 41 24" />
        </G>

        {/* Eyes (Engaged and friendly, within glasses) */}
        <Circle cx="16.8" cy="24" r="2.5" fill="#BF360C" />
        <Circle cx="31.2" cy="24" r="2.5" fill="#BF360C" />
        {/* Small highlights for sparkle */}
        <Circle cx="17.5" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
        <Circle cx="31.9" cy="23" r="0.7" fill="#FFF" opacity="0.8" />

        {/* Speech Bubble - (maintained white for readability, with a strong stroke) */}
        <G transform="translate(24, 38)">
          {/* Positioned centrally at the bottom of the face */}
          {/* Main rectangular part of the bubble */}
          <Path
            d="M-12 -6 H 12 V 4 H 0 L -2 7 L -4 4 H -12 Z"
            fill="#FFFFFF"
            stroke="#BF360C" /* Strong stroke for clarity */
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Placeholder lines for text within the bubble */}
          <Path
            stroke="#BF360C"
            strokeWidth="1"
            strokeLinecap="round"
            d="M-8 -3 L 8 -3"
          />
          <Path
            stroke="#BF360C"
            strokeWidth="1"
            strokeLinecap="round"
            d="M-6 0 L 6 0"
          />
        </G>
      </G>
    </Svg>
  );
};
export default StorytellerFace;
