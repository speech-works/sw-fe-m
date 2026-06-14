import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Circle, Ellipse, Rect, SvgIconProps, Buzz, Hover } from "./faceKit";
const BeeFace = (props: SvgIconProps) => (
  <FaceShell bg="#90CAF9" {...props}><Head><Hover>
    <Buzz px={11} py={20}><Ellipse cx="6" cy="20" rx="5" ry="8" fill="#fff" opacity="0.8" transform="rotate(-20 6 20)" /></Buzz>
    <Buzz px={37} py={20}><Ellipse cx="42" cy="20" rx="5" ry="8" fill="#fff" opacity="0.8" transform="rotate(20 42 20)" /></Buzz>
    <Path d="M19 11 L15 3 M29 11 L33 3" stroke="#212121" strokeWidth="2" strokeLinecap="round" fill="none" />
    <Circle cx="15" cy="3" r="2" fill="#212121" /><Circle cx="33" cy="3" r="2" fill="#212121" />
    <Plate c="#FFCA28" />
    <Rect x="8" y="30" width="32" height="4" fill="#212121" mask="url(#head)" />
    <Rect x="8" y="38" width="32" height="4" fill="#212121" mask="url(#head)" />
    <Blink><Eye x={16.8} y={21} /><Eye x={31.2} y={21} /></Blink>
    <Path d="M19 26 Q24 29 29 26" stroke="#191A1F" strokeWidth="2" strokeLinecap="round" fill="none" />
  </Hover></Head></FaceShell>
);
export default React.memo(BeeFace);
