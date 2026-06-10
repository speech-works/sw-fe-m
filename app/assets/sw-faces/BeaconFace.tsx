import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const BeaconFace = (props: SvgIconProps) => (
  <FaceShell bg="url(#sunrise)" {...props}>
    <Glow cx={24} cy={24} from={0.45} to={0.95} sc0={0.95} sc1={1.12} dur={2600}><Circle cx="24" cy="24" r="16" fill="#FFE082" /></Glow>
    <Spin cx={24} cy={24} dur={30000}>
      <Line x1="24" y1="0" x2="24" y2="48" stroke="#FFF9C4" strokeWidth="2" opacity="0.3" />
      <Line x1="0" y1="24" x2="48" y2="24" stroke="#FFF9C4" strokeWidth="2" opacity="0.3" />
    </Spin>
    <Pan dur={40000}>
      <Path d="M0 34 Q 12 24 24 34 Q 36 24 48 34 Q 60 24 72 34 Q 84 24 96 34 L 96 48 L 0 48 Z" fill="#FF8F00" opacity="0.9" />
      <Trek>
        <G opacity="0.8">
          <Path d="M 12 30 L 14 30 L 14 32 L 12 32 Z" fill="#D84315" />
          <Path d="M 13 29 Q 14 28 15 29 L 15 31 L 13 31 Z" fill="#D84315" />
          <Path d="M 6 31 L 8 31 L 8 33 L 6 33 Z" fill="#D84315" />
          <Path d="M 7 30 Q 8 29 9 30 L 9 32 L 7 32 Z" fill="#D84315" />
        </G>
      </Trek>
    </Pan>
    <Head><BeatRotate deg={3} cx={24} cy={44} rest={4500}>
      <Ellipse cx="6" cy="24" rx="4" ry="2" fill="#E6A15C" transform="rotate(-20 6 24)" />
      <Ellipse cx="42" cy="24" rx="4" ry="2" fill="#E6A15C" transform="rotate(20 42 24)" />
      <Plate c="#FFCC80" />
      <Ellipse cx="24" cy="34" rx="11" ry="8" fill="#FFE0B2" />
      <Ellipse cx="19" cy="30" rx="1.5" ry="1" fill="#D7CCC8" />
      <Ellipse cx="29" cy="30" rx="1.5" ry="1" fill="#D7CCC8" />
      <Path d="M18 38 Q 24 42 31 34" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M31 33 Q 32.5 34 31 36" fill="none" stroke="#A1887F" strokeWidth="1" strokeLinecap="round" />
      <Blink><Eye x={16} y={23} /><Eye x={32} y={23} /></Blink>
      <Path d="M12 21 Q 16 19 20 22" stroke="#8D6E63" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M36 18 Q 32 19 28 22" stroke="#8D6E63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M 4 41 Q 24 47 44 41 L 48 48 L 0 48 Z" fill="#C62828" />
      <Path d="M 4 41 Q 24 47 44 41 L 48 48 L 0 48 Z" fill="url(#volume)" />
      <Path d="M 12 43 Q 16 45 20 44" stroke="#B71C1C" strokeWidth="1" fill="none" />
      <Path d="M 36 43 Q 32 45 28 44" stroke="#B71C1C" strokeWidth="1" fill="none" />
      <Ellipse cx="24" cy="44" rx="2" ry="1.5" fill="#D32F2F" />
      <Path d="M 23 45 Q 21 48 19 48" stroke="#D32F2F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M 25 45 Q 27 48 29 48" stroke="#D32F2F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M 8 43 Q 24 48.5 40 43" stroke="#FFC107" strokeWidth="1" fill="none" strokeDasharray="1.5 2" />
      <Path d="M -6 12 Q 24 0 54 12 L 54 6 Q 24 -6 -6 6 Z" fill="#3E2723" />
      <Path d="M 5 10 C 5 -6 43 -6 43 10 Z" fill="#5D4037" />
      <Path d="M 5 10 C 5 -6 43 -6 43 10 Z" fill="url(#volume)" />
      <Path d="M 24 0 V 10" stroke="#3E2723" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M 12 3 Q 14 7 10 11" stroke="#3E2723" strokeWidth="1.5" fill="none" opacity="0.4" />
      <Path d="M 36 3 Q 34 7 38 11" stroke="#3E2723" strokeWidth="1.5" fill="none" opacity="0.4" />
      <Path d="M 4 8 Q 24 12 44 8 L 44 12 Q 24 16 4 12 Z" fill="#212121" />
      <Polygon points="24,10 24.8,11.5 26.5,11.5 25.2,12.8 25.5,14.5 24,13.5 22.5,14.5 22.8,12.8 21.5,11.5 23.2,11.5" fill="#FFC107" />
      <Path d="M -8 12 Q 24 24 56 12 Q 52 8 40 10 Q 24 16 8 10 Q 4 8 -8 12 Z" fill="#4E342E" />
      <Path d="M -8 12 Q 24 24 56 12 Q 52 8 40 10 Q 24 16 8 10 Q 4 8 -8 12 Z" fill="url(#volume)" />
    </BeatRotate></Head>
  </FaceShell>
);
export default React.memo(BeaconFace);
