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

const SvgIcon = ({ width = 130, height = 130 }: SvgIconProps) => (
  <Svg width={width} height={height} fill="none" viewBox="0 0 130 130">
    <G filter="url(#filter0_d_2193_11405)">
      <Mask
        id="mask0_2193_11405"
        width="122"
        height="122"
        x="4"
        y="0"
        maskUnits="userSpaceOnUse"
        style={{ maskType: "luminance" }}
      >
        <Path
          fill="#fff"
          d="M125.999 61c0-33.69-27.31-61-61-61C31.312 0 4 27.31 4 61s27.31 61 61 61 60.999-27.311 60.999-61"
        ></Path>
      </Mask>
      <G mask="url(#mask0_2193_11405)">
        <Path
          fill="#FF9040"
          d="M125.999 61c0-33.69-27.31-61-61-61C31.312 0 4 27.31 4 61s27.31 61 61 61 60.999-27.311 60.999-61"
        ></Path>
        <G filter="url(#filter1_d_2193_11405)">
          <Path
            fill="#FFDABF"
            d="M23.16 31.298c0-7.032 84.381-7.032 84.381 0 7.031 0 7.031 98.452 0 98.452 0 7.032-84.38 7.032-84.38 0-7.032 0-7.032-98.452 0-98.452"
          ></Path>
        </G>
        <Path
          fill="#fff"
          d="M46.702 79.3c10.107 0 18.3-8.193 18.3-18.3s-8.193-18.3-18.3-18.3-18.3 8.193-18.3 18.3c0 10.106 8.193 18.3 18.3 18.3"
        ></Path>
        <Path
          fill="#fff"
          d="M83.3 79.3c10.107 0 18.3-8.193 18.3-18.3s-8.193-18.3-18.3-18.3S65 50.893 65 61c0 10.106 8.193 18.3 18.3 18.3"
        ></Path>
        <Path
          fill="#401B00"
          d="M46.699 71.98c6.064 0 10.98-4.917 10.98-10.98 0-6.065-4.916-10.98-10.98-10.98S35.719 54.934 35.719 61c0 6.063 4.916 10.98 10.98 10.98M83.302 71.98c6.064 0 10.98-4.917 10.98-10.98 0-6.065-4.916-10.98-10.98-10.98S72.322 54.934 72.322 61c0 6.063 4.916 10.98 10.98 10.98M46.7 99.5c1.104 0 2-1.791 2-4s-.896-4-2-4-2 1.79-2 4 .895 4 2 4M51.273 101.5c1.105 0 2-2.687 2-6s-.895-6-2-6-2 2.686-2 6 .896 6 2 6M55.85 103.5c1.104 0 2-3.582 2-8s-.896-8-2-8-2 3.581-2 8c0 4.418.895 8 2 8M60.424 105.5c1.104 0 2-4.478 2-10s-.896-10-2-10-2 4.477-2 10 .895 10 2 10M65 107.5c1.105 0 2-5.373 2-12 0-6.628-.895-12-2-12s-2 5.372-2 12c0 6.627.895 12 2 12M69.574 105.5c1.105 0 2-4.478 2-10s-.895-10-2-10-2 4.477-2 10 .896 10 2 10M74.148 103.5c1.105 0 2-3.582 2-8s-.895-8-2-8-2 3.581-2 8c0 4.418.896 8 2 8M78.725 101.5c1.104 0 2-2.687 2-6s-.896-6-2-6-2 2.686-2 6 .895 6 2 6M83.299 99.5c1.104 0 2-1.791 2-4s-.896-4-2-4-2 1.79-2 4 .895 4 2 4"
        ></Path>
      </G>
    </G>
    <Defs>
      <Filter
        id="filter0_d_2193_11405"
        width="129.998"
        height="130"
        x="0"
        y="0"
        //colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <FeFlood floodOpacity="0" result="BackgroundImageFix"></FeFlood>
        <FeColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></FeColorMatrix>
        <FeOffset dy="4"></FeOffset>
        <FeGaussianBlur stdDeviation="2"></FeGaussianBlur>
        <FeComposite in2="hardAlpha" operator="out"></FeComposite>
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"></FeColorMatrix>
        <FeBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2193_11405"
        ></FeBlend>
        <FeBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2193_11405"
          result="shape"
        ></FeBlend>
      </Filter>
      <Filter
        id="filter1_d_2193_11405"
        width="107.554"
        height="121.626"
        x="17.887"
        y="26.024"
        // colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <FeFlood floodOpacity="0" result="BackgroundImageFix"></FeFlood>
        <FeColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        ></FeColorMatrix>
        <FeOffset dx="6.313" dy="6.313"></FeOffset>
        <FeGaussianBlur stdDeviation="3.157"></FeGaussianBlur>
        <FeComposite in2="hardAlpha" operator="out"></FeComposite>
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"></FeColorMatrix>
        <FeBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_2193_11405"
        ></FeBlend>
        <FeBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_2193_11405"
          result="shape"
        ></FeBlend>
      </Filter>
    </Defs>
  </Svg>
);

export default SvgIcon;
