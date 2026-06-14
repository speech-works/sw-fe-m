import React from "react";
import { FaceShell, Head, Blink, Plate, Eye, Pan, Twinkle, Path, Ellipse, Polygon, SvgIconProps, BeatRotate } from "./faceKit";
const PathfinderFace = (props: SvgIconProps) => (
  <FaceShell bg="url(#dawn)" {...props}>
    <Pan dur={25000}>
      <Path d="M0 32 Q 12 22 24 32 Q 36 22 48 32 Q 60 22 72 32 Q 84 22 96 32 L 96 48 L 0 48 Z" fill="#006064" opacity="0.6" />
      <Path d="M-24 38 Q -12 28 0 38 Q 12 28 24 38 Q 36 28 48 38 Q 60 28 72 38 L 72 48 L -24 48 Z" fill="#004D40" opacity="0.8" />
      <Path d="M 10 40 Q 20 35 30 38 T 50 35 T 70 38" fill="none" stroke="#E0F2F1" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
    </Pan>
    <Twinkle cx={38} cy={9} dur={2500}>
      <Polygon points="38,6 38.5,9 41,9.5 38.5,10 38,13 37.5,10 35,9.5 37.5,9" fill="#FFF" />
    </Twinkle>
    <Head><BeatRotate deg={6} cx={24} cy={30} rest={4000} up={500} down={500}>
      <Path d="M 2 12 Q 24 2 46 12 Q 48 10 41 9 Q 24 -1 7 9 Q 0 10 2 12 Z" fill="#BCAAA4" />
      <Ellipse cx="6" cy="24" rx="4" ry="2" fill="#BCAAA4" transform="rotate(-20 6 24)" />
      <Ellipse cx="42" cy="24" rx="4" ry="2" fill="#BCAAA4" transform="rotate(20 42 24)" />
      <Plate c="#D4A373" />
      <Ellipse cx="24" cy="34" rx="11" ry="8" fill="#FFE0B2" />
      <Ellipse cx="19" cy="30" rx="1.5" ry="1" fill="#A1887F" />
      <Ellipse cx="29" cy="30" rx="1.5" ry="1" fill="#A1887F" />
      <Path d="M22 37 Q 24 38 26 37" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round" />
      <Blink><Eye x={16} y={23} /><Eye x={32} y={23} /></Blink>
      <Path d="M 7 12 C 7 -5 41 -5 41 12 Z" fill="#EFEBE9" />
      <Path d="M 7 12 C 7 -5 41 -5 41 12 Z" fill="url(#volume)" />
      <Path d="M 7 12 Q 24 17 41 12 L 41 9 Q 24 14 7 9 Z" fill="#5D4037" />
      <Path d="M 0 12 Q 24 20 48 12 Q 48 10 41 12 Q 24 17 7 12 Q 0 10 0 12 Z" fill="#D7CCC8" />
      <Path d="M 0 12 Q 24 20 48 12 Q 48 10 41 12 Q 24 17 7 12 Q 0 10 0 12 Z" fill="url(#volume)" />
    </BeatRotate></Head>
  </FaceShell>
);
export default React.memo(PathfinderFace);
