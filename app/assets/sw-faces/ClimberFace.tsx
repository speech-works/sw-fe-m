import React from "react";
import { FaceShell, Head, Blink, Plate, Path, Circle, Ellipse, SvgIconProps, BeatRotate } from "./faceKit";
const ClimberFace = (props: SvgIconProps) => (
  <FaceShell bg="#FFCCBC" {...props}><Head><BeatRotate deg={4} cx={24} cy={42} rest={3500}>
    <Plate c="#FFAB91" />
    <Path d="M6 18 Q6 6 24 4 Q42 6 42 18 L42 22 Q24 20 6 22 Z" fill="#F44336" mask="url(#head)" />
    <Path d="M6 18 Q6 6 24 4 Q42 6 42 18 L42 22 Q24 20 6 22 Z" fill="url(#volume)" mask="url(#head)" />
    <Path d="M6 22 Q24 20 42 22 L42 26 Q24 24 6 26 Z" fill="#D32F2F" mask="url(#head)" />
    <Path d="M6 22 Q24 20 42 22 L42 26 Q24 24 6 26 Z" fill="url(#volume)" mask="url(#head)" />
    <Path d="M10 10 L10 20 M14 8 L14 21 M18 7 L18 22 M22 6 L22 22 M26 6 L26 22 M30 7 L30 21 M34 8 L34 20 M38 10 L38 20" stroke="#B71C1C" strokeWidth="0.6" opacity="0.4" />
    <Path d="M6 20 Q24 16 42 20 L42 28 Q24 24 6 28 Z" fill="#37474F" mask="url(#head)" />
    <Path d="M6 20 Q24 16 42 20 L42 28 Q24 24 6 28 Z" fill="url(#volume)" mask="url(#head)" />
    <Ellipse cx="17" cy="24" rx="7" ry="5" fill="#263238" />
    <Ellipse cx="31" cy="24" rx="7" ry="5" fill="#263238" />
    <Ellipse cx="17" cy="24" rx="6" ry="4" fill="#4FC3F7" opacity="0.7" />
    <Ellipse cx="31" cy="24" rx="6" ry="4" fill="#4FC3F7" opacity="0.7" />
    <Ellipse cx="17" cy="24" rx="6" ry="4" fill="url(#volume)" />
    <Ellipse cx="31" cy="24" rx="6" ry="4" fill="url(#volume)" />
    <Path d="M24 22 L24 26" stroke="#37474F" strokeWidth="2" />
    <Path d="M24 20 L24 28" stroke="#37474F" strokeWidth="1" />
    <Blink>
      <Circle cx="17" cy="24" r="1.5" fill="#191A1F" />
      <Circle cx="16.5" cy="23.5" r="0.5" fill="#fff" />
      <Circle cx="31" cy="24" r="1.5" fill="#191A1F" />
      <Circle cx="30.5" cy="23.5" r="0.5" fill="#fff" />
    </Blink>
    <Path d="M20 34 Q24 37 28 34" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </BeatRotate></Head></FaceShell>
);
export default React.memo(ClimberFace);
