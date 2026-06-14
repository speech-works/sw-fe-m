import React from "react";
import { FaceShell, Head, Blink, Plate, Path, Circle, Ellipse, Rect, SvgIconProps, Float } from "./faceKit";
const AstronautFace = (props: SvgIconProps) => (
  <FaceShell bg="#1A237E" {...props}><Head><Float dur={4500}>
    <Circle cx="6" cy="6" r="1.5" fill="#FFF" opacity="0.6" />
    <Circle cx="14" cy="4" r="1" fill="#FFF" opacity="0.5" />
    <Circle cx="40" cy="8" r="1.5" fill="#FFF" opacity="0.7" />
    <Circle cx="34" cy="3" r="1" fill="#FFF" opacity="0.4" />
    <Circle cx="44" cy="16" r="1" fill="#FFF" opacity="0.5" />
    <Circle cx="4" cy="18" r="1" fill="#FFF" opacity="0.6" />
    <Plate c="#ECEFF1" />
    <Rect x="10" y="16" width="28" height="16" rx="8" fill="#37474F" />
    <Rect x="12" y="18" width="24" height="12" rx="6" fill="#0D47A1" />
    <Rect x="13" y="19" width="22" height="10" rx="5" fill="#1565C0" opacity="0.7" />
    <Path d="M14 20 Q20 22 24 20" stroke="#FFF" strokeWidth="1" fill="none" opacity="0.4" />
    <Circle cx="18" cy="24" r="1" fill="#FFF" opacity="0.3" />
    <Circle cx="30" cy="22" r="1.5" fill="#FFF" opacity="0.2" />
    <Blink>
      <Ellipse cx="18" cy="24" rx="2" ry="2.5" fill="#FFF" opacity="0.9" />
      <Circle cx="18" cy="24" r="1" fill="#191A1F" />
      <Ellipse cx="30" cy="24" rx="2" ry="2.5" fill="#FFF" opacity="0.9" />
      <Circle cx="30" cy="24" r="1" fill="#191A1F" />
    </Blink>
    <Path d="M20 30 Q24 32 28 30" stroke="#78909C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </Float></Head></FaceShell>
);
export default React.memo(AstronautFace);
