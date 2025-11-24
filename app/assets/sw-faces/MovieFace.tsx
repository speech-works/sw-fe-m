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

const MovieFace = ({
  size = 48,
  ...props
}: SvgProps & { size?: number | string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Filter
        id="3d_shadow"
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
        id="3d_mask"
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
    <G mask="url(#3d_mask)">
      <Path
        fill="#5200B7"
        d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
      />
      <G filter="url(#3d_shadow)">
        <Path
          fill="#FFDABF"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
      </G>
      <G transform="translate(0, -2)">
        <Path fill="#FFF" d="M8 20 H 40 V 30 H 8 Z" />
        <Rect
          x="12"
          y="22"
          width="10"
          height="6"
          rx="1"
          fill="#FF4040"
          opacity="0.9"
        />
        <Rect
          x="26"
          y="22"
          width="10"
          height="6"
          rx="1"
          fill="#4047FF"
          opacity="0.9"
        />
        <Path stroke="#FFF" strokeWidth="2" d="M8 22 L 4 20" />
        <Path stroke="#FFF" strokeWidth="2" d="M40 22 L 44 20" />
      </G>
      <Circle
        cx="24"
        cy="36"
        r="2.5"
        stroke="#111215"
        strokeWidth="2"
        fill="none"
      />
    </G>
  </Svg>
);

export default MovieFace;
