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
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  width?: number | string;
  height?: number | string;
}

const SvgIcon = ({ width = 48, height = 48, ...props }: SvgIconProps) => (
  <Svg width={width} height={height} viewBox="0 0 48 48" fill="none" {...props}>
    <Mask
      id="mask0_2132_4899"
      x={0}
      y={0}
      width={48}
      height={48}
      maskUnits="userSpaceOnUse"
    >
      <Path
        fill="#fff"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
    </Mask>
    <G mask="url(#mask0_2132_4899)">
      <Path
        fill="#F9E7D9"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G filter="url(#filter0_d_2132_4899)">
        <Path
          fill="#F7DFA9"
          d="M7.538 10.313c0-2.766 33.199-2.766 33.199 0 2.766 0 2.766 38.736 0 38.736 0 2.767-33.2 2.767-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>
      <Path
        fill="#fff"
        d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Path
        fill="#fff"
        d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Path
        fill="#2E2E2E"
        d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
      />
      <Path
        stroke="#4A4A4A"
        strokeLinecap="round"
        strokeWidth={3.558}
        d="M16.8 36q7.2 4.8 14.4 0"
      />
    </G>
    <Defs>
      <Filter
        id="filter0_d_2132_4899"
        x={5.463}
        y={8.238}
        width={43.35}
        height={48.886}
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
        <FeBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2132_4899"
        />
        <FeBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2132_4899"
          result="shape"
        />
      </Filter>
    </Defs>
  </Svg>
);

export default SvgIcon;
