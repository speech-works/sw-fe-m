import React from "react";
import { FaceShell, FlameDance, Glow, SvgIconProps, Path, G, Circle, Ellipse } from "./faceKit";

const CourageFace = (props: SvgIconProps) => (
  <FaceShell bg="#1C1C1E" {...props}>
    {/* Dark background, gently glowing flame */}
    
    <G transform="translate(24, 24)">
      {/* Outer Glow */}
      <Glow cx={0} cy={0} from={0.2} to={0.5} sc0={0.9} sc1={1.1} dur={3000}>
        <Circle r={18} fill="#FF9800" opacity={0.3} />
        <Circle r={12} fill="#FFC107" opacity={0.4} />
      </Glow>
      
      <FlameDance>
        {/* Flame Base (Orange) */}
        <Path d="M 0 -14 C 10 -4, 12 6, 8 12 C 4 18, -4 18, -8 12 C -12 6, -10 -4, 0 -14 Z" fill="#FF5722" />
        <Path d="M 0 -14 C 10 -4, 12 6, 8 12 C 4 18, -4 18, -8 12 C -12 6, -10 -4, 0 -14 Z" fill="url(#volume)" />
        
        {/* Flame Core (Yellow) */}
        <Path d="M 0 -6 C 6 2, 7 8, 4 12 C 1 16, -1 16, -4 12 C -7 8, -6 2, 0 -6 Z" fill="#FFCA28" />
        
        {/* Inner Bright Center (White/Light Yellow) */}
        <Ellipse cx={0} cy={9} rx={3} ry={4} fill="#FFF9C4" />
      </FlameDance>
      
      {/* Wood/Ember Base */}
      <Path d="M -8 16 Q 0 14 8 16 Q 10 18 8 20 Q 0 18 -8 20 Q -10 18 -8 16 Z" fill="#4E342E" />
      <Path d="M -8 16 Q 0 14 8 16 Q 10 18 8 20 Q 0 18 -8 20 Q -10 18 -8 16 Z" fill="url(#volume)" />
    </G>
  </FaceShell>
);

export default React.memo(CourageFace);
