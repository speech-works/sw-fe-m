import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const PandaFace = (props: SvgIconProps) => (
  <FaceShell bg="#FAFAFA" {...props}><Head>
    <Circle cx="8" cy="12" r="7" fill="#212121" />
    <Circle cx="40" cy="12" r="7" fill="#212121" />
    <Plate c="#FFFFFF" />
    <Ellipse cx="16" cy="22" rx="6" ry="5" fill="#212121" transform="rotate(-10 16 22)" />
    <Ellipse cx="32" cy="22" rx="6" ry="5" fill="#212121" transform="rotate(10 32 22)" />
    <Blink><Eye x={16} y={22} /><Eye x={32} y={22} /></Blink>
    <Ellipse cx="24" cy="28" rx="4" ry="3" fill="#212121" />
    <Circle cx="23" cy="27" r="1" fill="#fff" opacity="0.5" />
    <OscScaleY cy={32} from={1} to={1.5} dur={420}><Path d="M20 32 Q24 35 28 32" stroke="#212121" strokeWidth="1.5" fill="none" strokeLinecap="round" /></OscScaleY>
  </Head></FaceShell>
);
export default React.memo(PandaFace);
