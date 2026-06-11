import React from "react";
import { FaceShell, ConfettiBlast, PopLid, SvgIconProps, Path, Rect, G } from "./faceKit";

const CelebrateFace = (props: SvgIconProps) => (
  <FaceShell bg="#4A148C" {...props}>
    {/* Blasting Confetti (origin inside the box) */}
    <G transform="translate(24, 20)">
      <ConfettiBlast tx={-15} ty={-25} rot={120} delay={0}><Path d="M0 0 L4 4 L0 8 L-4 4 Z" fill="#FFEB3B" /></ConfettiBlast>
      <ConfettiBlast tx={5} ty={-28} rot={-90} delay={50}><Path d="M0 0 L6 0 L6 6 L0 6 Z" fill="#00E5FF" /></ConfettiBlast>
      <ConfettiBlast tx={25} ty={-20} rot={180} delay={100}><Path d="M0 -4 L2 2 L8 2 L3 6 L5 12 L0 8 L-5 12 L-3 6 L-8 2 L-2 2 Z" fill="#FF4081" transform="scale(0.5)" /></ConfettiBlast>
      <ConfettiBlast tx={-25} ty={-15} rot={45} delay={150}><Path d="M0 0 L4 4 L0 8 L-4 4 Z" fill="#76FF03" /></ConfettiBlast>
      <ConfettiBlast tx={15} ty={-35} rot={-120} delay={80}><Path d="M0 0 L6 0 L6 6 L0 6 Z" fill="#FF9800" /></ConfettiBlast>
    </G>
    
    <G transform="translate(10, 16)">
      {/* Box Drop Shadow */}
      <Rect x={4} y={12} width={20} height={16} fill="#000" opacity="0.2" transform="translate(0 4)" />
      
      {/* Box Body */}
      <Rect x={4} y={12} width={20} height={16} rx={1} fill="#FF9800" />
      <Rect x={4} y={12} width={20} height={16} rx={1} fill="url(#volume)" />
      
      {/* Box Ribbon */}
      <Rect x={12} y={12} width={4} height={16} fill="#D32F2F" />
      <Rect x={12} y={12} width={4} height={16} fill="url(#volume)" />

      <PopLid>
        {/* Lid Shadow (casting on box) */}
        <Rect x={2} y={8} width={24} height={4} rx={1} fill="#000" opacity="0.2" transform="translate(0 2)" />
        
        {/* Lid */}
        <Rect x={2} y={8} width={24} height={4} rx={1} fill="#FF9800" />
        <Rect x={2} y={8} width={24} height={4} rx={1} fill="url(#volume)" />
        
        {/* Lid Ribbon */}
        <Rect x={12} y={8} width={4} height={4} fill="#D32F2F" />
        <Rect x={12} y={8} width={4} height={4} fill="url(#volume)" />
        
        {/* The Bow */}
        <Path d="M14 8 C6 2, 6 8, 14 8 Z" fill="#D32F2F" />
        <Path d="M14 8 C22 2, 22 8, 14 8 Z" fill="#D32F2F" />
        <Path d="M14 8 C6 2, 6 8, 14 8 Z" fill="url(#volume)" />
        <Path d="M14 8 C22 2, 22 8, 14 8 Z" fill="url(#volume)" />
        <Rect x={13} y={6} width={2} height={2} fill="#B71C1C" />
      </PopLid>
    </G>
  </FaceShell>
);

export default React.memo(CelebrateFace);
