import React from "react";
import { FaceShell, MugClinkLeft, MugClinkRight, Glow, SvgIconProps, Path, G, Rect, Ellipse } from "./faceKit";

const WithYouFace = (props: SvgIconProps) => (
  <FaceShell bg="#FFCC80" {...props}>
    <G transform="translate(24, 24)">
      {/* Steam lines */}
      <Glow cx={0} cy={0} from={0.4} to={0.8} dur={4000}>
        <Path d="M -8 -10 Q -10 -16 -6 -20" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <Path d="M -2 -8 Q 0 -14 -4 -18" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <Path d="M 6 -10 Q 8 -16 4 -20" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </Glow>

      {/* Left Mug (Deep Teal) */}
      <MugClinkLeft>
        <G transform="translate(-8, 6) rotate(10)">
          {/* Handle */}
          <Path d="M -5 -2 C -12 -2, -12 8, -5 8" fill="none" stroke="#00796B" strokeWidth="3" strokeLinecap="round" />
          <Path d="M -5 -2 C -12 -2, -12 8, -5 8" fill="none" stroke="url(#volume)" strokeWidth="3" strokeLinecap="round" />
          {/* Body */}
          <Rect x="-6" y="-6" width="12" height="14" rx="2" fill="#009688" />
          <Rect x="-6" y="-6" width="12" height="14" rx="2" fill="url(#volume)" />
          {/* Top Liquid */}
          <Ellipse cx="0" cy="-6" rx="6" ry="2" fill="#5D4037" />
          <Ellipse cx="0" cy="-6" rx="6" ry="2" fill="url(#volume)" />
        </G>
      </MugClinkLeft>

      {/* Right Mug (Warm Red) */}
      <MugClinkRight>
        <G transform="translate(8, 6) rotate(-10)">
          {/* Handle */}
          <Path d="M 5 -2 C 12 -2, 12 8, 5 8" fill="none" stroke="#C62828" strokeWidth="3" strokeLinecap="round" />
          <Path d="M 5 -2 C 12 -2, 12 8, 5 8" fill="none" stroke="url(#volume)" strokeWidth="3" strokeLinecap="round" />
          {/* Body */}
          <Rect x="-6" y="-6" width="12" height="14" rx="2" fill="#E53935" />
          <Rect x="-6" y="-6" width="12" height="14" rx="2" fill="url(#volume)" />
          {/* Top Liquid */}
          <Ellipse cx="0" cy="-6" rx="6" ry="2" fill="#5D4037" />
          <Ellipse cx="0" cy="-6" rx="6" ry="2" fill="url(#volume)" />
        </G>
      </MugClinkRight>
      
      {/* Clink Sparkles */}
      <Glow cx={0} cy={0} from={0.2} to={1} sc0={0.8} sc1={1.2} dur={1500}>
        <Path d="M 0 -2 L 2 2 L 6 0 L 2 4 L 4 8 L 0 5 L -4 8 L -2 4 L -6 0 L -2 2 Z" fill="#FFEB3B" transform="scale(0.5) translate(0, -6)" />
      </Glow>
    </G>
  </FaceShell>
);

export default React.memo(WithYouFace);
