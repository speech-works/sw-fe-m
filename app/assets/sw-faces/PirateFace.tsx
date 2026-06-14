import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Circle, Rect, SvgIconProps, OscRotate } from "./faceKit";
const PirateFace = (props: SvgIconProps) => (
  <FaceShell bg="#4DD0E1" {...props}><Head>
    <Plate c="#FFB74D" />
    <Path d="M8 32 L40 32 L40 48 L8 48 Z" fill="#000" opacity="0.15" mask="url(#head)" />
    <OscRotate deg={8} cx={9} cy={26} dur={1800}><Circle cx="9" cy="30" r="3.5" fill="none" stroke="#FFD54F" strokeWidth="2" /></OscRotate>
    <Path d="M8 18 Q24 22 40 18 L40 8 L8 8 Z" fill="#D32F2F" mask="url(#head)" />
    <Circle cx="8" cy="18" r="4" fill="#C62828" />
    <Path d="M8 18 L2 24 L6 26 Z" fill="#C62828" />
    <Path d="M8 18 Q24 22 40 18 L40 8 L8 8 Z" fill="url(#volume)" mask="url(#head)" />
    <Path d="M6 18 L42 28" stroke="#212121" strokeWidth="1.5" fill="none" />
    <Rect x="25" y="20" width="11" height="10" rx="4" fill="#212121" transform="rotate(-10 30 25)" />
    <Blink><Eye x={16.8} y={25} /></Blink>
    <Path d="M16 34 L26 32" stroke="#191A1F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </Head></FaceShell>
);
export default React.memo(PirateFace);
