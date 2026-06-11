import React from "react";
import { FaceShell, Heartbeat, SvgIconProps, Path, G } from "./faceKit";

const WithYouFace = (props: SvgIconProps) => (
  <FaceShell bg="#B2DFDB" {...props}>
    <Heartbeat cx={24} cy={24}>
      <G transform="translate(0, 0)">
        {/* Drop Shadow */}
        <Path d="M24 42 C24 42 6 28 6 16 C6 9 11 4 18 4 C21 4 23 6 24 8 C25 6 27 4 30 4 C37 4 42 9 42 16 C42 28 24 42 24 42 Z" fill="#000" opacity="0.15" transform="translate(0 3)" />
        
        {/* Bulky Heart Base */}
        <Path d="M24 42 C24 42 6 28 6 16 C6 9 11 4 18 4 C21 4 23 6 24 8 C25 6 27 4 30 4 C37 4 42 9 42 16 C42 28 24 42 24 42 Z" fill="#E91E63" />
        
        {/* Pixar Volume / Sphere mask */}
        <Path d="M24 42 C24 42 6 28 6 16 C6 9 11 4 18 4 C21 4 23 6 24 8 C25 6 27 4 30 4 C37 4 42 9 42 16 C42 28 24 42 24 42 Z" fill="url(#sphere)" />
        
        {/* High-gloss shine (soft left curve) */}
        <Path d="M10 16 C10 12 14 8 18 8" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      </G>
    </Heartbeat>
  </FaceShell>
);

export default React.memo(WithYouFace);
