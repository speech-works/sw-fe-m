import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Ellipse, Polygon, SvgIconProps, BeatScaleY } from "./faceKit";
const PigFace = (props: SvgIconProps) => (
  <FaceShell bg="#EEEEEE" {...props}><Head>
    <Polygon points="12,18 4,14 16,10" fill="#F48FB1" />
    <Polygon points="36,18 44,14 32,10" fill="#F48FB1" />
    <Plate c="#F8BBD0" />
    <Blink><Eye x={15} y={22} /><Eye x={33} y={22} /></Blink>
    <BeatScaleY to={0.82} cy={28} rest={3800} up={120} down={90}><Ellipse cx="24" cy="28" rx="8" ry="6" fill="#F06292" />
    <Ellipse cx="24" cy="28" rx="8" ry="6" fill="url(#sphere)" />
    <Ellipse cx="21" cy="28" rx="1.5" ry="2.5" fill="#C2185B" />
    <Ellipse cx="27" cy="28" rx="1.5" ry="2.5" fill="#C2185B" /></BeatScaleY>
  </Head></FaceShell>
);
export default React.memo(PigFace);
