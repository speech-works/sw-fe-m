import React from "react";
import { FaceShell, ZoomSpring, SvgIconProps, Path, G, Rect } from "./faceKit";

const ProudFace = (props: SvgIconProps) => (
  <FaceShell bg="#283593" {...props}>
    {/* Sun-rays/Sparkles behind */}
    <Path d="M24 4 L24 10 M24 38 L24 44 M4 24 L10 24 M38 24 L44 24" stroke="#FFD54F" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
    <Path d="M10 10 L14 14 M38 10 L34 14 M10 38 L14 34 M38 38 L34 34" stroke="#FFD54F" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

    <ZoomSpring cx={24} cy={24}>
      <G transform="translate(12, 12)">
        <G fill="#000" opacity="0.2" transform="translate(0 5)">
          <Path d="M4 0 L20 0 L20 12 Q20 20 12 22 Q4 20 4 12 Z" />
          <Rect x={10} y={22} width={4} height={4} />
          <Path d="M6 26 L18 26 L20 30 L4 30 Z" />
        </G>
        <Path d="M0 4 Q-6 8 0 14" fill="none" stroke="#FBC02D" strokeWidth="3" strokeLinecap="round" />
        <Path d="M24 4 Q30 8 24 14" fill="none" stroke="#FBC02D" strokeWidth="3" strokeLinecap="round" />
        <Path d="M4 0 L20 0 L20 12 Q20 20 12 22 Q4 20 4 12 Z" fill="#FFCA28" stroke="#F57F17" strokeWidth="1" />
        <Path d="M4 0 L20 0 L20 12 Q20 20 12 22 Q4 20 4 12 Z" fill="url(#volume)" />
        <Path d="M4 0 L20 0 L20 12 Q20 20 12 22 Q4 20 4 12 Z" fill="url(#sphere)" opacity={0.6} />
        <Rect x={10} y={22} width={4} height={4} fill="#FFCA28" />
        <Path d="M6 26 L18 26 L20 30 L4 30 Z" fill="#FFCA28" />
        <Path d="M6 26 L18 26 L20 30 L4 30 Z" fill="url(#volume)" />
        <Path d="M8 3 L10 16" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </G>
    </ZoomSpring>
  </FaceShell>
);

export default React.memo(ProudFace);
