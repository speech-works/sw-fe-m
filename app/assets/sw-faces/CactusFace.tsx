import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const CactusFace = (props: SvgIconProps) => (
  <FaceShell bg="#FFB74D" {...props}><Head><Sway cx={24} cy={46}>
    <Plate c="#81C784" />
    <Path d="M16 10 V48 M24 10 V48 M32 10 V48" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none" mask="url(#head)" />
    <BeatScale to={1.15} cx={14} cy={12} rest={4200}><Circle cx="12" cy="12" r="5" fill="#E91E63" /><Circle cx="16" cy="10" r="5" fill="#E91E63" />
    <Circle cx="14" cy="14" r="5" fill="#E91E63" /><Circle cx="14" cy="12" r="3" fill="#FCE4EC" /></BeatScale>
    <Blink><Eye x={16.8} y={25} /><Eye x={31.2} y={25} /></Blink>
    <Circle cx="24" cy="32" r="2.5" fill="#1B5E20" />
  </Sway></Head></FaceShell>
);
export default React.memo(CactusFace);
