import React from "react";
import { FaceShell, Head, Plate, Pan, Wind, Flutter, Path, Circle, Ellipse, G, Line, SvgIconProps, BeatTranslate } from "./faceKit";
const VanguardFace = (props: SvgIconProps) => (
  <FaceShell bg="#A1887F" {...props}>
    <Pan dur={15000}>
      <Path d="M0 35 Q 12 25 24 35 Q 36 25 48 35 Q 60 25 72 35 Q 84 25 96 35 L 96 48 L 0 48 Z" fill="#8D6E63" opacity="0.8" />
    </Pan>
    <Wind dur={1000}>
      <Line x1="50" y1="10" x2="80" y2="10" stroke="#EFEBE9" strokeWidth="1" opacity="0.6" />
      <Line x1="40" y1="20" x2="60" y2="20" stroke="#EFEBE9" strokeWidth="1.5" opacity="0.5" />
      <Line x1="60" y1="40" x2="90" y2="40" stroke="#EFEBE9" strokeWidth="1" opacity="0.4" />
    </Wind>
    <Wind dur={1500} delay={500}>
      <Line x1="50" y1="15" x2="70" y2="15" stroke="#EFEBE9" strokeWidth="1" opacity="0.6" />
      <Line x1="40" y1="35" x2="60" y2="35" stroke="#EFEBE9" strokeWidth="2" opacity="0.3" />
    </Wind>
    <Head><BeatTranslate dx={-1.5} rest={2500} up={120} down={300}>
      <Flutter cx={42} cy={16}>
        <Path d="M 42 16 Q 30 12 20 22 Q 32 18 42 16 Z" fill="#921414" />
        <Path d="M 42 16 Q 32 8 22 14 Q 32 14 42 16 Z" fill="#7F0000" />
      </Flutter>
      <Plate c="#B08D6A" />
      <Ellipse cx="24" cy="34" rx="11" ry="8" fill="#8D6E63" />
      <Ellipse cx="19" cy="30" rx="1.5" ry="1" fill="#5D4037" />
      <Ellipse cx="29" cy="30" rx="1.5" ry="1" fill="#5D4037" />
      <Path d="M20 37 Q 24 39 28 37" fill="none" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 22 Q 16 20 20 22 Q 16 24 12 22" fill="#191A1F" />
      <Path d="M28 22 Q 32 20 36 22 Q 32 24 28 22" fill="#191A1F" />
      <Path d="M12 19 L 20 20" stroke="#3E2723" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M36 19 L 28 20" stroke="#3E2723" strokeWidth="2" fill="none" strokeLinecap="round" />
      <G>
        <Path d="M 4 16 C 4 -2 44 -2 44 16 Q 24 20 4 16 Z" fill="#D32F2F" />
        <Path d="M 8 16 Q 24 12 40 16" fill="none" stroke="#B71C1C" strokeWidth="0.5" />
        <Path d="M 12 17 Q 24 13 36 17" fill="none" stroke="#B71C1C" strokeWidth="0.5" />
        <Path d="M 10 13 Q 24 8 38 13" fill="none" stroke="#B71C1C" strokeWidth="0.5" />
        <G fill="#FFF" opacity="0.8">
          <Circle cx="12" cy="7" r="1.2" /><Circle cx="20" cy="5" r="1.2" /><Circle cx="28" cy="5" r="1.2" /><Circle cx="36" cy="7" r="1.2" />
          <Circle cx="16" cy="11" r="1.5" /><Circle cx="24" cy="9" r="1.5" /><Circle cx="32" cy="11" r="1.5" />
          <Circle cx="10" cy="15" r="1" /><Circle cx="20" cy="16" r="1" /><Circle cx="28" cy="16" r="1" /><Circle cx="38" cy="15" r="1" />
        </G>
        <Path d="M 4 16 C 4 -2 44 -2 44 16 Q 24 20 4 16 Z" fill="url(#volume)" />
      </G>
      <G transform="translate(41 14)">
        <Path d="M 0 1 C 2 -1 4 0 3 3 C 1 4 -1 3 0 1 Z" fill="#921414" />
        <Path d="M 0 1 C 2 -1 4 0 3 3 C 1 4 -1 3 0 1 Z" fill="url(#volume)" />
        <Path d="M 2 2 Q 5 0 7 2 Q 4 3 2 3 Z" fill="#D32F2F" />
        <Path d="M 1 2 Q 2 5 1 7 Q -1 5 0 3 Z" fill="#B71C1C" />
        <Path d="M 0.5 1.5 Q 2 0.5 2.5 2" fill="none" stroke="#E57373" strokeWidth="0.5" />
      </G>
    </BeatTranslate></Head>
  </FaceShell>
);
export default React.memo(VanguardFace);
