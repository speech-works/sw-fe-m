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
  size?: number | string;
}

const ListenerFace = ({ size = 48, width, height, ...props }: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

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
          id="listener_shadow"
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
          id="listener_mask"
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
      <G mask="url(#listener_mask)">
        {/* Background - Calm Indigo */}
        <Path
          fill="#5C6BC0"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        <G filter="url(#listener_shadow)">
          <Path
            fill="#FFCCBC"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* Headphones Band */}
        <Path
          stroke="#3949AB"
          strokeWidth="4"
          fill="none"
          d="M6 24 C 6 12, 12 4, 24 4 C 36 4, 42 12, 42 24"
          strokeLinecap="round"
        />

        {/* Headphone Cups */}
        <Path fill="#1A237E" d="M4 18 H 8 V 34 H 4 C 2 34, 2 18, 4 18 Z" />
        <Path
          fill="#1A237E"
          d="M44 18 H 40 V 34 H 44 C 46 34, 46 18, 44 18 Z"
        />

        {/* Closed Eyes (Listening intently) */}
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M14 24 Q 18 20, 22 24"
          fill="none"
        />
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M26 24 Q 30 20, 34 24"
          fill="none"
        />

        {/* Small Smile */}
        <Path
          stroke="#BF360C"
          strokeWidth="2.5"
          strokeLinecap="round"
          d="M22 33 Q 24 35, 26 33"
          fill="none"
        />
      </G>
    </Svg>
  );
};
export default ListenerFace;
