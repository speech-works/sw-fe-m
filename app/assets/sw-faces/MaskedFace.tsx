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
  Line,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const MaskedFace = ({ size = 48, ...props }: SvgIconProps) => {
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
          id="cheek_knife_shadow"
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
          <FeOffset dx={2} dy={2} />
          <FeGaussianBlur stdDeviation={0.5} />
          <FeComposite in2="hardAlpha" operator="out" />
          <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
          <FeBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
          <FeBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </Filter>
        <Mask
          id="cheek_knife_mask"
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

      <G mask="url(#cheek_knife_mask)">
        {/* Background - Sepia Toned Brown */}
        <Path
          fill="#795548"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Pale Peach/Skin Tone (RESTORED ORIGINAL PROPORTIONS) */}
        <G filter="url(#cheek_knife_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Hidden by goggles, eyebrows suggest grim determination) */}
        <Line
          x1="16"
          y1="19.5"
          x2="20"
          y2="20.5"
          stroke="#000000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Line
          x1="28"
          y1="20.5"
          x2="32"
          y2="19.5"
          stroke="#000000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Steampunk Gas Mask (Full face, goggles, central filter) - NOW TRANSLUCENT */}
        <Path
          fill="#6D4C41" // Dark leather base
          opacity="0.5" // ADDED OPACITY HERE for translucence
          d="M8 10 C 8 8, 40 8, 40 10 V 40 C 40 42, 8 42, 8 40 Z" // Base mask shape
        />
        {/* Goggles (Brass/Copper) */}
        <Circle
          cx="17"
          cy="20"
          r="5"
          fill="#BCAAA4"
          stroke="#8D6E63"
          strokeWidth="1.5"
        />
        <Circle
          cx="31"
          cy="20"
          r="5"
          fill="#BCAAA4"
          stroke="#8D6E63"
          strokeWidth="1.5"
        />
        {/* Goggle lenses (Darker, slightly reflective) */}
        <Circle cx="17" cy="20" r="3.5" fill="#424242" opacity="0.8" />
        <Circle cx="31" cy="20" r="3.5" fill="#424242" opacity="0.8" />
        {/* Central Air Filter (Brass/Copper) */}
        <Circle
          cx="24"
          cy="32"
          r="8"
          fill="#BCAAA4"
          stroke="#8D6E63"
          strokeWidth="2"
        />
        {/* Filter grille lines */}
        <Line
          x1="24"
          y1="24"
          x2="24"
          y2="40"
          stroke="#8D6E63"
          strokeWidth="1"
        />
        <Line
          x1="16"
          y1="32"
          x2="32"
          y2="32"
          stroke="#8D6E63"
          strokeWidth="1"
        />
        {/* Rivets */}
        <Circle cx="12" cy="15" r="1" fill="#757575" />
        <Circle cx="36" cy="15" r="1" fill="#757575" />
      </G>
    </Svg>
  );
};
export default MaskedFace;
