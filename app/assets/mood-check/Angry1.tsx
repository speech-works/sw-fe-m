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

interface Angry1Props extends SvgProps {
  width?: number | string;
  height?: number | string;
}

const Angry1 = ({ width = 48, height = 48 }: Angry1Props) => (
  <Svg width={width} height={height} viewBox="0 0 48 48" fill="none">
    <Mask
      id="mask0"
      x={0}
      y={0}
      width={48}
      height={48}
      maskUnits="userSpaceOnUse"
    >
      <Path
        fill="#fff"
        d="M24 0C10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24S37.255 0 24 0"
      />
    </Mask>
    <G mask="url(#mask0)">
      <Path
        fill="#FFD6D6"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G filter="url(#filter0)">
        <Path
          fill="#F28B82"
          d="M7.628 10.176c0-2.805 33.119-2.805 33.119 0 2.76 0 2.76 39.26 0 39.26 0 2.805-33.119 2.805-33.119 0-2.76 0-2.76-39.26 0-39.26"
        />
      </G>
      <Path
        fill="#4A4A4A"
        d="m24.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
      />
      <Path
        fill="#4A4A4A"
        d="M35.298 12.913 23.707 16.02l.994 3.71 11.591-3.107z"
      />
      <Path
        fill="#FFF8F8"
        d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Path
        fill="#FFF8F8"
        d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      />
      <Path
        fill="#6D6D6D"
        d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
      />
    </G>
    <Defs>
      <Filter
        id="filter0"
        x={5.559}
        y={8.072}
        width={43.258}
        height={49.468}
        filterUnits="userSpaceOnUse"
        //colorInterpolationFilters="sRGB"
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
    </Defs>
  </Svg>
);

export default Angry1;
