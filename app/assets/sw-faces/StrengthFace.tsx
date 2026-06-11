import React from "react";
import { FaceShell, Float, TreeGrow, DayNightCycle, SvgIconProps, Path, G, Polygon, Ellipse, Circle } from "./faceKit";

const StrengthFace = (props: SvgIconProps) => (
  <FaceShell bg="transparent" {...props}>
    <DayNightCycle>
      <Float dur={6000}>
        <G transform="translate(24, 28)">
          
          {/* Grass Base */}
          <Ellipse cx={0} cy={14} rx={22} ry={5} fill="#8BC34A" />
        
        {/* === RIGHT PEAK (In back) === */}
        <Polygon points="2,14 10,14 10,-10" fill="#9E9E9E" />
        <Polygon points="10,14 22,14 10,-10" fill="#616161" />
        <Path d="M 10 -10 L 4 0 L 7 3 L 10 1 Z" fill="#FFFFFF" />
        <Path d="M 10 -10 L 10 1 L 14 6 L 19 -1 Z" fill="#90CAF9" />
        
        {/* === LEFT PEAK (In back) === */}
        <Polygon points="-22,14 -12,14 -12,-6" fill="#9E9E9E" />
        <Polygon points="-12,14 -2,14 -12,-6" fill="#616161" />
        <Path d="M -12 -6 L -19 3 L -15 6 L -12 4 Z" fill="#FFFFFF" />
        <Path d="M -12 -6 L -12 4 L -9 8 L -6 3 Z" fill="#90CAF9" />

        {/* === MAIN PEAK (In front) === */}
        <Polygon points="-16,16 0,16 0,-24" fill="#9E9E9E" />
        <Polygon points="0,16 16,16 0,-24" fill="#616161" />
        <Path d="M 0 -24 L -12 -2 L -9 3 L -5 1 L -2 6 L 0 3 Z" fill="#FFFFFF" />
        <Path d="M 0 -24 L 0 3 L 3 8 L 8 2 L 12 5 L 14 -2 Z" fill="#90CAF9" />

        {/* Shading Over Main Peak */}
        <Polygon points="-16,16 16,16 0,-24" fill="url(#volume)" />

        {/* === PINE TREES === */}
        {/* Far Left */}
        <TreeGrow originY={16} delay={0}><Polygon points="-18,16 -10,16 -14,-2" fill="#2E7D32" /></TreeGrow>
        {/* Mid Left */}
        <TreeGrow originY={18} delay={200}><Polygon points="-11,18 -3,18 -7,2" fill="#1B5E20" /></TreeGrow>
        {/* Right near main peak */}
        <TreeGrow originY={18} delay={400}><Polygon points="4,18 12,18 8,2" fill="#2E7D32" /></TreeGrow>
        {/* Far Right */}
        <TreeGrow originY={16} delay={600}><Polygon points="12,16 20,16 16,-2" fill="#1B5E20" /></TreeGrow>
      </G>
    </Float>
    </DayNightCycle>
  </FaceShell>
);

export default React.memo(StrengthFace);
