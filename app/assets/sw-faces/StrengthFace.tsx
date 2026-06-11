import React from "react";
import { FaceShell, RepLift, SvgIconProps, Rect, G, Ellipse, Path } from "./faceKit";

const StrengthFace = (props: SvgIconProps) => (
  <FaceShell bg="#FF5722" {...props}>
    <G transform="translate(0, -2)">
      {/* Static Ground Shadow */}
      <G opacity="0.25" transform="translate(0, 40)">
        <Ellipse cx={24} cy={0} rx={18} ry={4} fill="#000" />
      </G>

      <RepLift>
        <G transform="translate(0, 6)">
          {/* Main Handle */}
          <Rect x={14} y={22} width={20} height={4} fill="#90A4AE" />
          <Rect x={14} y={22} width={20} height={4} fill="url(#volume)" />
          
          {/* Left Weights */}
          <G transform="translate(0, 0)">
            {/* Outer plate shadow */}
            <Rect x={4} y={16} width={4} height={16} rx={2} fill="#000" opacity="0.2" transform="translate(2 2)" />
            {/* Outer plate */}
            <Rect x={4} y={16} width={4} height={16} rx={1.5} fill="#37474F" />
            <Rect x={4} y={16} width={4} height={16} rx={1.5} fill="url(#volume)" />
            
            {/* Inner plate shadow */}
            <Rect x={8} y={12} width={6} height={24} rx={2} fill="#000" opacity="0.2" transform="translate(2 2)" />
            {/* Inner plate */}
            <Rect x={8} y={12} width={6} height={24} rx={2} fill="#263238" />
            <Rect x={8} y={12} width={6} height={24} rx={2} fill="url(#volume)" />
            
            {/* Highlights */}
            <Path d="M 6 18 L 6 30" stroke="#FFF" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <Path d="M 10 14 L 10 34" stroke="#FFF" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          </G>

          {/* Right Weights */}
          <G transform="translate(0, 0)">
            {/* Inner plate shadow */}
            <Rect x={34} y={12} width={6} height={24} rx={2} fill="#000" opacity="0.2" transform="translate(2 2)" />
            {/* Inner plate */}
            <Rect x={34} y={12} width={6} height={24} rx={2} fill="#263238" />
            <Rect x={34} y={12} width={6} height={24} rx={2} fill="url(#volume)" />
            
            {/* Outer plate shadow */}
            <Rect x={40} y={16} width={4} height={16} rx={2} fill="#000" opacity="0.2" transform="translate(2 2)" />
            {/* Outer plate */}
            <Rect x={40} y={16} width={4} height={16} rx={1.5} fill="#37474F" />
            <Rect x={40} y={16} width={4} height={16} rx={1.5} fill="url(#volume)" />

            {/* Highlights */}
            <Path d="M 36 14 L 36 34" stroke="#FFF" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <Path d="M 42 18 L 42 30" stroke="#FFF" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          </G>
        </G>
      </RepLift>
    </G>
  </FaceShell>
);

export default React.memo(StrengthFace);
