import React from "react";
import { FaceShell, ShineSweep, SvgIconProps, Path, G, Mask } from "./faceKit";

const CourageFace = (props: SvgIconProps) => (
  <FaceShell bg="#B71C1C" {...props}>
    <G transform="translate(10, 8)">
      <Path d="M4 0 L24 0 L28 10 Q28 26 14 34 Q0 26 0 10 Z" fill="#000" opacity="0.15" transform="translate(0 4)" />

      <Mask id="shieldMask" maskUnits="userSpaceOnUse" x="-10" y="-10" width="60" height="60">
        <Path d="M4 0 L24 0 L28 10 Q28 26 14 34 Q0 26 0 10 Z" fill="#FFF" />
      </Mask>

      <Path d="M4 0 L24 0 L28 10 Q28 26 14 34 Q0 26 0 10 Z" fill="#FFCA28" stroke="#FF8F00" strokeWidth="1" strokeLinejoin="round" />
      <Path d="M4 0 L24 0 L28 10 Q28 26 14 34 Q0 26 0 10 Z" fill="url(#volume)" />

      <Path d="M6 3 L22 3 L25 10 Q25 24 14 30 Q3 24 3 10 Z" fill="#D32F2F" />
      <Path d="M6 3 L22 3 L25 10 Q25 24 14 30 Q3 24 3 10 Z" fill="url(#sphere)" />

      <Path d="M14 6 L14 26 M7 14 L21 14" stroke="#FFCA28" strokeWidth="4" strokeLinecap="round" />
      <Path d="M14 6 L14 26 M7 14 L21 14" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Light Shine Sweeping across */}
      <G mask="url(#shieldMask)">
        <ShineSweep>
          {/* Diagonal bright light beam */}
          <Path d="M-10 -10 L10 -10 L-10 40 L-30 40 Z" fill="#FFF" opacity="0.6" />
          <Path d="M12 -10 L16 -10 L-4 40 L-8 40 Z" fill="#FFF" opacity="0.4" />
        </ShineSweep>
      </G>
    </G>
  </FaceShell>
);

export default React.memo(CourageFace);
