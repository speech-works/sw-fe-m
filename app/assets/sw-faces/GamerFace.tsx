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

const GamerFace = ({
  size = 48,
  ...props
}: SvgProps & { size?: number | string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Filter
        id="gamer_shadow"
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
        id="gamer_mask"
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
    <G mask="url(#gamer_mask)">
      {/* Background - Gaming Purple */}
      <Path
        fill="#A259FB"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G filter="url(#gamer_shadow)">
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>
      {/* Gaming Headset Band */}
      <Path
        stroke="#22252B"
        strokeWidth="4"
        fill="none"
        d="M4 24 C 4 12, 12 4, 24 4 C 36 4, 44 12, 44 24"
        strokeLinecap="round"
      />
      {/* RGB Ear Cups (Neon Green/Pink details) */}
      <Rect x="2" y="18" width="6" height="14" rx="2" fill="#333740" />
      <Rect x="4" y="22" width="2" height="6" rx="1" fill="#000AFF" />{" "}
      {/* LED Light */}
      <Rect x="40" y="18" width="6" height="14" rx="2" fill="#333740" />
      <Rect x="42" y="22" width="2" height="6" rx="1" fill="#FF0000" />{" "}
      {/* LED Light */}
      {/* Eyes (Focused on screen) */}
      <Path
        fill="#fff"
        d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Path
        fill="#fff"
        d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Circle cx="16.8" cy="24" r="2.5" fill="#111215" />
      <Circle cx="31.2" cy="24" r="2.5" fill="#111215" />
      {/* Gamer Mic */}
      <Path
        stroke="#22252B"
        strokeWidth="2"
        fill="none"
        d="M40 28 L 32 36"
        strokeLinecap="round"
      />
      <Circle cx="32" cy="36" r="2" fill="#22252B" />
    </G>
  </Svg>
);
export default GamerFace;
