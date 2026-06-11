import React from "react";
import { FaceShell, ShineSweep, SvgIconProps, Path, G, Mask, Circle, Rect } from "./faceKit";

// Slightly curved top edge, matches the classic heater shield from the image
const shieldPath = "M 12 8 Q 24 5 36 8 L 38 16 C 38 34, 24 44, 24 44 C 24 44, 10 34, 10 16 Z";

const Sword = () => (
  <G>
    {/* Blade Drop Shadow */}
    <Path d="M 22 17 L 22 40 L 24 46 L 26 40 L 26 17 Z" fill="#000" opacity="0.35" transform="translate(1 2)" />
    {/* Handle/Guard Shadow */}
    <Rect x={12} y={15} width={24} height={3} rx={1.5} fill="#000" opacity="0.35" transform="translate(1 2)" />
    <Circle cx={24} cy={5} r={3.5} fill="#000" opacity="0.35" transform="translate(1 2)" />

    {/* Blade (Steel) */}
    <Path d="M 22 17 L 22 40 L 24 46 L 26 40 L 26 17 Z" fill="#CFD8DC" />
    <Path d="M 24 17 L 26 17 L 26 40 L 24 46 Z" fill="#90A4AE" /> 
    <Path d="M 24 17 L 24 44" stroke="#FFF" strokeWidth="1" opacity="0.6" />
    
    {/* Crossguard */}
    <Rect x={12} y={15} width={24} height={3} rx={1.5} fill="#B0BEC5" />
    <Rect x={12} y={15} width={24} height={3} rx={1.5} fill="url(#volume)" />
    
    {/* Handle (Black leather with ribs) */}
    <Rect x={22} y={7} width={4} height={9} fill="#212121" />
    <Path d="M 22 9 L 26 9 M 22 11 L 26 11 M 22 13 L 26 13 M 22 15 L 26 15" stroke="#000" strokeWidth="1.5" />
    
    {/* Pommel */}
    <Circle cx={24} cy={5} r={3.5} fill="#B0BEC5" />
    <Circle cx={24} cy={5} r={3.5} fill="url(#sphere)" />
  </G>
);

const CourageFace = (props: SvgIconProps) => (
  <FaceShell bg="#B71C1C" {...props}>
    
    <G transform="translate(0, 0)">
      
      {/* Top Left Hilt -> Bottom Right Blade */}
      <G transform="rotate(-35, 24, 24)">
        <Sword />
      </G>

      {/* Top Right Hilt -> Bottom Left Blade */}
      <G transform="rotate(35, 24, 24)">
        <Sword />
      </G>

      {/* The Shield (Scaled down to 75% so the massive swords are visible) */}
      <G transform="translate(6, 6) scale(0.75)">
        
        {/* Shield Drop Shadow (casts onto swords and background) */}
        <Path d={shieldPath} fill="#000" opacity="0.4" transform="translate(0 5)" />
        
        {/* Mask for the Shine Sweep */}
        <Mask id="longShieldMask" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <Path d={shieldPath} fill="#FFF" />
        </Mask>

        {/* Main Steel Body */}
        <Path d={shieldPath} fill="#90A4AE" />
        <Path d={shieldPath} fill="url(#volume)" />

        {/* Thick Outer Metal Rim */}
        <Path d={shieldPath} fill="none" stroke="#455A64" strokeWidth="3" strokeLinejoin="round" />
        <Path d={shieldPath} fill="none" stroke="url(#sphere)" strokeWidth="3" strokeLinejoin="round" opacity="0.6" />
        
        {/* Center Vertical Ridge */}
        <Path d="M 24 6 L 24 44" stroke="#FFF" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
        <Path d="M 23.5 6 L 23.5 44" stroke="#455A64" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />

        {/* Top Horizontal Ridge */}
        <Path d="M 12 16 L 36 16" stroke="#FFF" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
        <Path d="M 12 15 L 36 15" stroke="#455A64" strokeWidth="1" opacity="0.3" strokeLinecap="round" />

        {/* Heavy Steel Rivets on the rim */}
        <Circle cx={24} cy={7} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={12} cy={8} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={36} cy={8} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={10} cy={16} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={38} cy={16} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={14} cy={30} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={34} cy={30} r={1.5} fill="#FFF" opacity="0.9" />
        <Circle cx={24} cy={44} r={1.5} fill="#FFF" opacity="0.9" />

        {/* Shine Sweep Animation Masked to the Shield */}
        <G mask="url(#longShieldMask)">
          <ShineSweep>
            <Path d="M-10 -10 L10 -10 L-10 60 L-30 60 Z" fill="#FFF" opacity="0.8" />
            <Path d="M12 -10 L16 -10 L-4 60 L-8 60 Z" fill="#FFF" opacity="0.5" />
          </ShineSweep>
        </G>

      </G>
    </G>

  </FaceShell>
);

export default React.memo(CourageFace);
