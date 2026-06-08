import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const CatalystFace = (props: SvgIconProps) => (
  <FaceShell bg="#311B92" {...props}>
    <Pan dur={30000}>
      <Path d="M0 30 Q 12 20 24 30 Q 36 20 48 30 Q 60 20 72 30 Q 84 20 96 30 L 96 48 L 0 48 Z" fill="#4527A0" opacity="0.8" />
      <Path d="M-24 36 Q -12 26 0 36 Q 12 26 24 36 Q 36 26 48 36 Q 60 26 72 36 L 72 48 L -24 48 Z" fill="#512DA8" opacity="0.9" />
    </Pan>
    <Shimmer dur={3000}><Ellipse cx="24" cy="44" rx="16" ry="4" fill="#00BCD4" opacity="0.8" /></Shimmer>
    <Pan dur={10000}><Path d="M 12 44 L 36 44" stroke="#B2EBF2" strokeWidth="0.5" strokeDasharray="2 4" /></Pan>
    <Path d="M -5 10 Q 10 20 0 30 Z" fill="#004D40" opacity="0.7" />
    <Path d="M 53 10 Q 38 20 48 30 Z" fill="#004D40" opacity="0.7" />
    <Twinkle cx={10} cy={8} dur={2000}><Circle cx="10" cy="8" r="1" fill="#FFF" /></Twinkle>
    <Twinkle cx={40} cy={12} dur={3000}><Circle cx="40" cy="12" r="1.5" fill="#FFF" /></Twinkle>
    <Glow cx={24} cy={26} from={0.15} to={0.45} sc0={0.9} sc1={1.15} dur={3000}><Circle cx="24" cy="26" r="16" fill="#B388FF" /></Glow>
    <Head>
      <Ellipse cx="6" cy="24" rx="4" ry="2" fill="#BDBDBD" transform="rotate(-20 6 24)" />
      <Ellipse cx="42" cy="24" rx="4" ry="2" fill="#BDBDBD" transform="rotate(20 42 24)" />
      <Plate c="#E0E0E0" />
      <Ellipse cx="24" cy="34" rx="11" ry="8" fill="#F5F5F5" />
      <Ellipse cx="19" cy="30" rx="1.5" ry="1" fill="#BDBDBD" />
      <Ellipse cx="29" cy="30" rx="1.5" ry="1" fill="#BDBDBD" />
      <Path d="M20 38 Q 24 40 28 38" fill="none" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M14 22 Q 17 21 20 22" fill="none" stroke="#191A1F" strokeWidth="2" strokeLinecap="round" />
      <Path d="M28 22 Q 31 21 34 22" fill="none" stroke="#191A1F" strokeWidth="2" strokeLinecap="round" />
      <Path d="M14 20 Q 17 18 20 20" fill="none" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M28 20 Q 31 18 34 20" fill="none" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" />
      <G transform="translate(8 16) scale(0.8)">
        <Circle cx="0" cy="-4" r="3" fill="#E91E63" />
        <Circle cx="4" cy="-1" r="3" fill="#E91E63" />
        <Circle cx="2" cy="3" r="3" fill="#E91E63" />
        <Circle cx="-2" cy="3" r="3" fill="#E91E63" />
        <Circle cx="-4" cy="-1" r="3" fill="#E91E63" />
        <Circle cx="0" cy="0" r="2" fill="#FFEB3B" />
      </G>
    </Head>
  </FaceShell>
);
export default React.memo(CatalystFace);
