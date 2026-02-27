import React from "react";
import Svg, { G, Mask, Path, SvgProps } from "react-native-svg";
interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  width?: number | string;
  height?: number | string;
}

const SvgIcon = ({
  width = 48,
  height = 48,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => (
  <Svg width={width} height={height} viewBox="0 0 48 48" fill="none">
    <Mask
      id="mask0_2132_4885"
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
    <G mask="url(#mask0_2132_4885)">
      <Path
        fill="#E6E8FF"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      ></Path>
      <G>
        <Path
          fill="#BEEDE8"
          d="M7.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.199 2.766-33.199 0-2.767 0-2.767-38.736 0-38.736"
        ></Path>
      </G>
      <Path
        fill="#FAFBFC"
        d="M16.8 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      ></Path>
      <Path
        fill="#FAFBFC"
        d="M31.2 31.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4"
      ></Path>
      <Path
        fill="#5B5B5B"
        d="M16.8 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M31.2 28.32a4.32 4.32 0 1 0 0-8.64 4.32 4.32 0 0 0 0 8.64M23.298 12.913 11.707 16.02l.994 3.71 11.591-3.107z"
      ></Path>
      <Path
        fill="#5B5B5B"
        d="m36.292 16.019-11.591-3.106-.994 3.71 11.591 3.105z"
      ></Path>
    </G>
  </Svg>
);

export default React.memo(SvgIcon);
