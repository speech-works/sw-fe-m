import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Circle, Ellipse, Polygon, HEAD, SvgIconProps, OscRotate } from "./faceKit";
const FoxFace = (props: SvgIconProps) => (
  <FaceShell bg="#80CBC4" {...props}><Head>
    <OscRotate deg={4} cx={24} cy={13} dur={2600}><Polygon points="13,14 9,4 20,11" fill="#E65100" />
    <Polygon points="35,14 39,4 28,11" fill="#E65100" />
    <Polygon points="13,12 11,6 17,10" fill="#FAFAFA" />
    <Polygon points="35,12 37,6 31,10" fill="#FAFAFA" /></OscRotate>
    <Plate c="#FF9800" />
    <Circle cx="4" cy="32" r="14" fill="#FAFAFA" mask="url(#head)" />
    <Circle cx="44" cy="32" r="14" fill="#FAFAFA" mask="url(#head)" />
    <Path fill="url(#volume)" d={HEAD} />
    <Blink><Eye x={15} y={24} /><Eye x={33} y={24} /></Blink>
    <Ellipse cx="24" cy="30" rx="3.5" ry="2.5" fill="#191A1F" />
  </Head></FaceShell>
);
export default React.memo(FoxFace);
