import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Wind, Twinkle, Flicker, Shimmer, Spin, Sway, Flutter, Trek, Path, Circle, Ellipse, Polygon, Rect, G, Line, HEAD, SvgIconProps, Buzz, Hover, Scan, Float, Glow, Glitch, OscRotate, OscScaleY, BeatRotate, BeatScale, BeatScaleY, BeatTranslate } from "./faceKit";
const AlienFace = (props: SvgIconProps) => (
  <FaceShell bg="#E8F5E9" {...props}><Head>
    <OscRotate deg={5} cx={24} cy={8} dur={2400}><Path d="M16 8 Q14 0 18 -2" stroke="#66BB6A" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="18" cy="-2" r="3" fill="#FFEB3B" />
    <Path d="M32 8 Q34 0 30 -2" stroke="#66BB6A" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="30" cy="-2" r="3" fill="#FFEB3B" /></OscRotate>
    <Plate c="#A5D6A7" />
    <Scan amp={2} dur={3000}><Ellipse cx="16" cy="22" rx="5" ry="7" fill="#1B5E20" />
    <Ellipse cx="32" cy="22" rx="5" ry="7" fill="#1B5E20" />
    <Circle cx="16" cy="22" r="2" fill="#fff" opacity="0.8" />
    <Circle cx="32" cy="22" r="2" fill="#fff" opacity="0.8" /></Scan>
    <Path d="M20 32 Q24 35 28 32" stroke="#1B5E20" strokeWidth="2" fill="none" strokeLinecap="round" />
  </Head></FaceShell>
);
export default React.memo(AlienFace);
