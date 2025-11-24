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
  Rect,
  Circle,
} from "react-native-svg";

const RoboticPhoneFace = ({
  size = 48,
  ...props
}: SvgProps & { size?: number | string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Filter
        id="aibot_shadow"
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

      <Mask id="aibot_mask" x="0" y="0" width="48" height="48">
        <Path
          fill="#fff"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
      </Mask>
    </Defs>

    <G mask="url(#aibot_mask)">
      {/* Background */}
      <Path
        fill="#E5E7FF"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />

      {/* Receiver (retro handset) */}
      <G>
        {/* The main bridge body */}
        <Path
          d="M10 15 Q 24 7, 38 15"
          stroke="#1A1A1A"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
        />
        {/* Left capsule end */}
        <Circle cx={10} cy={16.5} r={4.5} fill="#1A1A1A" />

        {/* Right capsule end */}
        <Circle cx={38} cy={16.5} r={4.5} fill="#1A1A1A" />

        {/* Subtle top highlight */}
        <Path
          d="M12 13 Q 24 6, 36 13"
          stroke="#2F2F2F"
          strokeWidth={0.8}
          strokeLinecap="round"
          opacity={0.25}
          fill="none"
        />
      </G>

      {/* Face Body */}
      <G filter="url(#aibot_shadow)">
        <Path
          fill="#90A4AE"
          d="M8.075 18.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 29 0 29 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-29 0-29"
        />
      </G>

      {/* Screen background */}
      <Rect x="12" y="24" width="24" height="12" rx="2" fill="#263238" />

      {/* Yellow Eyes */}
      <Circle cx="18" cy="30" r="3.5" fill="#FFB600" />
      <Circle cx="30" cy="30" r="3.5" fill="#FFB600" />
    </G>
  </Svg>
);

export default RoboticPhoneFace;
