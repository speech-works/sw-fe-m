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
} from "react-native-svg";

const IceSportFace = ({
  size = 48,
  ...props
}: SvgProps & { size?: number | string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
    <Defs>
      <Filter
        id="goggle_shadow"
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
        <FeGaussianBlur stdDeviation={1.2} />
        <FeComposite in2="hardAlpha" operator="out" />
        <FeColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <FeBlend in2="BackgroundImageFix" result="effect1" />
        <FeBlend in="SourceGraphic" in2="effect1" result="shape" />
      </Filter>
      <Mask id="goggle_mask" x="0" y="0" width="48" height="48">
        <Circle cx="24" cy="24" r="24" fill="#fff" />
      </Mask>
    </Defs>

    <G mask="url(#goggle_mask)">
      <Circle cx="24" cy="24" r="24" fill="#0277BD" />
      <G id="MountainScenery">
        <Path
          d="M0 48 L0 28 L8 18 L16 24 L24 12 L32 20 L40 8 L46 16 L48 14 L48 48 Z"
          fill="#B0BEC5"
        />
        <Path d="M8 18 L5 22 L11 22 Z" fill="#FFFFFF" />
        <Path d="M24 12 L21 16 L27 16 Z" fill="#FFFFFF" />
        <Path d="M40 8 L37 12 L43 12 Z" fill="#FFFFFF" />
        <Path d="M46 16 L44 14 L48 14 L48 18 Z" fill="#FFFFFF" />
        <G transform="translate(24, 12)">
          <Path
            d="M0 0 L0 -5"
            stroke="#546E7A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Path d="M0 -5 L5 -3 L0 -1 Z" fill="#4CAF50" />
        </G>
      </G>

      <G id="PilotFace" transform="translate(0, 10)">
        <G filter="url(#goggle_shadow)">
          <Path
            fill="#FFD4B8"
            d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
          />
        </G>
        <G id="Goggles-Racing">
          <Path
            d="M6 21 C 10 17, 18 16, 24 16 C 30 16, 38 17, 42 21"
            stroke="#212121"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Path
            d="M10 19 L38 19"
            stroke="#FF3D00"
            strokeWidth="1.5"
            fill="none"
          />
          <Circle
            cx="16.5"
            cy="24"
            r="7"
            fill="#FFEB3B"
            stroke="#212121"
            strokeWidth="2.5"
          />
          <Circle
            cx="31.5"
            cy="24"
            r="7"
            fill="#FFEB3B"
            stroke="#212121"
            strokeWidth="2.5"
          />
          <Path
            d="M22.5 24 L 25.5 24"
            stroke="#212121"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M12 21 L 18 21"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.8"
          />
          <Path
            d="M27 21 L 33 21"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.8"
          />
          <Circle cx="16.5" cy="24" r="2" fill="#000000" />
          <Circle cx="31.5" cy="24" r="2" fill="#000000" />
        </G>
        <Path
          d="M18 35 Q24 38, 30 35"
          stroke="#3E2723"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </G>
    </G>
  </Svg>
);
export default IceSportFace;
