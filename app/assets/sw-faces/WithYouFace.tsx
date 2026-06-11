import React from "react";
import { FaceShell, Heartbeat, SvgIconProps, Path, G } from "./faceKit";

const heartPath = "M 24 14 C 24 2, 6 2, 6 18 C 6 30, 24 40, 24 42 C 24 40, 42 30, 42 18 C 42 2, 24 2, 24 14 Z";

const WithYouFace = (props: SvgIconProps) => (
  <FaceShell bg="#B2DFDB" {...props}>
    <Heartbeat cx={24} cy={24}>
      <G transform="translate(0, -1)">
        {/* Deep, soft Drop Shadow */}
        <Path d={heartPath} fill="#000" opacity="0.25" transform="translate(0 4)" />
        
        {/* Plump Heart Base (Deep Red/Pink) */}
        <Path d={heartPath} fill="#E91E63" />
        
        {/* Pixar Volume / Sphere mask to make it 3D */}
        <Path d={heartPath} fill="url(#sphere)" />
        
        {/* Heavy High-gloss shine (soft left curve) */}
        <Path d="M 11 18 C 11 10, 18 5, 22 5" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <Path d="M 9 24 C 9 26, 12 32, 16 36" fill="none" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </G>
    </Heartbeat>
  </FaceShell>
);

export default React.memo(WithYouFace);
