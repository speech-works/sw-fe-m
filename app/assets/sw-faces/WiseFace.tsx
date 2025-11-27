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
  Path as SvgPath,
  Pattern,
} from "react-native-svg";

interface SvgIconProps extends SvgProps {
  size?: number | string;
}

const WiseFace_RoadCaptain = ({ size = 48, ...props }: SvgIconProps) => {
  // New bandana path: Wider at the start/end to show thickness wrapped around head, snug bottom curve.
  const bandanaPath = "M 4 22 C 4 10, 44 10, 44 22 Q 24 15, 4 22 Z";
  // New knot path: More defined knot shape on the right side with a small tail cue.
  const knotPath = "M 43 20 C 47 17, 49 25, 43 26 Q 46 23, 47 19 Z";

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
      <Defs>
        {/* Pattern for the black dots */}
        <Pattern
          id="bandana_dots_v2"
          x="0"
          y="0"
          width="3.5"
          height="3.5"
          patternUnits="userSpaceOnUse"
        >
          <Circle cx="1.75" cy="1.75" r="0.7" fill="#212121" opacity="0.6" />
        </Pattern>

        <Filter
          id="biker_shadow"
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
          id="biker_mask"
          x="0"
          y="0"
          width="48"
          height="48"
          maskUnits="userSpaceOnUse"
        >
          <SvgPath
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </Mask>
      </Defs>
      <G mask="url(#biker_mask)">
        {/* Background: Asphalt Grey */}
        <Path
          fill="#424242"
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />
        {/* Face Shape - Slightly weathered tan */}
        <G filter="url(#biker_shadow)">
          <Path
            fill="#FFCC80"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>

        {/* --- Bandana Section --- */}
        <G>
          {/* Solid Red Base for Bandana and Knot */}
          <Path d={bandanaPath} fill="#C62828" />
          <Path d={knotPath} fill="#C62828" />

          {/* Black Dots Pattern Overlay */}
          <Path d={bandanaPath} fill="url(#bandana_dots_v2)" />
          <Path d={knotPath} fill="url(#bandana_dots_v2)" />

          {/* Fold lines for definition and tension */}
          <Path
            d="M 5 21 Q 24 14, 43 21"
            stroke="#B71C1C"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Knot detail line */}
          <Path
            d="M43 22 Q 45 20, 44 25"
            stroke="#B71C1C"
            strokeWidth="1.5"
            fill="none"
          />
        </G>

        {/* Eyes (Squinting slightly) */}
        <Circle cx="16.8" cy="28" r="1.5" fill="#212121" />
        <Circle cx="31.2" cy="28" r="1.5" fill="#212121" />
        {/* Squint creases moved down to accommodate thicker bandana */}
        <Path d="M13 26 L 20 26" stroke="#212121" strokeWidth="1" />
        <Path d="M28 26 L 35 26" stroke="#212121" strokeWidth="1" />

        {/* Prop: Epic Handlebar Mustache (Grey/White) */}
        <SvgPath
          d="M24 35 Q 18 35, 14 31 Q 10 27, 14 37 Q 18 41, 24 37 Q 30 41, 34 37 Q 38 27, 34 31 Q 30 35, 24 35 Z"
          fill="#E0E0E0"
          stroke="#9E9E9E"
          strokeWidth="0.5"
        />
      </G>
    </Svg>
  );
};
export default WiseFace_RoadCaptain;
