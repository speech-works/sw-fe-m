import React from "react";
import { FaceShell, Head, Plate, Path, Circle, Rect, SvgIconProps, Scan, Glow, Glitch } from "./faceKit";
const RobotFace = (props: SvgIconProps) => (
  <FaceShell bg="#E0F7FA" {...props}><Head>
    <Path d="M24 6 L24 0" stroke="#78909C" strokeWidth="3" strokeLinecap="round" />
    <Glow cx={24} cy={0} from={0.4} to={1} sc0={0.8} sc1={1.1} dur={1400}><Circle cx="24" cy="0" r="3.5" fill="#FF5252" /></Glow>
    <Plate c="#B2EBF2" />
    <Glitch><Rect x="10" y="16" width="28" height="14" rx="7" fill="#37474F" />
    <Scan amp={3} dur={2600}><Circle cx="18" cy="23" r="3.5" fill="#00E5FF" />
    <Circle cx="30" cy="23" r="3.5" fill="#00E5FF" />
    <Circle cx="18" cy="22" r="1" fill="#fff" opacity="0.8" />
    <Circle cx="30" cy="22" r="1" fill="#fff" opacity="0.8" /></Scan></Glitch>
    <Path d="M18 34 Q24 38 30 34" stroke="#546E7A" strokeWidth="2" fill="none" strokeLinecap="round" />
  </Head></FaceShell>
);
export default React.memo(RobotFace);
