import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Polygon, Line, SvgIconProps, OscRotate } from "./faceKit";
const CatFace = (props: SvgIconProps) => (
  <FaceShell bg="#FFF3E0" {...props}><Head>
    <Polygon points="8,16 4,4 18,10" fill="#FFB74D" />
    <Polygon points="40,16 44,4 30,10" fill="#FFB74D" />
    <Polygon points="10,14 6,6 16,11" fill="#FFCC80" />
    <Polygon points="38,14 42,6 32,11" fill="#FFCC80" />
    <Plate c="#FFCC80" />
    <Blink><Eye x={16} y={22} /><Eye x={32} y={22} /></Blink>
    <Polygon points="22,28 26,28 24,31" fill="#F48FB1" />
    <Path d="M24 31 L24 33 M24 33 Q20 36 18 34 M24 33 Q28 36 30 34" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <OscRotate deg={2} cx={24} cy={27} dur={2200}><Line x1="8" y1="26" x2="2" y2="24" stroke="#5D4037" strokeWidth="1" opacity="0.5" />
    <Line x1="8" y1="28" x2="2" y2="30" stroke="#5D4037" strokeWidth="1" opacity="0.5" />
    <Line x1="40" y1="26" x2="46" y2="24" stroke="#5D4037" strokeWidth="1" opacity="0.5" />
    <Line x1="40" y1="28" x2="46" y2="30" stroke="#5D4037" strokeWidth="1" opacity="0.5" /></OscRotate>
  </Head></FaceShell>
);
export default React.memo(CatFace);
