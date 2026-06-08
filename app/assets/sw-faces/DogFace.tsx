import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const DogFace = (props: SvgIconProps) => (
  <FaceShell bg="#EFEBE9" {...props}><Head><BeatRotate deg={6} cx={24} cy={40} rest={3000}>
    <Ellipse cx="6" cy="24" rx="6" ry="12" fill="#8D6E63" transform="rotate(-10 6 24)" />
    <Ellipse cx="42" cy="24" rx="6" ry="12" fill="#8D6E63" transform="rotate(10 42 24)" />
    <Plate c="#D7CCC8" />
    <Ellipse cx="24" cy="26" rx="7" ry="5" fill="#5D4037" />
    <Circle cx="22" cy="25" r="1.5" fill="#fff" opacity="0.6" />
    <Blink><Eye x={16} y={20} /><Eye x={32} y={20} /></Blink>
    <Path d="M20 32 Q24 36 28 32" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round" />
    <OscScaleY cy={32} from={1} to={1.4} dur={400}><Path d="M28 32 L30 36 L26 36 Z" fill="#F48FB1" /></OscScaleY>
  </BeatRotate></Head></FaceShell>
);
export default React.memo(DogFace);
