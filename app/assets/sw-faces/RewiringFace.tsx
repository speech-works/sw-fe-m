import * as React from "react-native";
import Svg, {
  Mask,
  Path,
  G,
  Defs,
  SvgProps,
  Path as SvgPath,
  Circle } from "react-native-svg";

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const RewiringFace = ({ size = 48, shouldAnimate, loop, repeatCount, ...props }: SvgIconProps) => {
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
        <Mask
          id="spiral_mask"
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

      <G mask="url(#spiral_mask)">
        {/* Background - Overwhelming Red (kept as original) */}
        <Path
          fill="#C62828"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Pale/Stressed White (kept as original) */}
        <G>
          <Path
            fill="#F5F5F5"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        {/* Eyes (Updated to Happy, Open, and Confident) */}
        <Circle cx="17" cy="24" r="3" fill="#212121" />
        <Circle cx="31" cy="24" r="3" fill="#212121" />
        {/* Glints for sparkle in happy eyes */}
        <Circle cx="18.2" cy="22.8" r="0.8" fill="#FFFFFF" />
        <Circle cx="32.2" cy="22.8" r="0.8" fill="#FFFFFF" />
        {/* Mouth (Updated to a Broad, Confident Smile) */}
        <SvgPath
          stroke="#424242"
          strokeWidth="3"
          strokeLinecap="round"
          d="M18 32 Q 24 37, 30 32"
          fill="none"
        />
        {/* Worry Prop (Giant spiral on forehead - kept as original) */}
        <SvgPath
          stroke="#D32F2F"
          strokeWidth="2.5"
          fill="none"
          d="M24 10 A 10 10 0 1 1 24 10.1 M24 15 A 5 5 0 1 1 24 15.1"
        />
      </G>
    </Svg>
  );
};
export default RewiringFace;
