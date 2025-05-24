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

const SvgIcon = ({ width = 48, height = 48 }: SvgIconProps) => (
  <Svg width={width} height={height} viewBox="0 0 48 48" fill="none">
    <Mask
      id="mask0_2132_4802"
      x={0}
      y={0}
      width={48}
      height={48}
      maskUnits="userSpaceOnUse"
      style={{ maskType: "luminance" }}
    >
      <Path
        fill="#fff"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      ></Path>
    </Mask>
    <G mask="url(#mask0_2132_4802)">
      <Path
        fill="#B8DCC2"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      ></Path>
      <G filter="url(#filter0_d_2132_4802)">
        <Path
          fill="#E7E2CB"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        ></Path>
      </G>
      <Path
        fill="#fff"
        d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      ></Path>
      <Path
        fill="#fff"
        d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      ></Path>
      <Path
        fill="#4A4A4A"
        d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64"
      ></Path>
    </G>
    <Defs>
      <Filter
        id="filter0_d_2132_4802"
        x={6}
        y={8}
        width={43.35}
        height={48.886}
        filterUnits="userSpaceOnUse"
        //colorInterpolationFilters="sRGB"
      >
        <FeFlood floodOpacity={0} result="BackgroundImageFix"></FeFlood>
        <FeColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></FeColorMatrix>
        <FeOffset dx={4} dy={4}></FeOffset>
        <FeGaussianBlur stdDeviation={1}></FeGaussianBlur>
        <FeComposite in2="hardAlpha" operator="out"></FeComposite>
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"></FeColorMatrix>
        <FeBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2132_4802"
        ></FeBlend>
        <FeBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2132_4802"
          result="shape"
        ></FeBlend>
      </Filter>
    </Defs>
  </Svg>
);

export default SvgIcon;
