import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, SvgIconProps, OscRotate } from "./faceKit";
const VampireFace = (props: SvgIconProps) => (
  <FaceShell bg="#FCE4EC" {...props}><Head>
    <Plate c="#F8BBD0" />
    <Path d="M8 14 Q8 6 16 4 Q20 3 24 4 Q28 3 32 4 Q40 6 40 14 Q40 18 36 18 Q32 10 24 8 Q16 10 12 18 Q8 18 8 14 Z" fill="#212121" mask="url(#head)" />
    <Blink><Eye x={17} y={22} /><Eye x={31} y={22} /></Blink>
    <Path d="M18 30 Q24 33 30 30" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Path d="M20 30 L21 34 L22 30 Z" fill="#FFF" />
    <Path d="M26 30 L27 34 L28 30 Z" fill="#FFF" />
    <OscRotate deg={2} cx={24} cy={34} dur={3200}><Path d="M8 34 Q16 38 24 36 Q32 38 40 34 L40 48 L8 48 Z" fill="#B71C1C" mask="url(#head)" />
    <Path d="M8 34 Q16 38 24 36 Q32 38 40 34" fill="url(#volume)" mask="url(#head)" />
    <Path d="M12 34 L12 42 M16 35 L16 44 M20 36 L20 46 M24 36 L24 48 M28 36 L28 46 M32 35 L32 44 M36 34 L36 42" stroke="#880E4F" strokeWidth="1" opacity="0.3" mask="url(#head)" /></OscRotate>
  </Head></FaceShell>
);
export default React.memo(VampireFace);
