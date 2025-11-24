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

const AgentFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
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
          id="agent_shadow"
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
          id="agent_mask"
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

      <G mask="url(#agent_mask)">
        {/* Background - Midnight Blue (Stealth) */}
        <Path
          fill="#263238"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* The Brand Face Shape */}
        <G filter="url(#agent_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Sunglasses (Blacked out) */}
        <Path fill="#000" d="M10 24 L 20 24 L 20 30 L 12 30 Z" />
        <Path fill="#000" d="M28 24 L 38 24 L 36 30 L 28 30 Z" />
        <Path stroke="#000" strokeWidth="2" d="M20 25 L 28 25" />

        {/* Neutral Mouth */}
        <Path
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          d="M22 36 L 26 36"
        />

        {/* Fedora Hat - Moved UP to sit on top of the head */}
        {/* Hat Top */}
        <Path fill="#37474F" d="M14 -4 L 34 -4 L 36 8 L 12 8 Z" />
        {/* Hat Band */}
        <Path fill="#000" d="M12 4 L 36 4 L 36 8 L 12 8 Z" />
        {/* Hat Brim */}
        <Path
          stroke="#37474F"
          strokeWidth="4"
          strokeLinecap="round"
          d="M4 8 Q 24 12, 44 8"
          fill="none"
        />

        {/* Secret Service Earpiece - Moved to the edge (ear position) */}
        {/* Coiled Wire */}
        <Path
          stroke="#90A4AE"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          // Starts at 39,26 (ear edge) and coils down
          d="M39 26 C 42 26, 44 30, 42 36 C 40 42, 44 44, 44 50"
          opacity="0.8"
        />
        {/* Earpiece Plug */}
        <Circle cx="39" cy="26" r="1.5" fill="#90A4AE" />
      </G>
    </Svg>
  );
};

export default AgentFace;
