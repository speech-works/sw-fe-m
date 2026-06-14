import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Circle, Ellipse, SvgIconProps, Float } from "./faceKit";
const GhostFace = (props: SvgIconProps) => (
  <FaceShell bg="#ECEFF1" {...props}><Head><Float dur={3500}>
    <Plate c="#FFFFFF" />
    <Path d="M4 36 Q12 44 20 36 Q28 44 36 36 Q44 44 48 36" fill="#FFFFFF" mask="url(#circ)" />
    <Blink><Eye x={16} y={20} /><Eye x={32} y={20} /></Blink>
    <Circle cx="14" cy="26" r="2.5" fill="#FFCDD2" opacity="0.6" />
    <Circle cx="34" cy="26" r="2.5" fill="#FFCDD2" opacity="0.6" />
    <Ellipse cx="24" cy="28" rx="2" ry="3" fill="#90A4AE" />
  </Float></Head></FaceShell>
);
export default React.memo(GhostFace);
