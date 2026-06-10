import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const SeekerFace = (props: SvgIconProps) => (
  <FaceShell bg="url(#dusk)" {...props}>
    <Pan dur={20000}>
      <Path d="M0 30 Q 12 20 24 30 Q 36 20 48 30 Q 60 20 72 30 Q 84 20 96 30 L 96 48 L 0 48 Z" fill="#283593" opacity="0.8" />
      <Path d="M-24 35 Q -12 25 0 35 Q 12 25 24 35 Q 36 25 48 35 Q 60 25 72 35 L 72 48 L -24 48 Z" fill="#1A237E" opacity="0.9" />
    </Pan>
    <Twinkle cx={12} cy={7} dur={3000}>
      <Polygon points="12,4 12.5,7 15,7.5 12.5,8 12,11 11.5,8 9,7.5 11.5,7" fill="#FFF" />
    </Twinkle>
    <G transform="translate(32 10) scale(0.6)">
      <Sway cx={12} cy={0}>
        <Line x1="12" y1="0" x2="12" y2="10" stroke="#1A237E" strokeWidth="2" />
        <Rect x="8" y="10" width="8" height="12" rx="2" fill="#212121" />
        <Flicker><Rect x="9" y="12" width="6" height="8" fill="#FFC107" /></Flicker>
        <Path d="M6 10 L 18 10 L 15 6 L 9 6 Z" fill="#111" />
      </Sway>
    </G>
    <Head><BeatRotate deg={-3} cx={24} cy={44} rest={4000}>
      <Path d="M22 6 Q24 2 26 6 Q25 4 24 8 Q23 4 22 6" stroke="#8D6E63" strokeWidth="1.5" fill="none" />
      <Ellipse cx="6" cy="24" rx="4" ry="2" fill="#A1887F" transform="rotate(-20 6 24)" />
      <Ellipse cx="42" cy="24" rx="4" ry="2" fill="#A1887F" transform="rotate(20 42 24)" />
      <Plate c="#D4A373" />
      <Ellipse cx="24" cy="34" rx="11" ry="8" fill="#FFE0B2" />
      <Ellipse cx="19" cy="30" rx="1.5" ry="1" fill="#A1887F" />
      <Ellipse cx="29" cy="30" rx="1.5" ry="1" fill="#A1887F" />
      <Path d="M20 37 Q 24 39 26 36" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round" />
      <Blink><Eye x={16} y={22} /><Eye x={32} y={22} /></Blink>
      <Path d="M13 18 Q 16 16 19 19" stroke="#795548" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M35 18 Q 32 16 29 19" stroke="#795548" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </BeatRotate></Head>
  </FaceShell>
);
export default React.memo(SeekerFace);
