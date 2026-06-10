import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const LionFace = (props: SvgIconProps) => (
  <FaceShell bg="#FFF59D" {...props}><Head><BeatRotate deg={-5} cx={24} cy={42} rest={5000}>
    <Circle cx="12" cy="12" r="8" fill="#5D4037" /><Circle cx="24" cy="8" r="9" fill="#5D4037" />
    <Circle cx="36" cy="12" r="8" fill="#5D4037" /><Circle cx="42" cy="24" r="8" fill="#5D4037" />
    <Circle cx="36" cy="36" r="8" fill="#5D4037" /><Circle cx="24" cy="40" r="9" fill="#5D4037" />
    <Circle cx="12" cy="36" r="8" fill="#5D4037" /><Circle cx="6" cy="24" r="8" fill="#5D4037" />
    <Plate c="#FFB300" />
    <Blink><Eye x={15} y={22} /><Eye x={33} y={22} /></Blink>
    <Ellipse cx="24" cy="30" rx="6" ry="6" fill="#FFE082" />
    <Ellipse cx="24" cy="30" rx="6" ry="6" fill="url(#volume)" />
    <Polygon points="21,28 27,28 24,31" fill="#3E2723" />
    <Path d="M21 32 Q24 35 24 31 Q24 35 27 32" stroke="#3E2723" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </BeatRotate></Head></FaceShell>
);
export default React.memo(LionFace);
