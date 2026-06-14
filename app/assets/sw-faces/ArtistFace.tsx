import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Path, Circle, Ellipse, G, SvgIconProps, OscRotate } from "./faceKit";
const ArtistFace = (props: SvgIconProps) => (
  <FaceShell bg="#CE93D8" {...props}><Head>
    <Plate c="#FFCCBC" />
    <OscRotate deg={3} cx={24} cy={12} dur={3000}><G transform="translate(0 -2)">
      <Ellipse cx="28" cy="12" rx="14" ry="6" fill="#E53935" transform="rotate(15 28 12)" />
      <Ellipse cx="28" cy="12" rx="14" ry="6" fill="url(#volume)" transform="rotate(15 28 12)" />
      <Circle cx="28" cy="5" r="2" fill="#E53935" />
    </G></OscRotate>
    <Circle cx="12" cy="28" r="3" fill="#29B6F6" opacity="0.8" />
    <Circle cx="15" cy="32" r="1.5" fill="#29B6F6" opacity="0.8" />
    <Circle cx="36" cy="18" r="2.5" fill="#FFEB3B" opacity="0.8" />
    <Blink><Eye x={16.8} y={24} /><Eye x={31.2} y={24} /></Blink>
    <Path d="M16 32 Q24 28 32 32 Q36 34 34 30" stroke="#3E2723" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </Head></FaceShell>
);
export default React.memo(ArtistFace);
