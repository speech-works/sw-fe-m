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
  Path as SvgPath,
  Line,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const TongueTwisterFace = ({ size = 48, ...props }: SvgIconProps) => {
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
        {/* Background - Deep Plum/Purple for dramatic effect */}
        <Path
          fill="#6A1B9A"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Pale Peach/Skin Tone (ORIGINAL OVERFLOWING PATH RESTORED) */}
        <G filter="url(#cheek_knife_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Eyes (Confused look - same size, but eyebrows will convey confusion) */}
        <Circle cx="17" cy="24" r="3" fill="#212121" />
        <Circle cx="31" cy="24" r="3" fill="#212121" />
        {/* Eye highlights for a more expressive look */}
        <Circle cx="18" cy="23" r="1" fill="#FFFFFF" opacity="0.8" />
        <Circle cx="32" cy="23" r="1" fill="#FFFFFF" opacity="0.8" />

        {/* Eyebrows (Confused look - one raised, one slightly furrowed) */}
        <Line
          x1="16"
          y1="17.5" // Left brow slightly raised
          x2="20"
          y2="19"
          stroke="#212121"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Line
          x1="28"
          y1="19"
          x2="32"
          y2="17.5" // Right brow slightly lowered/furrowed
          stroke="#212121"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* MOUTH: Stitched with white thread (UNMODIFIED) */}
        <G stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none">
          {/* Main Sealing Bar */}
          <Line x1="19" y1="34" x2="29" y2="34" strokeWidth={1} />
          {/* Small 'Stitch' Lines */}
          <Line x1="22" y1="32.5" x2="22" y2="35.5" strokeWidth="1.5" />
          <Line x1="26" y1="32.5" x2="26" y2="35.5" strokeWidth="1.5" />
        </G>
      </G>
    </Svg>
  );
};
export default TongueTwisterFace;
