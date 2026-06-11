import React from "react";
import { FaceShell, FlameDance, Glow, SvgIconProps, Path, G, Circle, Ellipse } from "./faceKit";

const CourageFace = (props: SvgIconProps) => (
  <FaceShell bg="#1C1C1E" {...props}>
    {/* Dark background, gently glowing flame */}
    
    <G transform="translate(24, 24)">
      {/* Outer Glow */}
      <Glow cx={0} cy={0} from={0.25} to={0.55} sc0={0.8} sc1={1.1} dur={3000}>
        <Circle r={20} fill="#E64A19" opacity={0.3} />
        <Circle r={14} fill="#FF9800" opacity={0.4} />
      </Glow>
      
      <FlameDance>
        {/* Deep Red Outer Layer */}
        <Path d="M 0 -16 C 12 -4, 14 6, 9 13 C 4 18, -4 18, -9 13 C -14 6, -12 -4, 0 -16 Z" fill="#D84315" />
        <Path d="M 0 -16 C 12 -4, 14 6, 9 13 C 4 18, -4 18, -9 13 C -14 6, -12 -4, 0 -16 Z" fill="url(#volume)" />
        
        {/* Mid Orange Layer */}
        <Path d="M 0 -10 C 9 0, 10 8, 6 13 C 3 16, -3 16, -6 13 C -10 8, -9 0, 0 -10 Z" fill="#FF7043" />
        
        {/* Yellow Core */}
        <Path d="M 0 -4 C 6 4, 7 9, 4 13 C 2 15, -2 15, -4 13 C -7 9, -6 4, 0 -4 Z" fill="#FFCA28" />
        
        {/* White Hot Center */}
        <Path d="M 0 3 C 3 7, 4 11, 2 13 C 1 14, -1 14, -2 13 C -4 11, -3 7, 0 3 Z" fill="#FFF9C4" />
      </FlameDance>
      
      {/* Wood/Ember Base */}
      <Path d="M -10 14 Q 0 12 10 14 Q 12 17 10 20 Q 0 17 -10 20 Q -12 17 -10 14 Z" fill="#4E342E" />
      <Path d="M -10 14 Q 0 12 10 14 Q 12 17 10 20 Q 0 17 -10 20 Q -12 17 -10 14 Z" fill="url(#volume)" />
    </G>
  </FaceShell>
);

export default React.memo(CourageFace);
